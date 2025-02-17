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
import { Button, IconButton, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";
import AlertDialog from "../../../components/ui/AlertDialog";

const ProductDetail = () => {
  const { id, subcategoryId, categoryProductId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertConfirmText, setAlertConfirmText] = useState("Ok");
  const [alertConfirmAction, setAlertConfirmAction] = useState(() => () => {});
  const [questions, setQuestions] = useState([]);

  const {
    user,
    addToFavorite,
    removeFavorite,
    productsBySubcategory,
    productData,
    favProducts,
    addToCart,
    cartItem,
    error,
    getProductQuestionList,
    addProductQuestion,
    deleteProductQuestion,
  } = useProductStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: product?.title || "Product Details",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, product]);

  // Update favorite status when product or favorites change
  useEffect(() => {
    if (product && favProducts) {
      const isFav = favProducts.some(
        (item) => item.products_id === product.products_id
      );
      setIsFavorite(isFav);
    }
  }, [product, favProducts]);

  // Find product based on provided params
  useEffect(() => {
    const findProduct = async () => {
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
      }
    };

    findProduct();
  }, [id, subcategoryId, productData, productsBySubcategory]);

  // Fetch product questions once the product is loaded
  useEffect(() => {
    if (product) {
      getProductQuestionList(product.products_id)
        .then((data) => {
          // Assuming the API returns an object with a "questions" key
          setQuestions(data.questions || []);
        })
        .catch((err) => console.error("Error fetching questions:", err));
    }
  }, [product]);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;

    if (!user) {
      setAlertTitle("Login Required");
      setAlertMessage("Please login to add products to your cart.");
      setAlertConfirmAction(() => () => {
        setAlertVisible(false);
        navigation.navigate("Login");
      });
      setAlertVisible(true);
      return;
    }

    const productExists = cartItem.some(
      (item) => item.products_id === product.products_id
    );
    if (productExists) {
      setAlertTitle("Product already in cart");
      setAlertMessage("This product is already in your cart.");
      setAlertConfirmText("Go to Cart");
      setAlertConfirmAction(() => () => router.navigate("/screens/Cart"));
      setAlertVisible(true);
      return;
    }

    try {
      setAddedToCart(true);
      await addToCart({
        productID: product.products_id,
        consumerID: user.consumer_id,
      });
      ToastAndroid.show("Product added to cart", ToastAndroid.SHORT);
    } catch (error) {
      setAlertTitle("Error");
      setAlertMessage(error.message);
      setAlertConfirmAction(() => () => setAlertVisible(false));
      setAlertVisible(true);
    }
  }, [product, addToCart, cartItem, user, navigation]);

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
      setAlertTitle("Error");
      setAlertMessage(error.message);
      setAlertConfirmAction(() => () => setAlertVisible(false));
      setAlertVisible(true);
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

  // Handler to delete a product question
  const handleDeleteQuestion = async (questionId) => {
    if (!user) {
      setAlertTitle("Login Required");
      setAlertMessage("Please login to delete your question.");
      setAlertConfirmAction(() => () => {
        setAlertVisible(false);
        navigation.navigate("Login");
      });
      setAlertVisible(true);
      return;
    }
    try {
      await deleteProductQuestion({
        consumerID: user.consumer_id,
        questionId, // questionId is expected to be products_qna_id
      });
      const updatedData = await getProductQuestionList(product.products_id);
      setQuestions(updatedData.questions || []);
      ToastAndroid.show("Question deleted", ToastAndroid.SHORT);
    } catch (error) {
      setAlertTitle("Error");
      setAlertMessage(error.message);
      setAlertConfirmAction(() => () => setAlertVisible(false));
      setAlertVisible(true);
    }
  };

  // Show only the first 3 questions
  const displayedQuestions = questions.slice(0, 3);

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
    <>
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
            <Text
              style={[styles.ratingText, { color: theme.colors.textColor }]}
            >
              {product.average_rating
                ? `${product.average_rating}`
                : "No ratings yet"}
            </Text>
          </View>

          <Text style={[styles.price, { color: theme.colors.button }]}>
            {product.spu}
          </Text>

          {product.description && (
            <Text
              style={[styles.description, { color: theme.colors.textColor }]}
            >
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

          {product.brand_title && (
            <Link
              href={{
                pathname: "/screens/Comments",
                params: { productId: product.products_id },
              }}
              asChild
            >
              <Pressable
                style={styles.detailsRow}
                android_ripple={theme.colors.riple}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    { color: theme.colors.textColor },
                  ]}
                >
                  Comments
                </Text>
                <Text
                  mode="outlined"
                  style={[
                    styles.showCommentsButton,
                    { color: theme.colors.textColor },
                  ]}
                >
                  {product.total_comments} , Comments
                </Text>
              </Pressable>
            </Link>
          )}

          <View style={styles.detailsRow}>
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
            <Button
              onPress={handleShare}
              textColor={theme.colors.button}
              style={[
                styles.button,
                {
                  borderColor: theme.colors.button,
                  borderRadius: 20,
                  borderWidth: 1,
                },
              ]}
              icon={() => (
                <Ionicons
                  name="share-social"
                  size={24}
                  color={theme.colors.button}
                />
              )}
            >
              Share
            </Button>
          </View>
        </View>

        {/* Product Questions Section */}
        <View
          style={[
            styles.questionsSection,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[styles.questionsTitle, { color: theme.colors.textColor }]}
          >
            Product Questions
          </Text>
          {displayedQuestions && displayedQuestions.length > 0 ? (
            displayedQuestions.map((q) => (
              <View
                key={q.products_qna_id}
                style={[
                  styles.questionItem,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                {/* Header with user name and date */}
                <View style={styles.questionHeader}>
                  <Text
                    style={[
                      styles.consumerName,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    {q.consumer_name}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      ,
                      { color: theme.colors.inactiveColor },
                    ]}
                  >
                    {q.date}
                  </Text>
                </View>
                {/* Question text */}
                <Text
                  style={[
                    styles.questionText,
                    ,
                    { color: theme.colors.textColor },
                  ]}
                >
                  {q.question}
                </Text>
                {/* Render answers if available */}
                {q.answers && q.answers.length > 0 && (
                  <View style={styles.answersContainer}>
                    {q.answers.map((ans) => (
                      <View key={ans.products_ana_id} style={styles.answerItem}>
                        <Text
                          style={[
                            styles.answerText,
                            ,
                            { color: theme.colors.textColor },
                          ]}
                        >
                          {ans.answer}
                        </Text>
                        <Text
                          style={[
                            styles.answerDate,
                            ,
                            { color: theme.colors.inactiveColor },
                          ]}
                        >
                          {ans.date}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Delete option only when there are no answers */}
                {user &&
                  q.consumer_id === user.consumer_id &&
                  (!q.answers || q.answers.length === 0) && (
                    <TouchableOpacity
                      onPress={() => handleDeleteQuestion(q.products_qna_id)}
                    >
                      <Text style={styles.deleteQuestion}>Delete</Text>
                    </TouchableOpacity>
                  )}
              </View>
            ))
          ) : (
            <Text
              style={[
                styles.noQuestionsText,
                { color: theme.colors.textColor },
              ]}
            >
              No questions yet.
            </Text>
          )}

          <Link
            href={{
              pathname: "screens/Questions",
              params: { productId: product.products_id },
            }}
            asChild
          >
            <Button
              mode="contained"
              style={styles.showMoreButton}
              buttonColor={theme.colors.button}
              textColor={theme.colors.primary}
            >
              Show More
            </Button>
          </Link>
        </View>
      </ScrollView>

      <AlertDialog
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onDismiss={() => setAlertVisible(false)}
        onConfirm={alertConfirmAction}
        confirmText={alertConfirmText}
        cancelText="Cancel"
      />
    </>
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
  image: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 10,
  },
  infoContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
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
    paddingVertical: 15,
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
    width: "48%",
    elevation: 10,
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
  showCommentsButton: {
    textDecorationLine: "underline",
  },
  questionsSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    elevation: 10,
  },
  questionsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  questionItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  questionHeader: {
    justifyContent: "space-between",
    marginBottom: 4,
  },
  consumerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 14,
    color: "#777",
  },
  questionText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#444",
  },
  answersContainer: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
  },
  answerItem: {
    marginBottom: 6,
  },
  answerText: {
    fontSize: 15,
    color: "#333",
  },
  answerDate: {
    fontSize: 13,
    color: "#777",
  },
  deleteQuestion: {
    color: "red",
    marginTop: 4,
    fontSize: 14,
  },
  noQuestionsText: {
    fontSize: 16,
    fontStyle: "italic",
  },
  showMoreButton: {
    marginTop: 12,
    alignSelf: "center",
  },
});

export default ProductDetail;
