import { useEffect, useState, useCallback, memo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter, useNavigation } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import useThemeStore from "../../../components/store/useThemeStore";

// ProductImage component with improved loading strategy
const ProductImage = memo(({ source, isDarkTheme, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef(null);

  const placeholderImage = isDarkTheme
    ? require("../../../assets/images/darkImagePlaceholder.jpg")
    : require("../../../assets/images/imageSkeleton.jpg");

  // Preload images when component mounts
  useEffect(() => {
    if (source && source.uri) {
      Image.prefetch(source.uri).catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
    }
  }, [source]);

  return (
    <View style={[style, styles.imageWrapper]}>
      {(isLoading || hasError) && (
        <Image
          source={placeholderImage}
          style={styles.placeholderImage}
          resizeMode="cover"
        />
      )}
      {source && source.uri && (
        <Image
          ref={imageRef}
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          // Add fade-in effect for smoother transitions
          fadeDuration={300}
        />
      )}
    </View>
  );
});

// ProductItem component with optimized press handling
const ProductItem = memo(({ item, onPress, isDarkTheme, width }) => {
  const { colors } = useTheme();

  // Memoize the onPress handler for each item
  const handlePress = useCallback(() => {
    onPress(item.id.split("-")[0]);
  }, [item.id, onPress]);

  return (
    <Pressable
      style={[styles.productCard, { width: width }]}
      onPress={handlePress}
      android_ripple={{
        color: isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      }}
      // Add haptic feedback for better UX
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.imageContainer}>
        <ProductImage
          source={item.image ? { uri: item.image } : null}
          isDarkTheme={isDarkTheme}
          style={styles.productImage}
        />
        <View
          style={[
            styles.titleOverlay,
            {
              backgroundColor: isDarkTheme
                ? "rgba(0, 0, 0, 0.7)"
                : "rgba(255, 255, 255, 0.7)",
            },
          ]}
        >
          <Text
            style={[styles.productName, { color: colors.textColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text style={[styles.productPrice, { color: colors.button }]}>
            AF {item.price}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const AllNewArrivals = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { fetchNewArrivals } = useProductStore();
  const { isDarkTheme } = useThemeStore();
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Performance optimization refs
  const isMounted = useRef(true);
  const isFetching = useRef(false);
  const lastPageLoaded = useRef(0);
  const flatListRef = useRef(null);
  const timeoutRef = useRef(null);

  // Calculate item width once
  const itemWidth = (width - 48) / 2;

  useEffect(() => {
    navigation.setOptions({
      title: "New Arrivals",
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textColor,
    });

    return () => {
      isMounted.current = false;
      // Clear any pending timeouts on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigation]);

  const handleProductPress = useCallback(
    (productId) => {
      router.navigate({
        pathname: "/screens/ProductDetail",
        params: { idFromFavorite: productId },
      });
    },
    [router]
  );

  // Optimized data fetching with debounce
  const loadProducts = useCallback(
    async (page = 1, isRefreshing = false) => {
      // Prevent duplicate requests
      if (
        isFetching.current ||
        (page === lastPageLoaded.current && !isRefreshing)
      )
        return;

      isFetching.current = true;

      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else if (page > 1) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        setError(null);

        // Simulate network delay for testing
        // const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        // await delay(500);

        const response = await fetchNewArrivals(page);

        if (!isMounted.current) return;

        if (response?.data?.length > 0) {
          // Process data in batches for smoother UI updates
          const formattedProducts = response.data.map((product) => ({
            id: `${product.products_id}-${page}`, // Include page in ID to ensure uniqueness
            name: product.title,
            price: product.spu,
            image: product.product_images?.[0] || null,
          }));

          // Update state with batched data
          setProducts((prev) =>
            isRefreshing ? formattedProducts : [...prev, ...formattedProducts]
          );

          setCurrentPage(page);
          setHasMoreData(response.current_page < response.last_page);
          lastPageLoaded.current = page;

          // Prefetch next page if available
          if (response.current_page < response.last_page) {
            timeoutRef.current = setTimeout(() => {
              fetchNewArrivals(page + 1);
            }, 2000);
          }
        } else {
          setHasMoreData(false);
          if (isRefreshing) {
            setProducts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products");
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);

          // Add a small delay before allowing new fetches
          // to prevent rapid consecutive requests
          setTimeout(() => {
            isFetching.current = false;
          }, 300);
        }
      }
    },
    [fetchNewArrivals]
  );

  // Optimized load more with throttling and debounce
  const handleLoadMore = useCallback(() => {
    if (hasMoreData && !loadingMore && !refreshing && !isFetching.current) {
      // Debounce the load more action
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        loadProducts(currentPage + 1);
      }, 150);
    }
  }, [hasMoreData, loadingMore, refreshing, currentPage, loadProducts]);

  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      loadProducts(1, true);
    }
  }, [loadProducts, refreshing]);

  // Initial load
  useEffect(() => {
    loadProducts(1);
  }, []);

  // Memoized render functions for FlatList
  const renderItem = useCallback(
    ({ item }) => (
      <ProductItem
        item={item}
        onPress={handleProductPress}
        isDarkTheme={isDarkTheme}
        width={itemWidth}
      />
    ),
    [handleProductPress, isDarkTheme, itemWidth]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textColor }]}>
          {loading ? "Loading..." : "No new arrivals found"}
        </Text>
      </View>
    ),
    [colors.textColor, loading]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={colors.button} />
        <Text style={[styles.footerText, { color: colors.textColor }]}>
          Loading more products...
        </Text>
      </View>
    );
  }, [loadingMore, colors]);

  // Memoize key extractor
  const keyExtractor = useCallback((item) => item.id, []);

  // Memoize getItemLayout for even better performance
  const getItemLayout = useCallback(
    (data, index) => ({
      length: 210,
      offset: 210 * Math.floor(index / 2) + Math.floor(index / 2) * 16,
      index,
    }),
    []
  );

  if (loading && !refreshing && products.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.button} />
        </View>
      </View>
    );
  }

  if (error && products.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.deleteButton }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadProducts(1)}
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
    <View style={[styles.fullContainer, { backgroundColor: colors.primary }]}>
      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.productsGrid,
          products.length === 0 && styles.emptyList,
        ]}
        columnWrapperStyle={styles.row}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={renderEmptyComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        getItemLayout={getItemLayout}
        // Improve scrolling performance
        scrollEventThrottle={16}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />

      {error && products.length > 0 && (
        <View style={styles.errorOverlay}>
          <Text style={[styles.errorText, { color: colors.deleteButton }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadProducts(currentPage + 1)}
          >
            <Text style={[styles.retryText, { color: colors.background }]}>
              Retry Loading More
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  productsGrid: {
    padding: 16,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  productCard: {
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // Reduced elevation for better performance
    backgroundColor: "transparent", // Add transparent background for ripple effect
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
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
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  footerContainer: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  footerText: {
    fontSize: 14,
    marginLeft: 8,
  },
  errorOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
});

export default AllNewArrivals;
