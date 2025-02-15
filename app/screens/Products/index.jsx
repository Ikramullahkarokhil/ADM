import React, {
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Link, useLocalSearchParams, useNavigation } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
import ProductSkeleton from "../../../components/skeleton/productSkeleton";

const ProductList = () => {
  const { subcategoryId, mainCategoryId, showmore, subCategorieName } =
    useLocalSearchParams();
  const {
    subcategories,
    productsBySubcategory,
    fetchProductsBySubcategory,
    fetchProductByCategories,
    loading,
    error,
  } = useProductStore();
  const [products, setProducts] = useState([]);
  const theme = useTheme();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: subCategorieName,
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme, subCategorieName]);

  const loadProducts = useCallback(async () => {
    try {
      await fetchProductsBySubcategory(subcategoryId);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, [subcategoryId, fetchProductsBySubcategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (showmore) {
      (async () => {
        try {
          const subCategoryIds =
            subcategories[mainCategoryId]?.data?.map(
              (subCat) => subCat.categories_id
            ) || [];
          const response = await fetchProductByCategories(subCategoryIds);
          setProducts(response?.data || []);
        } catch (err) {
          console.error("Failed to fetch products for all subcategories:", err);
        }
      })();
    } else {
      setProducts(productsBySubcategory[subcategoryId]?.data || []);
    }
  }, [
    showmore,
    mainCategoryId,
    subcategoryId,
    subcategories,
    productsBySubcategory,
    fetchProductByCategories,
  ]);

  const renderRatingStars = useCallback(
    (item) => (
      <FontAwesome
        name={item?.average_rating >= 1 ? "star" : "star-o"}
        size={20}
        color={item?.average_rating >= 1 ? "#FFD700" : "#ccc"}
        style={styles.starIcon}
      />
    ),
    []
  );

  const renderItem = useMemo(
    () =>
      ({ item }) =>
        (
          <Link
            href={{
              pathname: "/screens/ProductDetail",
              params: {
                subcategoryId: item.categories_id,
                categoryProductId: item.products_id,
              },
            }}
            asChild
          >
            <TouchableOpacity style={styles.cardContainer}>
              <View style={styles.card}>
                <Image
                  source={
                    item.product_image
                      ? { uri: item.product_image }
                      : require("../../../assets/images/imageSkeleton.jpg")
                  }
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.cardContent}>
                  <View>
                    <Text
                      style={[
                        styles.productTitle,
                        { color: theme.colors.textColor },
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.productPrice,
                        { color: theme.colors.button },
                      ]}
                    >
                      {item.spu}
                    </Text>
                    <View style={{ flexDirection: "row" }}>
                      <Text style={styles.brand}>Brand: </Text>
                      <Text
                        style={[
                          styles.brand,
                          { color: theme.colors.textColor },
                        ]}
                      >
                        {item.brand_title}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ratingContainer}>
                    {renderRatingStars(item)}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Link>
        ),
    [theme]
  );

  return error ? (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>Error: {error}</Text>
    </View>
  ) : (
    <FlatList
      data={loading ? Array(6).fill(null) : products}
      renderItem={loading ? () => <ProductSkeleton /> : renderItem}
      keyExtractor={(item, index) =>
        item ? item.products_id.toString() : index.toString()
      }
      ItemSeparatorComponent={() => (
        <View
          style={[
            styles.separator,
            { borderTopColor: theme.colors.inactiveColor },
          ]}
        />
      )}
      contentContainerStyle={[
        styles.listContent,
        { backgroundColor: theme.colors.background },
      ]}
      ListEmptyComponent={
        <View style={styles.centerContainer}>
          <Text style={[styles.messageText, { color: theme.colors.textColor }]}>
            No products found.
          </Text>
        </View>
      }
      initialNumToRender={10}
      windowSize={5}
      removeClippedSubviews
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: { color: "red", fontSize: 16 },
  messageText: { fontSize: 16, color: "#555", textAlign: "center" },
  cardContainer: { marginVertical: 5, borderRadius: 10 },
  card: { flexDirection: "row", overflow: "hidden", margin: 10 },
  productImage: { width: 100, height: 100, borderRadius: 10 },
  cardContent: { flex: 1, paddingLeft: 15, flexDirection: "row" },
  productTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  productPrice: { fontSize: 18, fontWeight: "bold" },
  separator: { borderTopWidth: 0.5 },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    right: 10,
    bottom: 10,
  },
  starIcon: { marginRight: 1 },
  brand: { paddingTop: 5 },
});

export default ProductList;
