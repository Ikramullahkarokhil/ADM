import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";

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
              source={{ uri: item.product_image }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.cardContent}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.productPrice}>{item.spu}</Text>
              <Text>{item.brand_title}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    ),
    []
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF7F50" />
        <Text style={styles.loadingText}>Loading products...</Text>
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
        <Text style={styles.messageText}>
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
      contentContainerStyle={styles.listContent}
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
  listContent: {
    paddingVertical: 5,
  },
  cardContainer: {
    marginVertical: 5,
  },
  card: {
    flexDirection: "row",
    overflow: "hidden",
  },
  productImage: {
    width: "40%",
    height: 130,
    marginLeft: 0,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 15,
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
});

export default ProductList;
