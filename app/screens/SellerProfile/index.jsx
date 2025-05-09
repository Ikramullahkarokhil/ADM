import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import {
  MaterialIcons,
  AntDesign,
  MaterialCommunityIcons,
  Feather,
  FontAwesome,
} from "@expo/vector-icons";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import useThemeStore from "../../../components/store/useThemeStore";

// Pre-defined constants to avoid recreating arrays on each render
const MONTHS = [
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

// Pure functions moved outside component for better performance
const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(parseInt(timestamp, 10) * 1000);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const formatReviewDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Optimized RatingStars component with better memoization
const RatingStars = memo(({ rating, size = 16, color }) => {
  // Pre-calculate stars for better performance
  const stars = useMemo(() => {
    const result = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        result.push(
          <AntDesign key={i} name="star" size={size} color={color} />
        );
      } else if (i === fullStars && halfStar) {
        result.push(
          <FontAwesome
            key={i}
            name="star-half-empty"
            size={size}
            color={color}
          />
        );
      } else {
        result.push(
          <AntDesign key={i} name="staro" size={size} color={color} />
        );
      }
    }
    return result;
  }, [rating, size, color]);

  return <View style={styles.ratingContainer}>{stars}</View>;
});

// Optimized ProductItem with better prop structure
const ProductItem = memo(
  ({ product, onPress, colors, isDarkTheme }) => {
    const handlePress = useCallback(() => {
      onPress(product.products_id);
    }, [product.products_id, onPress]);

    const placeholderImage = isDarkTheme
      ? require("../../../assets/images/darkImagePlaceholder.jpg")
      : require("../../../assets/images/imageSkeleton.jpg");

    return (
      <TouchableOpacity
        style={[styles.productItem, { backgroundColor: colors.primary }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.productImageContainer}>
          <Image
            source={
              product.product_images?.[0]
                ? { uri: product.product_images[0] }
                : placeholderImage
            }
            style={styles.productImage}
            resizeMode="cover"
            progressiveRenderingEnabled
            fadeDuration={200}
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
    // Optimized comparison for memo
    return (
      prevProps.product.products_id === nextProps.product.products_id &&
      prevProps.colors === nextProps.colors &&
      prevProps.isDarkTheme === nextProps.isDarkTheme
    );
  }
);

// Simplified ReviewItem component
const ReviewItem = memo(({ review, colors }) => (
  <View style={[styles.reviewItem, { backgroundColor: colors.cardBackground }]}>
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
          {formatReviewDate(review.date)}
        </Text>
      </View>
    </View>
    <Text style={[styles.reviewComment, { color: colors.textColor }]}>
      {review.comment}
    </Text>
  </View>
));

// Simple EmptyReviews component
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

// Section Header component
const SectionHeader = memo(
  ({ title, onShowAll, colors, displayNumberOfReviews, count }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
        {title}
        {displayNumberOfReviews ? ` (${displayNumberOfReviews})` : ""}
      </Text>
      {(count > 10 || displayNumberOfReviews > 5) && (
        <TouchableOpacity onPress={onShowAll} style={{ flexDirection: "row" }}>
          <Text style={[styles.showAllText, { color: colors.button }]}>
            View All
          </Text>
          <Feather name="chevron-right" size={18} color={colors.button} />
        </TouchableOpacity>
      )}
    </View>
  )
);

// Main component with optimized structure
const SellerProfile = () => {
  const { sellerId } = useLocalSearchParams();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sellerData, setSellerData] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const { fetchSellerProfile, user, followSeller, sellerVisitCount } =
    useProductStore();
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();

  // Load seller data with error handling
  const loadSellerData = useCallback(
    async (isRefreshing = false) => {
      if (!sellerId) return;
      try {
        if (!isRefreshing) setLoading(true);

        const data = await fetchSellerProfile({
          sellerId,
          consumerId: user?.consumer_id ?? "",
        });

        if (data) {
          setSellerData(data);
          setIsFollowing(data.do_i_follow === 1);
        }
      } catch (error) {
        console.error("Error fetching seller data:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sellerId, fetchSellerProfile, user?.consumer_id]
  );

  // Initial data load
  useEffect(() => {
    loadSellerData();
  }, [loadSellerData]);

  // Track seller visit
  useEffect(() => {
    if (sellerData?.do_i_visit === 0 && sellerId && user?.consumer_id) {
      sellerVisitCount({ sellerId, consumerId: user.consumer_id });
    }
  }, [sellerData, sellerId, user?.consumer_id, sellerVisitCount]);

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSellerData();
  }, [loadSellerData]);

  // Memoized handlers
  const handleFollowToggle = useCallback(() => {
    if (!sellerData || !sellerId || !user?.consumer_id) return;

    setIsFollowing((prev) => !prev);
    followSeller({ sellerId, consumerId: user.consumer_id });
  }, [sellerId, user?.consumer_id, followSeller, sellerData]);

  const handleProductPress = useCallback((productId) => {
    router.push({
      pathname: "/screens/ProductDetail",
      params: { id: productId },
    });
  }, []);

  const handleShowAll = useCallback(
    (type) => {
      if (!sellerData) return;

      router.navigate({
        pathname: `/screens/Seller${
          type === "reviews" ? "Reviews" : "Products"
        }`,
        params: {
          sellerId,
          listType: type === "newArrivals" ? "newArrivals" : "allProducts",
          title:
            type === "newArrivals"
              ? "New Arrivals"
              : type === "reviews"
              ? "Customer Reviews"
              : "All Products",
          sellerName: sellerData?.seller.store_name,
        },
      });
    },
    [sellerId, sellerData]
  );

  // Memoized data
  const displayNewArrivals = useMemo(
    () => sellerData?.new_arrivals?.data || [],
    [sellerData?.new_arrivals?.data]
  );

  const displayNewArrivalsCount = useMemo(
    () => sellerData?.new_arrivals?.total || 0,
    [sellerData?.new_arrivals?.total]
  );

  const displayAllProducts = useMemo(
    () => sellerData?.all_products?.data || [],
    [sellerData?.all_products?.data]
  );

  const displayReviews = useMemo(
    () => sellerData?.people_reviews?.data || [],
    [sellerData?.people_reviews?.data]
  );

  const displayNumberOfReviews = useMemo(
    () => sellerData?.people_reviews?.total || 0,
    [sellerData?.people_reviews?.total]
  );

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

  // Destructure data once we know it exists
  const {
    seller,
    followers_count,
    average_rating,
    total_rating,
    total_visits,
    all_products,
  } = sellerData;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Header Section */}
      <View
        style={[
          styles.headerImageContainer,
          { backgroundColor: colors.button },
        ]}
      >
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
              style={[styles.sellerName, { color: colors.buttonText }]}
              numberOfLines={1}
            >
              {seller.store_name}
            </Text>
            <View style={styles.ratingSection}>
              <Text
                style={[
                  styles.ratingText,
                  { color: colors.buttonText, marginLeft: 0, marginRight: 5 },
                ]}
              >
                {parseFloat(average_rating || 0).toFixed(1)}
              </Text>
              <RatingStars rating={parseFloat(average_rating)} color="yellow" />
              <Text style={[styles.ratingText, { color: colors.buttonText }]}>
                ({total_rating})
              </Text>
            </View>
            <View style={styles.ratingSection}>
              <Text style={{ color: colors.buttonText }}>Since:</Text>
              <Text style={[styles.ratingText, { color: colors.buttonText }]}>
                {formatDate(seller.registration_date)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.primary }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.button]}
            tintColor={colors.button}
            progressBackgroundColor={colors.primary}
          />
        }
      >
        {/* Stats Section */}
        <View style={styles.statsSection}>
          {[
            { label: "Followers", value: followers_count },
            { label: "Visits", value: total_visits },
            { label: "Products", value: all_products.total },
          ].map((stat, index, array) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textColor }]}>
                  {stat.value}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.inactiveColor }]}
                >
                  {stat.label}
                </Text>
              </View>
              {index < array.length - 1 && (
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: colors.subInactiveColor },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Follow Button */}
        {user && (
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
        )}

        {/* New Arrivals Section */}
        {displayNewArrivalsCount > 10 && (
          <View style={[styles.section, { backgroundColor: colors.primary }]}>
            <SectionHeader
              title="New Arrivals"
              onShowAll={() => handleShowAll("newArrivals")}
              colors={colors}
              count={displayNewArrivalsCount}
            />

            <View style={styles.productsGrid}>
              {displayNewArrivals.map((product) => (
                <ProductItem
                  key={`new-arrival-${product.products_id}`}
                  product={product}
                  onPress={handleProductPress}
                  colors={colors}
                  isDarkTheme={isDarkTheme}
                />
              ))}
            </View>
          </View>
        )}

        {/* All Products Section */}
        {displayAllProducts.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.primary }]}>
            <SectionHeader
              title="All Products"
              onShowAll={() => handleShowAll("allProducts")}
              colors={colors}
              count={sellerData.all_products.total}
            />

            <View style={styles.productsGrid}>
              {displayAllProducts.map((product) => (
                <ProductItem
                  key={`all-product-${product.products_id}`}
                  product={product}
                  onPress={handleProductPress}
                  colors={colors}
                  isDarkTheme={isDarkTheme}
                />
              ))}
            </View>
          </View>
        )}

        {/* Reviews Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.primary,
              elevation: 5,
              marginHorizontal: 16,
            },
          ]}
        >
          <SectionHeader
            title="Customer Reviews"
            onShowAll={() => handleShowAll("reviews")}
            colors={colors}
            displayNumberOfReviews={displayNumberOfReviews}
          />

          {displayReviews.length > 0 ? (
            displayReviews.map((review, index) => (
              <React.Fragment key={`review-${index}`}>
                <ReviewItem review={review} colors={colors} />
                {index < displayReviews.length - 1 && (
                  <View
                    style={{
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.subInactiveColor,
                      marginVertical: 8,
                    }}
                  />
                )}
              </React.Fragment>
            ))
          ) : (
            <EmptyReviews colors={colors} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Optimized styles with better organization
const styles = StyleSheet.create({
  // Layout containers
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: 20,
  },

  // Loading and error states
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

  // Header styles
  headerImageContainer: {
    height: 110,
    width: "100%",
  },
  profileSection: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    position: "relative",
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
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

  // Rating styles
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

  // Stats section
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

  // Follow button
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  followIcon: {
    marginRight: 6,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Section styles
  section: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  showAllText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Products grid
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -4,
  },
  productItem: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  productImageContainer: {
    height: 120,
    width: "100%",
  },
  productImage: {
    width: "100%",
    height: "100%",
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

  // Review styles
  reviewItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
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
