import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useState,
  memo,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  Share,
  ToastAndroid,
  Dimensions,
  RefreshControl,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import {
  Link,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Button, IconButton, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";
import AlertDialog from "../../../components/ui/AlertDialog";
import useProductStore from "../../../components/api/useProductStore";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

const { width: screenWidth } = Dimensions.get("window");

const ProductDetail = () => {
  const { id, subcategoryId, categoryProductId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const router = useRouter();

  // State variables
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertConfirmText, setAlertConfirmText] = useState("Ok");
  const [alertConfirmAction, setAlertConfirmAction] = useState(() => () => {});
  const [questions, setQuestions] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
    deleteProductQuestion,
  } = useProductStore();

  // Derive the product from available data
  const product = useMemo(() => {
    try {
      if (id) {
        const data = productData?.data || [];
        return data.find((item) => item.products_id.toString() === id) || null;
      }
      if (subcategoryId) {
        const productList = productsBySubcategory[subcategoryId]?.data || [];
        return (
          productList.find(
            (item) => item.products_id.toString() === categoryProductId
          ) || null
        );
      }
      return null;
    } catch (err) {
      console.error("Error finding product:", err);
      return null;
    }
  }, [
    id,
    subcategoryId,
    categoryProductId,
    productData,
    productsBySubcategory,
  ]);

  // Check if product is in cart
  const isInCart = useMemo(
    () => cartItem.some((item) => item.products_id === product?.products_id),
    [cartItem, product]
  );

  // Update header title and style
  useLayoutEffect(() => {
    navigation.setOptions({
      title: product?.title || "Product Details",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, product, theme]);

  // Refresh questions when pulling down
  const onRefresh = useCallback(async () => {
    if (!product) return;
    setRefreshing(true);
    try {
      const questionData = await getProductQuestionList(product.products_id);
      setQuestions(questionData.questions || []);
      setTotalQuestions(questionData.total);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [product, getProductQuestionList]);

  // Update favorite state when product or favorites change
  useEffect(() => {
    if (product && favProducts) {
      setIsFavorite(
        favProducts.some((item) => item.products_id === product.products_id)
      );
    }
  }, [product, favProducts]);

  // Fetch questions on product load
  useEffect(() => {
    if (product) {
      const fetchQuestions = async () => {
        const questionData = await getProductQuestionList(product.products_id);
        setQuestions(questionData.questions || []);
        setTotalQuestions(questionData.total);
      };
      fetchQuestions();
    }
  }, [product, getProductQuestionList]);

  // Helper to show alerts
  const showAlert = useCallback(
    (
      title,
      message,
      confirmAction = () => setAlertVisible(false),
      confirmText = "Ok"
    ) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertConfirmAction(() => confirmAction);
      setAlertConfirmText(confirmText);
      setAlertVisible(true);
    },
    []
  );

  // Add to cart handler
  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    if (!user) {
      showAlert(
        "Login Required",
        "Please login to add products to your cart.",
        () => navigation.navigate("Login")
      );
      return;
    }
    if (isInCart) {
      showAlert(
        "Product already in cart",
        "This product is already in your cart.",
        () => router.navigate("/screens/Cart"),
        "Go to Cart"
      );
      return;
    }
    try {
      setIsAddingToCart(true);
      await addToCart({
        productID: product.products_id,
        consumerID: user.consumer_id,
      });
      ToastAndroid.show("Product added to cart", ToastAndroid.SHORT);
    } catch (err) {
      showAlert("Error", err.message);
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, user, isInCart, addToCart, showAlert, navigation, router]);

  // Share handler
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
    } catch (err) {
      console.error("Share error:", err);
    }
  }, [product]);

  // Toggle favorite handler
  const handleToggleFavorite = useCallback(async () => {
    if (!user) return navigation.navigate("Login");
    if (isFavoriting || !product) return;
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
    } catch (err) {
      showAlert("Error", err.message);
    } finally {
      setIsFavoriting(false);
    }
  }, [
    user,
    isFavorite,
    isFavoriting,
    product,
    favProducts,
    addToFavorite,
    removeFavorite,
    showAlert,
    navigation,
  ]);

  // Delete question handler
  const handleDeleteQuestion = useCallback(
    async (questionId) => {
      if (!user) {
        showAlert(
          "Login Required",
          "Please login to delete your question.",
          () => navigation.navigate("Login")
        );
        return;
      }
      try {
        await deleteProductQuestion({
          consumerID: user.consumer_id,
          questionId,
        });
        const updatedData = await getProductQuestionList(product.products_id);
        setQuestions(updatedData.questions || []);
        ToastAndroid.show("Question deleted", ToastAndroid.SHORT);
      } catch (err) {
        showAlert("Error", err.message);
      }
    },
    [
      user,
      product,
      deleteProductQuestion,
      getProductQuestionList,
      showAlert,
      navigation,
    ]
  );

  // Render rating stars
  const ratingStars = useMemo(() => {
    const rating = Math.floor(product?.average_rating || 0);
    return [...Array(5)].map((_, index) => (
      <FontAwesome
        key={index}
        name={index < rating ? "star" : "star-o"}
        size={15}
        color={index < rating ? "#FFD700" : "#ccc"}
        style={styles.starIcon}
      />
    ));
  }, [product?.average_rating]);

  // Prepare images and displayed questions
  const displayedQuestions = questions.slice(0, 3);
  const images =
    product?.product_images?.length > 0
      ? product.product_images
      : [require("../../../assets/images/imageSkeleton.jpg")];

  // Error and Product Not Found views
  if (error) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={styles.errorText}>Error loading product</Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.colors.button }]}
          onPress={() => navigation.goBack()}
          android_ripple={{ color: theme.colors.ripple }}
        >
          <Text
            style={[styles.retryButtonText, { color: theme.colors.textColor }]}
          >
            Go Back
          </Text>
        </Pressable>
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
        <Pressable
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.background },
          ]}
          onPress={() => navigation.goBack()}
          android_ripple={{ color: theme.colors.ripple }}
        >
          <Text
            style={[styles.retryButtonText, { color: theme.colors.textColor }]}
          >
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  // Render right actions for swipe-to-delete
  const renderRightActions = useCallback(
    (questionId) => (
      <View style={styles.deleteContainer}>
        <IconButton
          icon="delete"
          iconColor={theme.colors.primary}
          onPress={() => handleDeleteQuestion(questionId)}
        />
      </View>
    ),
    [handleDeleteQuestion, theme.colors.primary]
  );

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.primary },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <Carousel
            width={screenWidth}
            height={300}
            data={images}
            scrollAnimationDuration={300}
            loop={false}
            renderItem={({ item }) => (
              <Image
                source={typeof item === "string" ? { uri: item } : item}
                style={styles.image}
                resizeMode="cover"
              />
            )}
            onProgressChange={(_, absoluteProgress) =>
              setCurrentSlide(Math.round(absoluteProgress))
            }
          />
          <View style={styles.dotContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentSlide === index && {
                    backgroundColor: theme.colors.button,
                    width: 10,
                    height: 10,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Information */}
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
            <Pressable
              onPress={handleToggleFavorite}
              disabled={isFavoriting}
              android_ripple={{ color: theme.colors.ripple }}
              accessibilityLabel={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={28}
                color={isFavorite ? "#FF0000" : "#333"}
                style={isFavoriting && { opacity: 0.5 }}
              />
            </Pressable>
          </View>
          <View style={styles.ratingContainer}>{ratingStars}</View>
          <Text style={[styles.price, { color: theme.colors.button }]}>
            {product.spu} {/* Assuming spu is price; adjust if incorrect */}
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
                style={[styles.detailLabel, { color: theme.colors.textColor }]}
              >
                {product.brand_title}
              </Text>
            </View>
          )}
          <Link
            href={{
              pathname: "/screens/Comments",
              params: { productId: product.products_id },
            }}
            asChild
          >
            <Pressable
              style={styles.detailsRow}
              android_ripple={{ color: theme.colors.ripple }}
            >
              <Text
                style={[styles.detailLabel, { color: theme.colors.textColor }]}
              >
                Comments
              </Text>
              <Text
                style={[
                  styles.showCommentsButton,
                  { color: theme.colors.textColor },
                ]}
              >
                {product.total_comments} Comments
              </Text>
            </Pressable>
          </Link>
          <View style={styles.buttonRow}>
            <Button
              textColor={theme.colors.primary}
              buttonColor={theme.colors.button}
              onPress={handleAddToCart}
              style={[styles.button, { borderColor: theme.colors.button }]}
              disabled={isInCart}
              loading={isAddingToCart}
              accessibilityLabel={isInCart ? "Product in cart" : "Add to cart"}
            >
              {isInCart ? "Added to Cart" : "Add to Cart"}
            </Button>
            <Button
              onPress={handleShare}
              textColor={theme.colors.button}
              style={[styles.button, { borderColor: theme.colors.button }]}
              icon={() => (
                <Ionicons
                  name="share-social"
                  size={24}
                  color={theme.colors.button}
                />
              )}
              accessibilityLabel="Share product"
            >
              Share
            </Button>
          </View>
        </View>

        {/* Questions Section */}
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            style={[
              styles.questionsSection,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text
              style={[styles.questionsTitle, { color: theme.colors.textColor }]}
            >
              Product Questions ({totalQuestions})
            </Text>
            {displayedQuestions.length > 0 ? (
              displayedQuestions.map((q) => {
                const isUserQuestion =
                  user && q.consumer_id === user.consumer_id;
                return (
                  <Swipeable
                    key={q.products_qna_id}
                    renderRightActions={
                      isUserQuestion && (!q.answers || q.answers.length === 0)
                        ? () => renderRightActions(q.products_qna_id)
                        : null
                    }
                  >
                    <QuestionItem item={q} theme={theme} />
                  </Swipeable>
                );
              })
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
                pathname: "/screens/Questions",
                params: { productId: product.products_id },
              }}
              asChild
            >
              <Button
                mode="outlined"
                textColor={theme.colors.button}
                style={[
                  styles.askQuestion,
                  { borderColor: theme.colors.button },
                ]}
                icon="comment-question-outline"
                accessibilityLabel="Ask a question"
              >
                Ask a Question
              </Button>
            </Link>
          </View>
        </GestureHandlerRootView>
      </ScrollView>

      {/* Alert Dialog */}
      <AlertDialog
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onDismiss={() => setAlertVisible(false)}
        onConfirm={() => {
          alertConfirmAction();
          setAlertVisible(false);
        }}
        confirmText={alertConfirmText}
        cancelText="Cancel"
      />
    </View>
  );
};

// Memoized QuestionItem
const QuestionItem = memo(({ item, theme }) => (
  <View
    style={[
      styles.questionItem,
      {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.subInactiveColor,
      },
    ]}
  >
    <View style={styles.questionHeader}>
      <Image
        source={
          item.online_image_url
            ? { uri: item.online_image_url }
            : require("../../../assets/images/imageSkeleton.jpg")
        }
        style={styles.questionUserPhoto}
      />
      <View style={styles.questionTitleContainer}>
        <Text
          style={[styles.questionAuthor, { color: theme.colors.textColor }]}
        >
          {item.consumer_name || "Anonymous"}
        </Text>
        <Text
          style={[styles.questionDate, { color: theme.colors.inactiveColor }]}
        >
          {item.date}
        </Text>
      </View>
    </View>
    <Text style={[styles.questionContent, { color: theme.colors.textColor }]}>
      {item.question}
    </Text>
    {item.answers && item.answers.length > 0 && (
      <View style={styles.answersContainer}>
        {item.answers.map((ans) => (
          <View
            key={`${item.products_qna_id}_${ans.products_ana_id}`}
            style={styles.answerItem}
          >
            <Image
              source={require("../../../assets/images/imageSkeleton.jpg")}
              style={styles.answerSellerPhoto}
            />
            <View style={styles.answerContent}>
              <Text
                style={[
                  styles.answerSellerName,
                  { color: theme.colors.textColor },
                ]}
                numberOfLines={1}
              >
                {ans.seller_name}
              </Text>
              <Text
                style={[
                  styles.answerDate,
                  { color: theme.colors.inactiveColor },
                ]}
              >
                {ans.date}
              </Text>
              <Text
                style={[styles.answerText, { color: theme.colors.textColor }]}
              >
                {ans.answer}
              </Text>
            </View>
          </View>
        ))}
      </View>
    )}
  </View>
));

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  mainContainer: {
    flex: 1,
  },
  carouselContainer: {
    marginBottom: 16,
  },
  image: {
    width: "100%", // Ensure full width
    height: "100%",
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    marginHorizontal: 16,
    marginBottom: 24,
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
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  starIcon: {
    marginRight: 4,
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
  buttonRow: {
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
  button: {
    width: "48%",
    elevation: 2,
    borderWidth: 1,
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
    padding: 20,
    borderRadius: 20,
    elevation: 5,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  questionsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  questionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginVertical: 5,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  questionUserPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  questionTitleContainer: {
    marginLeft: 10,
  },
  questionAuthor: {
    fontSize: 16,
    fontWeight: "bold",
  },
  questionDate: {
    fontSize: 12,
  },
  questionContent: {
    fontSize: 15,
    marginLeft: 50,
    marginTop: 4,
  },
  answersContainer: {
    marginTop: 8,
    marginLeft: 50,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
  },
  answerItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  answerSellerPhoto: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 8,
  },
  answerContent: {
    flex: 1,
  },
  answerSellerName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  answerDate: {
    fontSize: 12,
  },
  answerText: {
    fontSize: 14,
    paddingTop: 5,
  },
  deleteContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    backgroundColor: "#ff4d4d",
    borderRadius: 12,
  },
  noQuestionsText: {
    fontSize: 16,
    marginBottom: 20,
  },
  askQuestion: {
    marginTop: 10,
  },
});

export default ProductDetail;
