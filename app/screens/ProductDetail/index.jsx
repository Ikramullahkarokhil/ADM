import {
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
import { Button, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";
import AlertDialog from "../../../components/ui/AlertDialog";
import useProductStore from "../../../components/api/useProductStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";
import RelatedProducts from "../../../components/ui/RelatedProducts";
import ProductDetailSkeleton from "../../../components/skeleton/ProductDetailsSkeleton";

const { width: screenWidth } = Dimensions.get("window");

// 1. Extract Alert state and logic into a custom hook
const useAlertDialog = () => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Ok",
    confirmAction: () => {},
  });

  const showAlert = useCallback(
    (
      title,
      message,
      confirmAction = () =>
        setAlertState((prev) => ({ ...prev, visible: false })),
      confirmText = "Ok"
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        confirmAction,
        confirmText,
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    alertState,
    showAlert,
    hideAlert,
  };
};

// 2. Extract Rating component
const ProductRating = memo(({ rating, colors, onRateProduct, readOnly }) => {
  return (
    <View style={styles.ratingContainer}>
      {[...Array(5)].map((_, index) => (
        <Pressable
          key={index}
          onPress={() => !readOnly && onRateProduct(index + 1)}
        >
          <FontAwesome
            name={index < rating ? "star" : "star-o"}
            size={15}
            color={index < rating ? "#FFD700" : "#ccc"}
            style={styles.starIcon}
          />
        </Pressable>
      ))}
      <Text style={{ marginLeft: 5, color: colors.textColor }}>
        {rating} / 5
      </Text>
    </View>
  );
});

// 3. Extract ProductImages component
const ProductImages = memo(({ images, isDarkTheme }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const displayImages = useMemo(() => {
    return images?.length > 0
      ? images
      : [
          isDarkTheme
            ? require("../../../assets/images/darkImagePlaceholder.jpg")
            : require("../../../assets/images/imageSkeleton.jpg"),
        ];
  }, [images, isDarkTheme]);

  return (
    <View style={styles.carouselContainer}>
      <Carousel
        width={screenWidth}
        height={300}
        data={displayImages}
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
        {displayImages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentSlide === index && {
                backgroundColor: "#007AFF", // Will be themed in parent
                width: 10,
                height: 10,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// 4. Extract ProductActions component
const ProductActions = memo(
  ({
    product,
    isInCart,
    isAddingToCart,
    handleAddToCart,
    handleShare,
    theme,
  }) => {
    return (
      <View style={styles.buttonRow}>
        <Button
          textColor={theme.colors.button}
          onPress={handleAddToCart}
          style={[
            styles.button,
            {
              borderColor: theme.colors.button,
              backgroundColor: isInCart ? theme.colors.background : undefined,
            },
          ]}
          disabled={isAddingToCart || isInCart}
          loading={isAddingToCart}
          accessibilityLabel={isInCart ? "In Cart" : "Add to cart"}
        >
          {isInCart === true ? "In Cart" : "Add to cart"}
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
    );
  }
);

// 5. Extract QuestionSection component
const QuestionSection = memo(
  ({
    questions,
    totalQuestions,
    user,
    showQuestionActionSheet,
    theme,
    productId,
    router,
  }) => {
    const displayedQuestions = questions.slice(0, 3);

    return (
      <View
        style={[
          styles.questionsSection,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text
          style={[styles.questionsTitle, { color: theme.colors.textColor }]}
        >
          Product Questions {!totalQuestions === 0 && `(${totalQuestions})`}
        </Text>

        {displayedQuestions.length > 0 ? (
          displayedQuestions.map((q) => {
            const isUserQuestion = user && q.consumer_id === user.consumer_id;
            const canEditOrDelete =
              isUserQuestion && (!q.answers || q.answers.length === 0);
            return (
              <Pressable
                onPress={
                  canEditOrDelete
                    ? () => showQuestionActionSheet(q.products_qna_id)
                    : undefined
                }
                key={q.products_qna_id}
              >
                <QuestionItem item={q} theme={theme} />
              </Pressable>
            );
          })
        ) : (
          <Text
            style={[styles.noQuestionsText, { color: theme.colors.textColor }]}
          >
            No questions yet.
          </Text>
        )}

        <Button
          mode="outlined"
          textColor={theme.colors.button}
          style={[styles.askQuestion, { borderColor: theme.colors.button }]}
          icon="comment-question-outline"
          accessibilityLabel="Ask a question"
          onPress={() =>
            router.navigate({
              pathname: "screens/Questions",
              params: { productId },
            })
          }
        >
          Ask a Question
        </Button>
      </View>
    );
  }
);

const ReviewSection = memo(
  ({ user, theme, productId, rating, onRateProduct }) => {
    const [showLoginAlert, setShowLoginAlert] = useState(false);

    const handleRatingPress = (selectedRating) => {
      if (user) {
        onRateProduct(selectedRating);
      } else {
        setShowLoginAlert(true);
      }
    };

    return (
      <View
        style={[
          styles.questionsSection,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text
          style={[styles.questionsTitle, { color: theme.colors.textColor }]}
        >
          Product Review
        </Text>
        <View style={styles.reviewContainer}>
          <Text
            style={[styles.rateProductText, { color: theme.colors.textColor }]}
          >
            Rate this product:
          </Text>
          <ProductRating
            rating={rating}
            colors={theme.colors}
            onRateProduct={handleRatingPress}
            readOnly={!user}
          />
          {showLoginAlert && (
            <View>
              <Text
                style={{
                  color: theme.colors.textColor,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                You need to be logged in to rate this product.
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push("/screens/Login")}
                style={styles.loginButton}
              >
                Login
              </Button>
            </View>
          )}
        </View>
      </View>
    );
  }
);

// Main component (significantly reduced in size)
const ProductDetail = () => {
  const { id, categoryProductId, idFromFavorite } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const router = useRouter();
  const { showActionSheetWithOptions } = useActionSheet();
  const { isDarkTheme } = useThemeStore();

  // Consolidated state with useReducer pattern
  const [state, setState] = useState({
    isFavorite: false,
    isFavoriting: false,
    isAddingToCart: false,
    questions: [],
    totalQuestions: 0,
    totalComments: 0,
    refreshing: false,
    hasProduct: false,
    userRating: 0,
    favoriteProduct: null,
    isLoading: false,
    relatedProducts: null,
  });

  // Destructure state for readability
  const {
    isFavorite,
    isFavoriting,
    isAddingToCart,
    questions,
    totalQuestions,
    totalComments,
    refreshing,
    hasProduct,
    userRating,
    favoriteProduct,
    isLoading,
    relatedProducts,
  } = state;

  // Use custom hook for alert dialog
  const { alertState, showAlert, hideAlert } = useAlertDialog();

  const {
    user,
    addToFavorite,
    removeFavorite,
    productData,
    favProducts,
    addToCart,
    cartItem,
    error,
    getProductQuestionList,
    deleteProductQuestion,
    productQuestions,
    productComments,
    searchFavoriteProduct,
    fetchRelatedProducts,
    rateProduct,
  } = useProductStore();

  // Memoize product map to avoid recalculation
  const productMap = useMemo(() => {
    return productData.reduce((map, product) => {
      map[product.products_id.toString()] = product;
      return map;
    }, {});
  }, [productData]);

  // Memoize product to avoid recalculation
  const product = useMemo(() => {
    const searchId = id || categoryProductId;
    if (searchId) {
      return productMap[searchId.toString()] || null;
    } else if (favoriteProduct) {
      return favoriteProduct;
    }
    return null;
  }, [id, categoryProductId, productMap, favoriteProduct]);

  // Memoize isInCart to avoid recalculation
  const isInCart = useMemo(() => {
    if (!product || !cartItem || cartItem.length === 0) return false;
    return cartItem.some(
      (item) => item.products_id.toString() === product.products_id.toString()
    );
  }, [cartItem, product]);

  // Fetch product details if navigated from favorite page
  useEffect(() => {
    if (!idFromFavorite) return;

    const fetchFavoriteProduct = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const favoriteProductResult = await searchFavoriteProduct(
          idFromFavorite
        );

        const favoriteProduct =
          Array.isArray(favoriteProductResult) &&
          favoriteProductResult.length > 0
            ? favoriteProductResult[0]
            : favoriteProductResult;

        if (favoriteProduct) {
          setState((prev) => ({
            ...prev,
            hasProduct: true,
            favoriteProduct: !productMap[favoriteProduct.products_id.toString()]
              ? favoriteProduct
              : null,
          }));
        } else {
          showAlert("Error", "Product not found in favorites.");
        }
      } catch (err) {
        console.error("Error fetching favorite product:", err);
        showAlert(
          "Error",
          "Failed to fetch product details: " + (err.message || err)
        );
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchFavoriteProduct();
  }, [idFromFavorite, searchFavoriteProduct, showAlert, productMap]);

  // Update header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: product?.title || "Product Details",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, product, theme]);

  // Consolidated useEffect for product data updates
  useEffect(() => {
    if (!product) {
      setState((prev) => ({ ...prev, hasProduct: false }));
      return;
    }

    setState((prev) => ({
      ...prev,
      hasProduct: true,
      userRating: Math.floor(product.average_rating || 0),
      isFavorite:
        favProducts?.some((item) => item.products_id === product.products_id) ||
        false,
    }));

    // Fetch questions
    const fetchQuestions = async () => {
      try {
        const [questionData, relatedProduct] = await Promise.all([
          getProductQuestionList(product.products_id),
          fetchRelatedProducts(product.products_id),
        ]);

        setState((prev) => ({
          ...prev,
          relatedProducts: relatedProduct.length > 0 ? relatedProduct : null,
          questions: (questionData.questions || []).slice(0, 2),
        }));
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchQuestions();
  }, [product, favProducts, getProductQuestionList]);

  // Update counts when they change
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      totalQuestions: productQuestions,
      totalComments: productComments,
    }));
  }, [productQuestions, productComments]);

  // Refresh questions
  const onRefresh = useCallback(async () => {
    if (!product) return;

    setState((prev) => ({ ...prev, refreshing: true }));

    try {
      const questionData = await getProductQuestionList(product.products_id);
      setState((prev) => ({
        ...prev,
        questions: (questionData.questions || []).slice(0, 2),
      }));
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setState((prev) => ({ ...prev, refreshing: false }));
    }
  }, [product, getProductQuestionList]);

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
      setState((prev) => ({ ...prev, isAddingToCart: true }));

      await addToCart({
        productID: product.products_id,
        consumerID: user.consumer_id,
      });

      ToastAndroid.show("Product added to cart", ToastAndroid.SHORT);
    } catch (err) {
      showAlert("Error", err.message || "Failed to add to cart");
    } finally {
      setState((prev) => ({ ...prev, isAddingToCart: false }));
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
        url: deepLink,
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  }, [product]);

  // Toggle favorite handler
  const handleToggleFavorite = useCallback(async () => {
    if (!user) return navigation.navigate("Login");
    if (isFavoriting || !product) return;

    setState((prev) => ({
      ...prev,
      isFavoriting: true,
      isFavorite: !prev.isFavorite,
    }));

    const previousFavorite = isFavorite;

    try {
      if (!previousFavorite) {
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
    } catch (err) {
      setState((prev) => ({ ...prev, isFavorite: previousFavorite }));
      showAlert("Error", err.message || "Failed to update favorite");
    } finally {
      setState((prev) => ({ ...prev, isFavoriting: false }));
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

  // Handle rating updates
  const handleRate = useCallback(
    async (rating) => {
      if (!user || !product) return;

      const previousRating = userRating;
      setState((prev) => ({ ...prev, userRating: rating }));

      try {
        if (user) {
          await rateProduct({
            productId: product.products_id,
            consumerId: user.consumer_id,
            rating,
          });

          ToastAndroid.show("Rating updated", ToastAndroid.SHORT);
        } else {
          ToastAndroid.show("Rating updated", ToastAndroid.SHORT);
        }
      } catch (err) {
        setState((prev) => ({ ...prev, userRating: previousRating }));
        showAlert("Error", err.message || "Failed to update rating");
      }
    },
    [user, product, userRating, rateProduct, showAlert]
  );

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

        setState((prev) => ({
          ...prev,
          questions: updatedData.questions || [],
          totalQuestions: updatedData.total || 0,
        }));

        ToastAndroid.show("Question deleted", ToastAndroid.SHORT);
      } catch (err) {
        showAlert("Error", err.message || "Failed to delete question");
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

  // Update question handler (placeholder)
  const handleUpdateQuestion = useCallback((questionId) => {
    ToastAndroid.show(
      "Update functionality not implemented",
      ToastAndroid.SHORT
    );
  }, []);

  // Show action sheet for a question
  const showQuestionActionSheet = useCallback(
    (questionId) => {
      const options = ["Edit", "Delete", "Cancel"];
      const destructiveButtonIndex = 1;
      const cancelButtonIndex = 2;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          tintColor: theme.colors.button,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleUpdateQuestion(questionId);
          } else if (buttonIndex === 1) {
            handleDeleteQuestion(questionId);
          }
        }
      );
    },
    [
      showActionSheetWithOptions,
      handleUpdateQuestion,
      handleDeleteQuestion,
      theme.colors.button,
    ]
  );

  if (isLoading && idFromFavorite) {
    return <ProductDetailSkeleton />;
  }

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
        {/* Image Carousel - Extracted to component */}
        <ProductImages
          images={product.product_images}
          isDarkTheme={isDarkTheme}
        />

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
                color={
                  isFavorite
                    ? theme.colors.deleteButton
                    : theme.colors.inactiveColor
                }
                style={[
                  isFavoriting && { opacity: 0.5 },
                  { borderColor: theme.colors.inactiveColor },
                ]}
              />
            </Pressable>
          </View>

          {/* Rating - Extracted to component */}
          <ProductRating
            rating={userRating}
            colors={theme.colors}
            onRateProduct={handleRate}
            readOnly={true} // Read-only in the product info section
          />

          <Text style={[styles.price, { color: theme.colors.button }]}>
            AF {product.spu}
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
              pathname: "/screens/SellerProfile",
              params: {
                sellerId: product.accounts_id,
                sellerTitle: product.store_name,
              },
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
                Seller
              </Text>
              <Text
                style={[
                  styles.showCommentsButton,
                  { color: theme.colors.textColor },
                ]}
              >
                {product.store_name}
              </Text>
            </Pressable>
          </Link>

          <Link
            href={{
              pathname: "/screens/Comments",
              params: {
                productId: product.products_id,
                numOfComments: product.total_comments,
              },
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
                {(totalComments || product.total_comments) + " Comments"}
              </Text>
            </Pressable>
          </Link>

          {/* Product Actions - Extracted to component */}
          <ProductActions
            product={product}
            isInCart={isInCart}
            isAddingToCart={isAddingToCart}
            handleAddToCart={handleAddToCart}
            handleShare={handleShare}
            theme={theme}
          />
        </View>

        <ReviewSection
          user={user}
          theme={theme}
          productId={product.products_id}
          rating={userRating}
          onRateProduct={handleRate}
        />

        {/* Questions Section - Extracted to component */}
        <QuestionSection
          questions={questions}
          totalQuestions={totalQuestions}
          user={user}
          showQuestionActionSheet={showQuestionActionSheet}
          theme={theme}
          productId={product.products_id}
          router={router}
        />

        {relatedProducts && (
          <RelatedProducts relatedProducts={relatedProducts} />
        )}
      </ScrollView>

      {/* Alert Dialog */}
      <AlertDialog
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onDismiss={hideAlert}
        onConfirm={() => {
          alertState.confirmAction();
          hideAlert();
        }}
        confirmText={alertState.confirmText}
        cancelText="Cancel"
      />
    </View>
  );
};

// QuestionItem component (unchanged)
const QuestionItem = memo(({ item, theme }) => (
  <View
    style={[
      styles.questionItem,
      {
        backgroundColor: theme.colors.primary,
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
    width: "100%",
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
    padding: 20,
    borderRadius: 20,
    elevation: 5,
    marginHorizontal: 16,
    marginBottom: 50,
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
  noQuestionsText: {
    fontSize: 16,
    marginBottom: 20,
  },
  askQuestion: {
    marginTop: 10,
  },
  favoriteTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  favoriteTagText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "bold",
  },
  reviewContainer: {
    marginVertical: 10,
    alignItems: "center",
  },
  rateProductText: {
    fontSize: 16,
    marginBottom: 10,
  },
  loginButton: {
    marginTop: 15,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
});

export default ProductDetail;
