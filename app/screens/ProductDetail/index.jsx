import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Share,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import useCartStore from "../../../components/store/useCartStore";
import useProductStore from "../../../components/api/useProductStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import * as Linking from "expo-linking";

const ProductDetail = () => {
  const { id, subcategoryId, categoryProductId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { productsBySubcategory, productData, loading, error } =
    useProductStore();
  const cart = useCartStore((state) => state.cart);
  const addToCart = useCartStore((state) => state.addToCart);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: product?.title || "Product Details",
      headerRight: () => (
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
        >
          <Ionicons name="share-outline" size={24} color="#4CAF50" />
        </Pressable>
      ),
    });
  }, [navigation, product]);

  useEffect(() => {
    const findProduct = async () => {
      setIsLoading(true);
      try {
        if (id) {
          const data = productData?.data || [];
          const foundProduct = data.find(
            (item) => item.products_id.toString() === id
          );
          setProduct(foundProduct || null);
        } else if (subcategoryId) {
          const productList = productsBySubcategory[subcategoryId]?.data || [];
          const foundProduct = productList.find(
            (item) => item.products_id.toString() === categoryProductId
          );
          setProduct(foundProduct || null);
        }
      } catch (err) {
        console.error("Error finding product:", err);
        Alert.alert("Error", "Failed to load product details");
      } finally {
        setIsLoading(false);
      }
    };

    findProduct();
  }, [id, subcategoryId, productData, productsBySubcategory]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    if (cart.some((item) => item.products_id === product.products_id)) {
      Alert.alert(
        "Already in Cart",
        "This product is already in your cart. Would you like to view your cart?",
        [
          { text: "No", style: "cancel" },
          {
            text: "View Cart",
            onPress: () => navigation.navigate("Cart"),
          },
        ]
      );
    } else {
      addToCart(product);
      Alert.alert("Added to Cart", "Product successfully added to cart!", [
        { text: "Continue Shopping", style: "cancel" },
        {
          text: "View Cart",
          onPress: () => navigation.navigate("Cart"),
        },
      ]);
    }
  }, [product, cart, addToCart, navigation]);

  const handleShare = useCallback(async () => {
    if (!product) return;

    try {
      const deepLink = Linking.createURL(
        `/screens/ProductDetails/${product.products_id}`
      );
      await Share.share({
        message: `Check out ${product.title}: ${deepLink}`,
        title: product.title,
      });
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Share Failed", "Unable to share this product");
    }
  }, [product]);

  const renderRatingStars = useCallback(() => {
    return [...Array(5)].map((_, index) => (
      <FontAwesome
        key={index}
        name={index < Math.floor(product?.rating || 0) ? "star" : "star-o"}
        size={20}
        color={index < Math.floor(product?.rating || 0) ? "#FFD700" : "#ccc"}
        style={styles.starIcon}
      />
    ));
  }, [product?.rating]);

  if (isLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={
          product.product_image
            ? { uri: product.product_image }
            : require("../../../assets/images/imageSkeleton.jpg")
        }
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{product.title}</Text>

        <View style={styles.ratingContainer}>
          {renderRatingStars()}
          <Text style={styles.ratingText}>
            {product.rating ? `${product.rating} / 5` : "No ratings yet"}
          </Text>
        </View>

        <Text style={styles.price}>{product.spu}</Text>

        {product.description && (
          <Text style={styles.description}>{product.description}</Text>
        )}

        {product.brand_title && (
          <View style={styles.detailsRow}>
            <Text style={styles.detailLabel}>Brand:</Text>
            <Text style={styles.detailValue}>{product.brand_title}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleAddToCart}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: "#f0f0f0",
  },
  infoContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  headerButtonPressed: {
    opacity: 0.7,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#666",
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555",
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 16,
    color: "#888",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 18,
    color: "#ff4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProductDetail;
