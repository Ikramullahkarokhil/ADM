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
  TextInput,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import useProductStore from "../../../components/api/useProductStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";

const ProductDetail = () => {
  const { id, subcategoryId, categoryProductId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

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
    addComment,
    deleteComment,
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

  // Fetch comments when product loads
  useEffect(() => {
    if (product) {
      loadComments();
    }
  }, [product]);

  const loadComments = async () => {
    setIsCommentsLoading(true);
    try {
      const data = await fetchComments(product.products_id);
      if (data) {
        setComments(data);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setIsCommentsLoading(false);
    }
  };
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert("Empty Comment", "Please write something before submitting.");
      return;
    }
    if (!user) {
      Alert.alert("Login Required", "Please login to add a comment.");
      return;
    }
    setIsAddingComment(true);
    try {
      await addComment({
        product_id: product.products_id,
        comment: newComment,
        consumer_id: user.consumer_id,
      });
      setNewComment("");
      ToastAndroid.show("Comment added", ToastAndroid.SHORT);
      loadComments();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment({
                commentId: commentId,
                consumerID: user.consumer_id,
              });
              ToastAndroid.show("Comment deleted", ToastAndroid.SHORT);
              loadComments();
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

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

  // Share Product

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

  // Favorite function

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
            style={styles.button}
            disabled={addedToCart}
          >
            {addedToCart ? "Added to cart" : "Add to Cart"}
          </Button>
        </View>
      </View>

      {/* Comments Section */}
      <View style={styles.commentsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textColor }]}>
          Comments
        </Text>

        {/* Add Comment Input */}
        <View style={styles.addCommentContainer}>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Write a comment..."
            placeholderTextColor="#999"
            style={[
              styles.commentInput,
              {
                color: theme.colors.textColor,
                borderColor: theme.colors.subInactiveColor,
              },
            ]}
          />
          <Button
            mode="contained"
            onPress={handleAddComment}
            loading={isAddingComment}
            buttonColor={theme.colors.button}
            textColor={theme.colors.primary}
          >
            Post
          </Button>
        </View>

        {isCommentsLoading ? (
          <ActivityIndicator size="small" color={theme.colors.textColor} />
        ) : comments.length === 0 ? (
          <Text style={{ color: theme.colors.textColor }}>
            No comments yet.
          </Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.product_comments_id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text
                  style={[
                    styles.commentAuthor,
                    { color: theme.colors.textColor },
                  ]}
                >
                  {comment.consumer_name || "Anonymous"}
                </Text>
                {/* Show delete button if current user is the comment author */}
                {comment.consumer_id === user.consumer_id && (
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteComment(comment.product_comments_id)
                    }
                  >
                    <Ionicons name="trash-outline" size={24} color="#FF0000" />
                  </TouchableOpacity>
                )}
              </View>
              <Text
                style={[
                  styles.commentContent,
                  { color: theme.colors.textColor },
                ]}
              >
                {comment.comment}
              </Text>
              <Text style={styles.commentDate}>{comment.date}</Text>
            </View>
          ))
        )}
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
  // Comments Section styles
  commentsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  commentItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commentAuthor: {
    fontSize: 16,
    fontWeight: "600",
  },
  commentContent: {
    fontSize: 15,
    marginTop: 4,
  },
  commentDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 8,
    marginRight: 8,
  },
});

export default ProductDetail;
