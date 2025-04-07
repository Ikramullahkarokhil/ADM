import { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import {
  MaterialIcons,
  AntDesign,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import useThemeStore from "../../../components/store/useThemeStore";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Format date without date-fns
const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(Number.parseInt(timestamp) * 1000);
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Format review date
const formatReviewDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Memoized rating component
const RatingStars = memo(({ rating, size = 16, color }) => {
  // Pre-calculate stars for better performance
  const stars = useMemo(() => {
    const result = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        result.push(
          <AntDesign key={`star-${i}`} name="star" size={size} color={color} />
        );
      } else if (i === fullStars && halfStar) {
        result.push(
          <AntDesign
            key={`star-${i}`}
            name="starhalf"
            size={size}
            color={color}
          />
        );
      } else {
        result.push(
          <AntDesign key={`star-${i}`} name="staro" size={size} color={color} />
        );
      }
    }
    return result;
  }, [rating, size, color]);

  return <View style={styles.ratingContainer}>{stars}</View>;
});

// Memoized product item component with optimized image loading
const ProductItem = memo(
  ({ product, onPress, colors }) => {
    // Handle press with product ID to avoid re-renders
    const handlePress = useCallback(() => {
      onPress(product.products_id);
    }, [product.products_id, onPress]);

    const { isDarkTheme } = useThemeStore();

    return (
      <TouchableOpacity
        style={[styles.productItem, { backgroundColor: colors.primary }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          <Image
            source={
              product.product_images[0]
                ? { uri: product.product_images[0] }
                : isDarkTheme
                ? require("../../../assets/images/darkImagePlaceholder.jpg")
                : require("../../../assets/images/imageSkeleton.jpg")
            }
            style={styles.productImage}
            resizeMode="cover"
            progressiveRenderingEnabled={true}
            fadeDuration={300}
          />
        </View>
        <View style={styles.productInfo}>
          <Text
            style={[styles.productTitle, { color: colors.textColor }]}
            numberOfLines={1}
          >
            {product.title}
          </Text>
          <Text style={[styles.productPrice, { color: colors.button }]}>
            AF {product.spu}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo to prevent unnecessary re-renders
    return (
      prevProps.product.products_id === nextProps.product.products_id &&
      prevProps.colors === nextProps.colors
    );
  }
);

// Memoized review item component
const ReviewItem = memo(({ review, colors }) => {
  // Memoize formatted date to avoid recalculation
  const formattedDate = useMemo(
    () => formatReviewDate(review.date),
    [review.date]
  );

  return (
    <View
      style={[styles.reviewItem, { backgroundColor: colors.cardBackground }]}
    >
      <View style={styles.reviewHeader}>
        <View
          style={[styles.reviewAvatar, { backgroundColor: colors.activeColor }]}
        >
          <Text style={[styles.reviewInitial, { color: colors.primary }]}>
            {review.consumer_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.reviewInfo}>
          <Text style={[styles.reviewerName, { color: colors.textColor }]}>
            {review.consumer_name}
          </Text>
          <Text style={[styles.reviewDate, { color: colors.inactiveColor }]}>
            {formattedDate}
          </Text>
        </View>
      </View>
      <Text style={[styles.reviewComment, { color: colors.textColor }]}>
        {review.comment}
      </Text>
    </View>
  );
});

// Optimized empty state component
const EmptyReviews = memo(({ colors }) => (
  <View style={styles.emptyReviews}>
    <MaterialCommunityIcons
      name="comment-text-outline"
      size={40}
      color={colors.inactiveColor}
    />
    <Text style={[styles.emptyReviewsText, { color: colors.inactiveColor }]}>
      No reviews yet
    </Text>
  </View>
));

// Main component
const SellerProfile = () => {
  const { sellerId, sellerTitle } = useLocalSearchParams();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [sellerData, setSellerData] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const { fetchSellerProfile, user, followSeller } = useProductStore();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState("newArrivals");

  // Optimize by limiting initial render items
  const [visibleReviews, setVisibleReviews] = useState(5);
  const [visibleProducts, setVisibleProducts] = useState(6);

  // IMPORTANT: Move the destructuring inside the render section after null checks
  // Don't destructure sellerData here

  // Set navigation options
  useEffect(() => {
    navigation.setOptions({
      headerTitle: sellerTitle || "Seller Profile",
      headerShown: true,
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.textColor,
    });
  }, [sellerTitle, navigation, colors]);

  // Load seller data with error handling and retry
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadSellerData = async () => {
      if (!sellerId) return;

      try {
        setLoading(true);
        const data = await fetchSellerProfile({
          sellerId: sellerId,
          consumerId: user?.consumer_id,
        });

        if (isMounted) {
          setSellerData(data);
          setIsFollowing(data.do_i_follow === 1);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching seller data:", error);

        // Implement retry logic
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          setTimeout(loadSellerData, 1000 * retryCount);
        } else if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSellerData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [sellerId, fetchSellerProfile, user?.consumer_id]);

  // Memoized handlers
  const handleFollowToggle = useCallback(() => {
    if (!sellerData || !sellerId) return;

    setIsFollowing((prev) => !prev);
    followSeller({
      sellerId: sellerId,
      consumerId: user?.consumer_id,
    });
  }, [sellerId, user?.consumer_id, followSeller, sellerData]);

  const handleProductPress = useCallback((productId) => {
    // Navigate to product detail
    router.push({
      pathname: "/screens/ProductDetail",
      params: { idFromFavorite: productId },
    });
  }, []);

  const handleLoadMoreReviews = useCallback(() => {
    setVisibleReviews((prev) => prev + 5);
  }, []);

  const handleLoadMoreProducts = useCallback(() => {
    setVisibleProducts((prev) => prev + 6);
  }, []);

  // Tab switching with memoization
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    // Reset visible products when switching tabs
    setVisibleProducts(6);
  }, []);

  // Memoize filtered products based on active tab
  const displayProducts = useMemo(() => {
    if (!sellerData) return [];

    const products =
      activeTab === "newArrivals"
        ? sellerData.new_arrivals?.data || []
        : sellerData.all_products || [];

    return products.slice(0, visibleProducts);
  }, [sellerData, activeTab, visibleProducts]);

  // Memoize visible reviews
  const displayReviews = useMemo(() => {
    if (!sellerData?.people_reviews?.data) return [];
    return sellerData.people_reviews.data.slice(0, visibleReviews);
  }, [sellerData?.people_reviews?.data, visibleReviews]);

  // Memoize whether there are more items to load
  const hasMoreReviews = useMemo(() => {
    if (!sellerData?.people_reviews?.data) return false;
    return visibleReviews < sellerData.people_reviews.data.length;
  }, [sellerData?.people_reviews?.data, visibleReviews]);

  const hasMoreProducts = useMemo(() => {
    if (!sellerData) return false;

    const totalProducts =
      activeTab === "newArrivals"
        ? sellerData.new_arrivals?.data?.length || 0
        : sellerData.all_products?.length || 0;

    return visibleProducts < totalProducts;
  }, [sellerData, activeTab, visibleProducts]);

  // Loading state
  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.primary }]}
      >
        <ActivityIndicator size="large" color={colors.button} />
        <Text style={[styles.loadingText, { color: colors.textColor }]}>
          Loading seller profile...
        </Text>
      </View>
    );
  }

  // Error state
  if (!sellerData) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.primary }]}
      >
        <MaterialIcons
          name="error-outline"
          size={48}
          color={colors.deleteButton}
        />
        <Text style={[styles.errorText, { color: colors.textColor }]}>
          Seller information not found
        </Text>
        <Pressable
          style={[styles.backButton, { borderColor: colors.inactiveColor }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.textColor }]}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  // Now that we've confirmed sellerData exists, we can safely destructure it
  const {
    seller,
    followers_count,
    average_rating,
    total_visits,
    people_reviews,
    all_products,
  } = sellerData;

  // Format registration date
  const formattedDate = formatDate(seller.registration_date);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.primary }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
      removeClippedSubviews={Platform.OS === "android"}
    >
      {/* Header Section */}
      <View style={styles.headerImageContainer}>
        <View
          style={[styles.headerGradient, { backgroundColor: colors.button }]}
        />
        <View style={styles.profileSection}>
          <View
            style={[
              styles.profileImageContainer,
              { backgroundColor: colors.activeColor },
            ]}
          >
            {seller.image ? (
              <Image
                source={{ uri: seller.image }}
                style={styles.profileImage}
              />
            ) : (
              <Text style={[styles.profileInitial, { color: colors.primary }]}>
                {seller.store_name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text
              style={[styles.sellerName, { color: "white" }]}
              numberOfLines={1}
            >
              {seller.store_name}
            </Text>

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <RatingStars
                rating={Number.parseFloat(average_rating)}
                color="yellow"
              />
              <Text style={[styles.ratingText, { color: "yellow" }]}>
                {Number.parseFloat(average_rating).toFixed(1)}
              </Text>
            </View>
            <View style={styles.ratingSection}>
              <Text style={[{ color: "white" }]}>Since:</Text>
              <Text style={[styles.ratingText, { color: "white" }]}>
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textColor }]}>
            {followers_count}
          </Text>
          <Text style={[styles.statLabel, { color: colors.inactiveColor }]}>
            Followers
          </Text>
        </View>

        <View
          style={[
            styles.statDivider,
            { backgroundColor: colors.subInactiveColor },
          ]}
        />

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textColor }]}>
            {total_visits}
          </Text>
          <Text style={[styles.statLabel, { color: colors.inactiveColor }]}>
            Visits
          </Text>
        </View>

        <View
          style={[
            styles.statDivider,
            { backgroundColor: colors.subInactiveColor },
          ]}
        />

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textColor }]}>
            {all_products.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.inactiveColor }]}>
            Products
          </Text>
        </View>
      </View>

      {/* Follow Button */}
      <TouchableOpacity
        style={[
          styles.followButton,
          {
            backgroundColor: isFollowing ? colors.primary : colors.button,
            borderColor: isFollowing ? colors.button : "transparent",
            borderWidth: isFollowing ? 1 : 0,
          },
        ]}
        onPress={handleFollowToggle}
        activeOpacity={0.8}
      >
        <AntDesign
          name={isFollowing ? "check" : "plus"}
          size={16}
          color={isFollowing ? colors.button : colors.primary}
          style={styles.followIcon}
        />
        <Text
          style={[
            styles.followButtonText,
            { color: isFollowing ? colors.button : colors.primary },
          ]}
        >
          {isFollowing ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>

      {/* Products Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "newArrivals" && [
              styles.activeTab,
              { borderColor: colors.button },
            ],
          ]}
          onPress={() => handleTabChange("newArrivals")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "newArrivals"
                    ? colors.activeColor
                    : colors.inactiveColor,
              },
            ]}
          >
            New Arrivals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "allProducts" && [
              styles.activeTab,
              { borderColor: colors.button },
            ],
          ]}
          onPress={() => handleTabChange("allProducts")}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "allProducts"
                    ? colors.activeColor
                    : colors.inactiveColor,
              },
            ]}
          >
            All Products
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List - Using optimized FlatList */}
      <View style={styles.productsContainer}>
        <FlatList
          data={displayProducts}
          keyExtractor={(item) => item.products_id.toString()}
          horizontal={false}
          numColumns={2}
          renderItem={({ item }) => (
            <ProductItem
              product={item}
              onPress={handleProductPress}
              colors={colors}
            />
          )}
          scrollEnabled={false}
          contentContainerStyle={styles.productsGrid}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
        />

        {hasMoreProducts && (
          <TouchableOpacity
            style={[styles.viewMoreButton, { borderColor: colors.button }]}
            onPress={handleLoadMoreProducts}
          >
            <Text style={[styles.viewMoreText, { color: colors.button }]}>
              View More{" "}
              {activeTab === "newArrivals" ? "New Arrivals" : "Products"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reviews Section */}
      <View style={[styles.section, { backgroundColor: colors.primary }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            Customer Reviews
          </Text>
        </View>

        {people_reviews.data.length > 0 ? (
          <>
            {displayReviews.map((review, index) => (
              <ReviewItem
                key={`${review.consumer_name}-${index}`}
                review={review}
                colors={colors}
              />
            ))}

            {hasMoreReviews && (
              <TouchableOpacity
                style={[styles.viewMoreButton, { borderColor: colors.button }]}
                onPress={handleLoadMoreReviews}
              >
                <Text style={[styles.viewMoreText, { color: colors.button }]}>
                  View More Reviews
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <EmptyReviews colors={colors} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 14,
  },
  headerImageContainer: {
    position: "relative",
    height: 120,
    marginBottom: 5,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  profileSection: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    position: "absolute",
    bottom: -5,
    left: 0,
    right: 0,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: "bold",
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  sellerName: {
    fontSize: 22,
    fontWeight: "700",
  },
  ratingSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  ratingContainer: {
    flexDirection: "row",
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: "80%",
    alignSelf: "center",
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    elevation: 5,
  },
  followIcon: {
    marginRight: 6,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    width: 110,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  themeIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  productsContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  productsGrid: {},
  productItem: {
    width: "46%",
    marginHorizontal: "2%",
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImageContainer: {
    height: 120,
    width: "100%",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    padding: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  viewMoreButton: {
    marginTop: 12,
    marginHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  ratingBadge: {
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  reviewItem: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewInitial: {
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewInfo: {
    marginLeft: 10,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyReviews: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyReviewsText: {
    marginTop: 8,
    fontSize: 14,
  },
});

export default memo(SellerProfile);
