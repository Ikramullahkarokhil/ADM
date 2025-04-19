import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import useThemeStore from "../store/useThemeStore";
import { Feather, Clock } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

// Countdown Timer component
const CountdownTimer = memo(({ endTime, colors }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTimeMs = new Date(endTime).getTime();
      const difference = endTimeMs - now;

      if (difference <= 0) {
        setTimeLeft("Ended");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      let timeString = "";
      if (days > 0) {
        timeString = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        timeString = `${hours}h ${minutes}m`;
      } else {
        timeString = `${minutes}m`;
      }

      setTimeLeft(timeString);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft) return null;

  return (
    <View style={styles.timerBadge}>
      <Feather name="clock" size={10} color={colors.buttonText} />
      <Text style={[styles.timerText, { color: colors.buttonText }]}>
        {timeLeft}
      </Text>
    </View>
  );
});

// Optimized ProductImage component with memo and proper image handling
const ProductImage = memo(({ source, isDarkTheme, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const placeholderImage = useMemo(
    () =>
      isDarkTheme
        ? require("../../assets/images/darkImagePlaceholder.jpg")
        : require("../../assets/images/imageSkeleton.jpg"),
    [isDarkTheme]
  );

  return (
    <View style={[style, styles.imageWrapper]}>
      {(isLoading || hasError) && (
        <Image
          source={placeholderImage}
          style={styles.placeholderImage}
          resizeMode="cover"
        />
      )}
      {source?.uri && (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </View>
  );
});

// Memoized ViewAllCard component
const ViewAllCard = memo(({ onPress, isDarkTheme, colors }) => {
  return (
    <View style={styles.cardWrapper}>
      <Pressable
        style={[
          styles.productCard,
          styles.viewAllCard,
          { backgroundColor: colors.primary },
        ]}
        onPress={onPress}
      >
        <View style={styles.viewAllContent}>
          <Text style={[styles.viewAllCardText, { color: colors.button }]}>
            View All
          </Text>
          <Feather name="arrow-right" size={24} color={colors.button} />
        </View>
      </Pressable>
    </View>
  );
});

// Optimized ProductItem component with memo and stable props
const ProductItem = memo(
  ({ item, onPress, isDarkTheme, colors }) => {
    const handlePress = useCallback(() => {
      onPress(item.id);
    }, [onPress, item.id]);

    const overlayStyle = useMemo(
      () => [
        styles.titleOverlay,
        {
          backgroundColor: isDarkTheme
            ? "rgba(0, 0, 0, 0.7)"
            : "rgba(255, 255, 255, 0.7)",
        },
      ],
      [isDarkTheme]
    );

    // Calculate discount percentage
    const discountPercentage = item.discountValue
      ? `${item.discountValue}% OFF`
      : null;

    return (
      <View style={styles.cardWrapper}>
        <Pressable style={styles.productCard} onPress={handlePress}>
          <View style={styles.imageContainer}>
            <ProductImage
              source={item.image ? { uri: item.image } : null}
              isDarkTheme={isDarkTheme}
              style={styles.productImage}
            />

            {/* Timer and Discount badge container */}
            <View style={styles.badgesContainer}>
              {/* Countdown Timer */}
              {item.discountEndAt && (
                <CountdownTimer endTime={item.discountEndAt} colors={colors} />
              )}

              {/* Discount badge */}
              {discountPercentage && (
                <View
                  style={[
                    styles.discountBadge,
                    { backgroundColor: colors.deleteButton },
                  ]}
                >
                  <Text
                    style={[styles.discountText, { color: colors.buttonText }]}
                  >
                    {discountPercentage}
                  </Text>
                </View>
              )}
            </View>

            <View style={overlayStyle}>
              <Text
                style={[styles.productName, { color: colors.textColor }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <View style={styles.priceContainer}>
                <Text style={[styles.productPrice, { color: colors.button }]}>
                  AF {item.discountedPrice || item.price}
                </Text>

                {item.originalPrice && item.discountedPrice && (
                  <Text
                    style={[
                      styles.originalPrice,
                      { color: colors.deleteButton },
                    ]}
                  >
                    AF {item.originalPrice}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.image === nextProps.item.image &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.discountedPrice === nextProps.item.discountedPrice &&
      prevProps.item.originalPrice === nextProps.item.originalPrice &&
      prevProps.item.discountEndAt === nextProps.item.discountEndAt &&
      prevProps.isDarkTheme === nextProps.isDarkTheme
    );
  }
);

const SaleProductsList = ({ data }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();
  const { width } = useWindowDimensions();
  const [saleProducts, setSaleProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const itemWidth = useMemo(
    () => (width > 550 ? width / 3 - 24 : width / 2 - 24),
    [width]
  );

  const handleProductPress = useCallback(
    (productId) => {
      router.navigate({
        pathname: "/screens/ProductDetail",
        params: { id: productId },
      });
    },
    [router]
  );

  const handleViewAllPress = useCallback(() => {
    router.navigate({
      pathname: "/screens/AllSaleProducts",
    });
  }, [router]);

  useEffect(() => {
    try {
      if (data?.data) {
        // Map the data according to the provided structure
        const formattedProducts = data.data.map((product) => ({
          id: product.products_id.toString(),
          name: product.title,
          price: product.original_price,
          discountedPrice: product.discounted_price,
          originalPrice: product.original_price,
          discountTitle: product.discount_title,
          discountValue: product.value,
          discountEndAt: product.discount_end_at,
          type: product.type,
          // Use the first image from the product_images array if available
          image: product.product_images?.[0] || null,
        }));

        setSaleProducts(formattedProducts);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error processing sale products:", err);
      setError("Failed to load products");
      setLoading(false);
    }
  }, [data]);

  const renderItem = useCallback(
    ({ item }) => {
      if (item === "viewAll") {
        return (
          <ViewAllCard
            onPress={handleViewAllPress}
            isDarkTheme={isDarkTheme}
            colors={colors}
          />
        );
      }

      return (
        <ProductItem
          item={item}
          onPress={handleProductPress}
          isDarkTheme={isDarkTheme}
          colors={colors}
        />
      );
    },
    [handleProductPress, handleViewAllPress, isDarkTheme, colors]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textColor }]}>
          No sale products found
        </Text>
      </View>
    ),
    [colors.textColor]
  );

  const dataWithViewAll = useMemo(() => {
    if (saleProducts.length === 0) return [];
    return [...saleProducts, "viewAll"];
  }, [saleProducts]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            Hot Deals
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.button} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            Hot Deals
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.deleteButton }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.retryText, { color: colors.background }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: colors.deleteButton }]}>
          Hot Deals
        </Text>
        {data.total > 10 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAllPress}
          >
            <Text style={[styles.viewAllText, { color: colors.button }]}>
              View All
            </Text>
            <Feather name="chevron-right" size={16} color={colors.button} />
          </TouchableOpacity>
        )}
      </View>
      <FlashList
        horizontal
        data={data.total > 10 ? dataWithViewAll : saleProducts}
        renderItem={renderItem}
        keyExtractor={(item) =>
          typeof item === "string" ? "view-all" : `product-${item.id}`
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        estimatedItemSize={itemWidth + 12}
        getItemLayout={(data, index) => ({
          length: itemWidth + 12,
          offset: (itemWidth + 12) * index,
          index,
        })}
        refreshing={refreshing}
        ListEmptyComponent={renderEmptyComponent}
        extraData={isDarkTheme} // Ensure re-render when theme changes
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  // Wrapper to allow shadow to be visible
  cardWrapper: {
    marginRight: 12,
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  productCard: {
    width: 170,
    height: 200,
    borderRadius: 16,
    // Remove overflow: hidden to allow shadow to be visible
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  viewAllCard: {
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllCardText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden", // Keep overflow hidden only for the image container
    height: "100%",
  },
  imageWrapper: {
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: "100%",
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  placeholderImage: {
    width: "100%",
    borderRadius: 16,
    height: "100%",
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: "400",
    textDecorationLine: "line-through",
    marginLeft: 6,
    color: "#888",
  },
  // Container for both timer and discount badge
  badgesContainer: {
    position: "absolute",
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 5,
    flex: 1,
    width: "100%",
  },
  // Timer badge styling
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    // flex: 1,
  },
  timerText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },
  discountBadge: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    position: "absolute",
    right: 5,
  },
  discountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  loadingContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default memo(SaleProductsList);
