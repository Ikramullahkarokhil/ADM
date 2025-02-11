import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Share,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import useCartStore from "../../../components/store/useCartStore";
import useProductStore from "../../../components/api/useProductStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";
import { themeable } from "tamagui";

const ProductDetail = () => {
  const { id, subcategoryId, categoryProductId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);

  const {
    user,
    addToFavorite,
    removeFavorite,
    productsBySubcategory,
    productData,
    favProducts,
    loading,
    error,
  } = useProductStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const cart = useCartStore((state) => state.cart);
  const [addedToCart, setAddedToCart] = useState(false);

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
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },

      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, product]);

  useEffect(() => {
    if (product && favProducts) {
      const isFav = favProducts.some(
        (item) => item.products_id === product.products_id
      );
      setIsFavorite(isFav);
    }
  }, [product, favProducts]);

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
      } finally {
        setIsLoading(false);
      }
    };

    findProduct();
  }, [id, subcategoryId, productData, productsBySubcategory]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const productExists = cart.some(
      (item) => item.products_id === product.products_id
    );
    if (productExists) {
      Alert.alert(
        "Product already in cart",
        "This product is already in your cart."
      );
    } else {
      setAddedToCart(true);
      addToCart(product);
    }
  }, [product, addToCart, addedToCart]);

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
    }
  }, [product]);

  const handleToggleFavorite = async () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    if (isFavoriting) return;
    setIsFavoriting(true);

    try {
      if (!isFavorite) {
        await addToFavorite({
          productID: product.products_id,
          consumerID: user.consumer_id,
        });
      } else {
        const favItem = await favProducts.find(
          (item) => item.products_id === product.products_id
        );
        console.log(favItem);

        if (favItem) {
          await removeFavorite({
            favId: favItem.product_fav_id,
            consumerID: user.consumer_id,
          });
        }
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsFavoriting(false);
    }
  };
  const renderRatingStars = useCallback(
    (item) => {
      return [...Array(5)].map((_, index) => (
        <FontAwesome
          key={index}
          name={
            index < Math.floor(item?.average_rating || 0) ? "star" : "star-o"
          }
          size={15}
          color={
            index < Math.floor(item?.average_rating || 0) ? "#FFD700" : "#ccc"
          }
          style={styles.starIcon}
        />
      ));
    },
    [product?.rating]
  );

  if (isLoading || loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.textColor} />
        <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
          Loading product details...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.button }]}
          onPress={() => navigation.goBack()}
        >
          <Text
            style={[styles.retryButtonText, { color: theme.colors.textColor }]}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.colors.textColor }]}>
          Product not found
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.background },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text
            style={[styles.retryButtonText, { color: theme.colors.textColor }]}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={
          product.product_image
            ? { uri: product.product_image }
            : require("../../../assets/images/imageSkeleton.jpg")
        }
        style={[styles.image, { backgroundColor: theme.colors.primary }]}
        resizeMode="cover"
      />
      <View
        style={[
          styles.infoContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: theme.colors.textColor }]}
            numberOfLines={2}
          >
            {product.title}
          </Text>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            disabled={isFavoriting}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={28}
              color={isFavorite ? "#FF0000" : "#333"}
              style={isFavoriting && { opacity: 0.5 }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.ratingContainer}>
          {renderRatingStars(product)}
          <Text style={styles.ratingText}>
            {product.average_rating
              ? `${product.average_rating}`
              : "No ratings yet"}
          </Text>
        </View>

        <Text style={[styles.price, { color: theme.colors.button }]}>
          {product.spu}
        </Text>

        {product.description && (
          <Text style={[styles.description, { color: theme.colors.textColor }]}>
            {product.description}
          </Text>
        )}

        {product.brand_title && (
          <View style={styles.detailsRow}>
            <Text
              style={[styles.detailLabel, { color: theme.colors.textColor }]}
            >
              Brand
            </Text>
            <Text
              style={[styles.detailValue, { color: theme.colors.textColor }]}
            >
              {product.brand_title}
            </Text>
          </View>
        )}

        <View style={styles.cartContainer}>
          <Button
            textColor={theme.colors.primary}
            buttonColor={theme.colors.button}
            onPress={handleAddToCart}
            rippleColor={theme.colors.riple}
            style={styles.button}
            disabled={addedToCart}
          >
            {addedToCart ? "Added to cart" : "Add to Cart"}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    marginBottom: 16,
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
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
    alignSelf: "flex-end",
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
  counterContainer: {
    flexDirection: "row",
  },
  cartContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countText: {
    marginTop: 10,
    fontSize: 20,
  },
  button: {
    width: "50%",
  },
});

export default ProductDetail;
