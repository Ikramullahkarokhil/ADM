import React, { useEffect, useCallback, useState, memo, useRef } from "react";
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
  Animated,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import {
  Link,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Button, PaperProvider, useTheme } from "react-native-paper";
import * as Linking from "expo-linking";
import AlertDialog from "../../../components/ui/AlertDialog";
import useProductStore from "../../../components/api/useProductStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";
import RelatedProducts from "../../../components/ui/RelatedProducts";
import ProductDetailSkeleton from "../../../components/skeleton/ProductDetailsSkeleton";
import { StatusBar } from "expo-status-bar";

const { width: screenWidth } = Dimensions.get("window");

// Custom hook for alert dialog
const useAlertDialog = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [confirmText, setConfirmText] = useState("Ok");
  const [confirmAction, setConfirmAction] = useState(
    () => () => setVisible(false)
  );

  const showAlert = useCallback(
    (
      newTitle,
      newMessage,
      newConfirmAction = () => setVisible(false),
      newConfirmText = "Ok"
    ) => {
      setTitle(newTitle);
      setMessage(newMessage);
      setConfirmAction(() => newConfirmAction);
      setConfirmText(newConfirmText);
      setVisible(true);
    },
    []
  );

  const hideAlert = useCallback(() => setVisible(false), []);

  return {
    alertState: { visible, title, message, confirmText, confirmAction },
    showAlert,
    hideAlert,
  };
};

// Simplified ProductRating component
const ProductRating = memo(
  ({ rating, colors, onRateProduct, readOnly, size, numberOfRating }) => {
    const handleStarPress = useCallback(
      (index) => !readOnly && onRateProduct?.(index + 1),
      [readOnly, onRateProduct]
    );

    return (
      <View style={styles.ratingContainer}>
        {readOnly && rating >= 1 && (
          <Text
            style={[
              styles.ratingText,
              { color: colors.textColor, marginRight: 5 },
            ]}
          >
            {rating}
          </Text>
        )}
        {[...Array(5)].map((_, index) => (
          <Pressable
            key={index}
            onPress={() => handleStarPress(index)}
            style={styles.starButton}
            accessibilityRole={readOnly ? "text" : "button"}
          >
            <FontAwesome
              name={index < rating ? "star" : "star-o"}
              size={size}
              color={index < rating ? "#FFD700" : colors.inactiveColor}
            />
          </Pressable>
        ))}
        {numberOfRating >= 1 && (
          <Text style={[styles.ratingText, { color: colors.textColor }]}>
            ({numberOfRating})
          </Text>
        )}
      </View>
    );
  }
);

// Simplified ProductImages component
const ProductImages = memo(({ images, isDarkTheme }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const displayImages =
    images?.length > 0
      ? images
      : [
          isDarkTheme
            ? require("../../../assets/images/darkImagePlaceholder.jpg")
            : require("../../../assets/images/imageSkeleton.jpg"),
        ];

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
            style={[styles.dot, currentSlide === index && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
});

// Modern Discount Badge component
const DiscountBadge = memo(({ discountTitle, discountValue }) => {
  return (
    <View style={styles.discountBadge}>
      <Text style={styles.discountValue}>{discountValue}%</Text>
      <Text style={styles.discountTitle}>{discountTitle}</Text>
    </View>
  );
});

// Product Actions component
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
        >
          {isInCart ? "In Cart" : "Add to cart"}
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
        >
          Share
        </Button>
      </View>
    );
  }
);

// Question Item component
const QuestionItem = memo(({ item, theme }) => (
  <View
    style={[styles.questionItem, { backgroundColor: theme.colors.primary }]}
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
    {item.answers?.map((ans) => (
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
            style={[styles.answerSellerName, { color: theme.colors.textColor }]}
          >
            {ans.seller_name}
          </Text>
          <Text
            style={[styles.answerDate, { color: theme.colors.inactiveColor }]}
          >
            {ans.date}
          </Text>
          <Text style={[styles.answerText, { color: theme.colors.textColor }]}>
            {ans.answer}
          </Text>
        </View>
      </View>
    ))}
  </View>
));

// Question Section component
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
          Product Questions {totalQuestions > 0 && `(${totalQuestions})`}
        </Text>

        {questions.length > 0 ? (
          questions.map((q) => {
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

// Review Section component
const ReviewSection = memo(
  ({ user, theme, productId, rating, onRateProduct }) => {
    const [showLoginAlert, setShowLoginAlert] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const router = useRouter();

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, [fadeAnim]);

    const handleRatingPress = useCallback(
      (selectedRating) => {
        if (user) {
          onRateProduct(selectedRating);
        } else {
          setShowLoginAlert(true);
        }
      },
      [user, onRateProduct]
    );

    return (
      <Animated.View
        style={[
          styles.reviewSection,
          {
            backgroundColor: theme.colors.primary,
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.reviewHeader}>
          <Ionicons
            name="star-half-outline"
            size={24}
            color={theme.colors.button}
          />
          <Text style={[styles.reviewTitle, { color: theme.colors.textColor }]}>
            Product Review
          </Text>
        </View>

        <View style={styles.reviewContainer}>
          <View style={styles.ratingCard}>
            <Text
              style={[
                styles.rateProductText,
                { color: theme.colors.textColor },
              ]}
            >
              Rate this product:
            </Text>
            <ProductRating
              rating={rating}
              colors={theme.colors}
              onRateProduct={handleRatingPress}
              readOnly={!user}
              size={24}
            />
          </View>

          {showLoginAlert && (
            <View style={styles.loginAlertContainer}>
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
                buttonColor={theme.colors.button}
              >
                Login
              </Button>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }
);

// Main ProductDetail component
const ProductDetail = () => {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const router = useRouter();
  const { showActionSheetWithOptions } = useActionSheet();
  const { isDarkTheme } = useThemeStore();
  const scrollViewRef = useRef();

  // State
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [totalRating, setTotalRating] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState(null);

  // Store hooks
  const {
    user,
    addToFavorite,
    removeFavorite,
    favProducts,
    addToCart,
    cartItem,
    error,
    getProductQuestionList,
    deleteProductQuestion,
    productQuestions,
    fetchProductDetails,
    fetchRelatedProducts,
    rateProduct,
  } = useProductStore();

  // Alert dialog
  const { alertState, showAlert, hideAlert } = useAlertDialog();

  // Check if product is in cart
  const isInCart =
    product &&
    cartItem?.some(
      (item) => item.products_id.toString() === product.products_id.toString()
    );

  // Fetch all product data
  const fetchAllData = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      // Fetch product details
      const productResponse = await fetchProductDetails({
        productId: id,
        consumerId: user?.consumer_id,
      });

      if (productResponse?.data) {
        const productData = productResponse.data;
        setProduct(productData);
        setIsFavorite(Number(productResponse?.is_fav?.is_favourite) === 1);
        setUserRating(Number(productData?.average_rating) || 0);
        setTotalRating(Number(productData.total_rating) || 0);

        // Fetch related data in parallel
        const [questionsData, relatedProductsData] = await Promise.all([
          getProductQuestionList({
            productId: productData.products_id,
            page: 1,
            limitData: 3,
          }),
          fetchRelatedProducts(productData.products_id),
        ]);

        setQuestions(questionsData.questions || []);
        setRelatedProducts(
          relatedProductsData?.length > 0 ? relatedProductsData : null
        );
        setTotalQuestions(productQuestions);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      showAlert("Error", "Failed to load product data");
    } finally {
      setIsLoading(false);
    }
  }, [
    id,
    user,
    fetchProductDetails,
    getProductQuestionList,
    fetchRelatedProducts,
    showAlert,
  ]);

  // Initial data load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Update header title
  useEffect(() => {
    navigation.setOptions({
      title: product?.title || "Product Details",
    });
  }, [navigation, product]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAllData();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllData]);

  // Add to cart handler
  const handleAddToCart = useCallback(async () => {
    if (!product) return;

    if (!user) {
      showAlert(
        "Login Required",
        "Please login to add products to your cart.",
        () => router.navigate("/Login")
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
      showAlert("Error", err.message || "Failed to add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, user, isInCart, addToCart, showAlert, router]);

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
    if (!user) return router.navigate("/Login");
    if (isFavoriting || !product) return;

    const previousFavorite = isFavorite;
    setIsFavoriting(true);
    setIsFavorite(!previousFavorite);

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
      setIsFavorite(previousFavorite);
      showAlert("Error", err.message || "Failed to update favorite");
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
    router,
  ]);

  // Rate product handler
  const handleRate = useCallback(
    async (rating) => {
      if (!user || !product) return;

      const previousRating = userRating;
      setUserRating(rating);

      try {
        await rateProduct({
          productId: product.products_id,
          consumerId: user.consumer_id,
          rating,
        });
        ToastAndroid.show("Rating updated", ToastAndroid.SHORT);
      } catch (err) {
        setUserRating(previousRating);
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
          () => router.navigate("/screens/Login")
        );
        return;
      }

      try {
        await deleteProductQuestion({
          consumerID: user.consumer_id,
          questionId,
        });

        const updatedData = await getProductQuestionList({
          productId: product.products_id,
          page: 1,
          limitData: 3,
        });

        setQuestions(updatedData.questions || []);
        setTotalQuestions(updatedData.total || 0);
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
      router,
    ]
  );

  // Show question action sheet
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
            ToastAndroid.show(
              "Update functionality not implemented",
              ToastAndroid.SHORT
            );
          } else if (buttonIndex === 1) {
            handleDeleteQuestion(questionId);
          }
        }
      );
    },
    [showActionSheetWithOptions, handleDeleteQuestion, theme.colors.button]
  );

  // Handle related product selection
  const handleRelatedProductSelect = useCallback(
    async (productId) => {
      setIsLoading(true);
      try {
        router.setParams({ id: productId });
      } catch (err) {
        console.error("Error fetching product:", err);
        showAlert("Error", "Failed to fetch product details");
      } finally {
        setIsLoading(false);
      }
    },
    [router, showAlert]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style={isDarkTheme ? "light" : "dark"} />
        <ProductDetailSkeleton />
      </View>
    );
  }

  // Error state
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

  // No product state
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

  // Calculate discount end date
  const discountEndDate = product.discount_end_at
    ? new Date(product.discount_end_at)
    : null;
  const today = new Date();
  const hasActiveDiscount =
    product.discount_value && discountEndDate && discountEndDate > today;

  // Main render
  return (
    <View style={styles.mainContainer}>
      <StatusBar style={isDarkTheme ? "light" : "dark"} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.primary },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.button]}
            tintColor={theme.colors.button}
          />
        }
      >
        <ProductImages
          images={product.product_images}
          isDarkTheme={isDarkTheme}
        />

        <View
          style={[
            styles.infoContainer,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          {/* Title and favorite button */}
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
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={28}
                color={
                  isFavorite
                    ? theme.colors.deleteButton
                    : theme.colors.inactiveColor
                }
                style={isFavoriting && { opacity: 0.5 }}
              />
            </Pressable>
          </View>

          {/* Rating */}
          <ProductRating
            rating={userRating}
            colors={theme.colors}
            readOnly={true}
            size={16}
            numberOfRating={totalRating}
          />

          {/* Modern price display with discount */}
          <View style={styles.priceContainer}>
            {hasActiveDiscount ? (
              <>
                <View style={styles.priceRow}>
                  <Text
                    style={[
                      styles.discountedPrice,
                      { color: theme.colors.button },
                    ]}
                  >
                    AF {product.discounted_price}
                  </Text>
                  <Text
                    style={[
                      styles.originalPrice,
                      { color: theme.colors.deleteButton },
                    ]}
                  >
                    AF {product.spu}
                  </Text>
                </View>
                <DiscountBadge
                  discountTitle={product.discount_title}
                  discountValue={product.discount_value}
                />
                {discountEndDate && (
                  <Text style={styles.discountEndDate}>
                    Offer ends: {discountEndDate.toLocaleDateString()}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.price, { color: theme.colors.button }]}>
                AF {product.spu}
              </Text>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <Text
              style={[styles.description, { color: theme.colors.textColor }]}
            >
              {product.description}
            </Text>
          )}

          {/* Brand */}
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

          {/* Seller */}
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
            <Pressable style={styles.detailsRow}>
              <Text
                style={[styles.detailLabel, { color: theme.colors.textColor }]}
              >
                Seller
              </Text>
              <Text
                style={[styles.detailValue, { color: theme.colors.textColor }]}
              >
                {product.store_name}
              </Text>
            </Pressable>
          </Link>

          {/* Comments */}
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
            <Pressable style={styles.detailsRow}>
              <Text
                style={[styles.detailLabel, { color: theme.colors.textColor }]}
              >
                Comments
              </Text>
              <Text
                style={[styles.detailValue, { color: theme.colors.textColor }]}
              >
                {product.total_comments} Comments
              </Text>
            </Pressable>
          </Link>

          {/* Action buttons */}
          <ProductActions
            product={product}
            isInCart={isInCart}
            isAddingToCart={isAddingToCart}
            handleAddToCart={handleAddToCart}
            handleShare={handleShare}
            theme={theme}
          />
        </View>

        {/* Review section */}
        {user && (
          <ReviewSection
            user={user}
            theme={theme}
            productId={product.products_id}
            rating={userRating}
            onRateProduct={handleRate}
          />
        )}

        {/* Questions section */}
        <QuestionSection
          questions={questions}
          totalQuestions={totalQuestions}
          user={user}
          showQuestionActionSheet={showQuestionActionSheet}
          theme={theme}
          productId={product.products_id}
          router={router}
        />

        {/* Related products */}
        {relatedProducts && (
          <RelatedProducts
            relatedProducts={relatedProducts}
            onProductSelect={handleRelatedProductSelect}
          />
        )}
      </ScrollView>

      {/* Alert Dialog */}
      <PaperProvider theme={theme}>
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
      </PaperProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 20,
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
  activeDot: {
    backgroundColor: "#007AFF",
    width: 10,
    height: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  infoContainer: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
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
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: "500",
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
  },
  originalPrice: {
    fontSize: 18,
    textDecorationLine: "line-through",
    marginLeft: 10,
    opacity: 0.7,
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E53935",
  },
  discountBadge: {
    backgroundColor: "#E53935",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  discountValue: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  discountTitle: {
    color: "white",
    fontSize: 12,
  },
  discountEndDate: {
    fontSize: 12,
    color: "#757575",
    marginTop: 4,
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
    textDecorationLine: "underline",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
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
  questionsSection: {
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 5,
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
  answerItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    marginLeft: 50,
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
  reviewSection: {
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 5,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,
  },
  reviewContainer: {
    alignItems: "center",
  },
  ratingCard: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  rateProductText: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 16,
    textAlign: "center",
  },
  loginAlertContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    width: "100%",
  },
  loginButton: {
    marginTop: 15,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
});

export default ProductDetail;
