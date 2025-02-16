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
  Pressable,
  Share,
  ActivityIndicator,
  Alert,
  ToastAndroid,
} from "react-native";
import {
  Link,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import useProductStore from "../../../components/api/useProductStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";

const ProductDetail = () => {
  const { id, subcategoryId, categoryProductId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  const {
    user,
    addToFavorite,
    removeFavorite,
    productsBySubcategory,
    productData,
    favProducts,
    addToCart,
    cartItem,
    loading,
    error,
    fetchComments,
  } = useProductStore();

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
          <Ionicons
            name="share-outline"
            size={24}
            color={theme.colors.button}
          />
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

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    if (!user) {
      Alert.alert(
        "Login Required",
        "Please login to add products to your cart."
      );
      return;
    }
    const productExists = cartItem.some(
      (item) => item.products_id === product.products_id
    );
    if (productExists) {
      Alert.alert(
        "Product already in cart",
        "This product is already in your cart."
      );
    } else {
      try {
        setAddedToCart(true);
        await addToCart({
          productID: product.products_id,
          consumerID: user.consumer_id,
        });
        ToastAndroid.show("Product added to cart", ToastAndroid.SHORT);
      } catch (error) {
        Alert.alert("Error", error.message);
      }
    }
  }, [product, addToCart, cartItem, user]);

  const handleShare = async () => {
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
  };

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
        ToastAndroid.show("Product added to favorite", ToastAndroid.SHORT);
      } else {
        const favItem = favProducts.find(
          (item) => item.products_id === product.products_id
        );
        if (favItem) {
          await removeFavorite({
            favId: favItem.product_fav_id,
            consumerID: user.consumer_id,
          });
          ToastAndroid.show(
            "Product removed from favorite",
            ToastAndroid.SHORT
          );
        }
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsFavoriting(false);
    }
  };

  const renderRatingStars = useCallback(() => {
    return [...Array(5)].map((_, index) => (
      <FontAwesome
        key={index}
        name={
          index < Math.floor(product?.average_rating || 0) ? "star" : "star-o"
        }
        size={15}
        color={
          index < Math.floor(product?.average_rating || 0) ? "#FFD700" : "#ccc"
        }
        style={styles.starIcon}
      />
    ));
  }, [product]);

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
          { backgroundColor: theme.colors.primary },
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
        { backgroundColor: theme.colors.primary },
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
          {renderRatingStars()}
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
            style={[
              styles.button,
              { borderColor: theme.colors.button, borderWidth: 1 },
            ]}
            disabled={addedToCart}
          >
            {addedToCart ? "Added to cart" : "Add to Cart"}
          </Button>
          <Link
            href={{
              pathname: "/screens/Comments",
              params: { productId: product.products_id },
            }}
            asChild
          >
            <Button
              textColor={theme.colors.button}
              rippleColor={theme.colors.riple}
              mode="outlined"
              style={styles.showCommentsButton}
              disabled={!comments}
            >
              {product.total_comments}
              {"  "}Comments
            </Button>
          </Link>
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
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
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
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  cartContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  button: {
    width: "50%",
  },
  errorText: {
    fontSize: 18,
    color: "#ff4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  commentsButtonContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  showCommentsButton: {
    borderRadius: 20,
  },
  showCommentsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  commentsCountText: {
    fontSize: 16,
    color: "#666",
  },
});

export default ProductDetail;
