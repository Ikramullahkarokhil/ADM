"use client";

import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import useThemeStore from "../../components/store/useThemeStore";

const { width: screenWidth } = Dimensions.get("window");

const ProductCard = React.memo(({ product, theme, isDarkTheme, onPress }) => {
  const [imageError, setImageError] = useState(false);

  const placeholderImage = isDarkTheme
    ? require("../../assets/images/darkImagePlaceholder.jpg")
    : require("../../assets/images/imageSkeleton.jpg");

  const imageSource =
    product.product_images && product.product_images.length > 0
      ? { uri: product.product_images[0] }
      : placeholderImage;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      android_ripple={{ color: theme.colors.ripple }}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={imageError ? placeholderImage : imageSource}
          style={styles.productImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
          defaultSource={placeholderImage} // Fallback image
        />
      </View>
      <View style={styles.textOverlay}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.title}
        </Text>
        <Text style={styles.productPrice}>AF {product.spu}</Text>
      </View>
    </Pressable>
  );
});

const RelatedProducts = ({ relatedProducts }) => {
  const [showAll, setShowAll] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  const { isDarkTheme } = useThemeStore();

  const handleProductPress = (productId) => {
    // Navigate to product details with the selected product ID
    router.replace({
      pathname: "/screens/ProductDetails",
      params: { id: productId },
    });
  };

  const renderItem = ({ item }) => (
    <ProductCard
      product={item}
      theme={theme}
      isDarkTheme={isDarkTheme}
      onPress={() => handleProductPress(item.products_id)}
    />
  );

  // Don't show the component if there are no related products
  if (!relatedProducts) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.textColor }]}>
        Related Products
      </Text>
      <FlatList
        horizontal
        data={relatedProducts}
        keyExtractor={(item) => item.products_id.toString()}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />
      {relatedProducts.length > 10 && (
        <Pressable
          style={styles.showAllButton}
          onPress={() => setShowAll(!showAll)}
          android_ripple={{ color: theme.colors.ripple }}
        >
          <Text style={[styles.showAllText, { color: theme.colors.button }]}>
            {showAll ? "Show Less" : "Show All"}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    marginHorizontal: 16,
  },
  flatListContent: {
    paddingRight: 16,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  productCard: {
    width: screenWidth * 0.4,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 5,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 180,
  },
  textOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  showAllButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginHorizontal: 16,
  },
  showAllText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RelatedProducts;
