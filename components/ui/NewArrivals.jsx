import React, { useEffect, useState, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import useProductStore from "../api/useProductStore";
import useThemeStore from "../store/useThemeStore";
import { Feather } from "@expo/vector-icons";

const ProductItem = memo(({ item, onPress, isDarkTheme }) => {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[
        styles.productCard,
        {
          backgroundColor: isDarkTheme
            ? "rgba(30, 30, 30, 0.8)"
            : "rgba(255, 255, 255, 0.8)",
          shadowColor: isDarkTheme ? "#000" : colors.subInactiveColor,
        },
      ]}
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image || undefined }} // Handle empty product_images
          style={styles.productImage}
          resizeMode="cover"
          defaultSource={
            isDarkTheme
              ? require("../../assets/images/darkImagePlaceholder.jpg")
              : require("../../assets/images/imageSkeleton.jpg")
          }
        />
        <View
          style={[
            styles.titleOverlay,
            {
              backgroundColor: isDarkTheme
                ? "rgba(0, 0, 0, 0.7)"
                : "rgba(255, 255, 255, 0.7)",
            },
          ]}
        >
          <Text
            style={[
              styles.productName,
              { color: isDarkTheme ? colors.primary : colors.textColor },
            ]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.productPrice,
              { color: isDarkTheme ? colors.primary : colors.textColor },
            ]}
          >
            ${item.price}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const NewArrivals = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { fetchNewArrivals } = useProductStore();
  const { isDarkTheme } = useThemeStore();
  const { width } = useWindowDimensions();
  const [newArrivalProducts, setNewArrivalProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const itemWidth = width > 550 ? width / 3 - 24 : width / 2 - 24;

  const handleProductPress = useCallback(
    (productId) => {
      router.navigate({
        pathname: "/screens/ProductDetails",
        params: { productId },
      });
    },
    [router]
  );

  useEffect(() => {
    const getProducts = async () => {
      try {
        const response = await fetchNewArrivals();
        if (response && response.data) {
          // Ensure all products have unique IDs and handle empty images
          const formattedProducts = response.data.map((product) => ({
            id: product.products_id.toString(), // Convert to string explicitly
            name: product.title,
            price: product.spu,
            image: product.product_images?.[0] || null, // Handle empty array
          }));

          // Check for duplicate IDs
          const ids = formattedProducts.map((p) => p.id);
          if (new Set(ids).size !== ids.length) {
            console.warn("Duplicate product IDs found!");
          }

          setNewArrivalProducts(formattedProducts);
        }
      } catch (err) {
        console.error("Error fetching new arrival products:", err);
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    getProducts();
  }, [fetchNewArrivals]);

  const renderProduct = useCallback(
    ({ item }) => (
      <ProductItem
        key={`product-${item.id}`} // More explicit key
        item={item}
        onPress={() => handleProductPress(item.id)}
        isDarkTheme={isDarkTheme}
      />
    ),
    [handleProductPress, isDarkTheme]
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            New Arrivals
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.button} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.deleteButton }}>{error}</Text>
        <TouchableOpacity onPress={() => setLoading(true)}>
          <Text style={{ color: colors.primary }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!newArrivalProducts || newArrivalProducts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textColor }}>No new arrivals found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
          New Arrivals
        </Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() =>
            router.navigate({
              pathname: "/screens/AllProducts",
              params: { category: "new-arrivals" },
            })
          }
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            View All
          </Text>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={newArrivalProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => `product-${item.id}`} // Consistent with renderItem key
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: itemWidth + 12,
          offset: (itemWidth + 12) * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    borderRadius: 16,
    paddingVertical: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  productsList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  productCard: {
    width: 180,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
});

export default NewArrivals;
