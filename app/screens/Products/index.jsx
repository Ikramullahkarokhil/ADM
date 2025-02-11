import React, {
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Link, useLocalSearchParams, useNavigation } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
import { color } from "@rneui/base";

const ProductList = () => {
  const { subcategoryId, mainCategoryId, showmore } = useLocalSearchParams();
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
      title: "Products",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },

      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, products]);

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
      const fetchData = async () => {
        const subCategoryData = subcategories[mainCategoryId]?.data || [];
        const subCategoryIds = subCategoryData.map(
          (subCat) => subCat.categories_id
        );
        try {
          const response = await fetchProductByCategories(subCategoryIds);
          const newData = response?.data || [];
          setProducts(newData);
        } catch (err) {
          console.error("Failed to fetch products for all subcategories:", err);
        }
      };
      fetchData();
    } else {
      const productsList = productsBySubcategory[subcategoryId]?.data || [];
      setProducts(productsList);
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
    (item) => {
      return [...Array(1)].map((_, index) => (
        <FontAwesome
          key={index}
          name={
            index < Math.floor(item?.average_rating || 0) ? "star" : "star-o"
          }
          size={20}
          color={
            index < Math.floor(item?.average_rating || 0) ? "#FFD700" : "#ccc"
          }
          style={styles.starIcon}
        />
      ));
    },
    [products?.rating]
  );

  const renderItem = useCallback(
    ({ item }) => (
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
                  style={[styles.productPrice, { color: theme.colors.button }]}
                >
                  {item.spu}
                </Text>
                <Text style={[styles.brand, { color: theme.colors.textColor }]}>
                  {item.brand_title}
                </Text>
              </View>

              <View style={styles.ratingContainer}>
                {renderRatingStars(item)}
                <Text style={styles.ratingText}>
                  {`${item.average_rating}`}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    ),
    []
  );

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.textColor} />
        <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
          Loading products...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.messageText, { color: theme.colors.textColor }]}>
          No products found in this subcategory.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item) => item.products_id.toString()}
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
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  messageText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  listContent: {},
  cardContainer: {
    marginVertical: 5,
    borderRadius: 10,
  },
  card: {
    flexDirection: "row",
    overflow: "hidden",
    margin: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 15,
    flexDirection: "row",
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF7F50",
  },
  separator: {
    borderTopWidth: 0.5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    right: 10,
    bottom: 10,
  },
  starIcon: {
    marginRight: 1,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#666",
  },
  brand: {
    paddingTop: 5,
  },
});

export default ProductList;
