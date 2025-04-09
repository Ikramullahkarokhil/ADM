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
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import useProductStore from "../api/useProductStore";
import useThemeStore from "../store/useThemeStore";
import { Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

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

    return (
      <Pressable style={styles.productCard} onPress={handlePress}>
        <View style={styles.imageContainer}>
          <ProductImage
            source={item.image ? { uri: item.image } : null}
            isDarkTheme={isDarkTheme}
            style={styles.productImage}
          />
          <View style={overlayStyle}>
            <Text
              style={[styles.productName, { color: colors.textColor }]}
              numberOfLines={1}
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
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.image === nextProps.item.image &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.isDarkTheme === nextProps.isDarkTheme &&
      prevProps.colors.textColor === nextProps.colors.textColor &&
      prevProps.colors.button === nextProps.colors.button
    );
  }
);

const NewArrivals = ({ data }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { fetchNewArrivals } = useProductStore();
  const { isDarkTheme } = useThemeStore();
  const { width } = useWindowDimensions();
  const [newArrivalProducts, setNewArrivalProducts] = useState([]);
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
      pathname: "/screens/AllNewArrivals",
      params: { category: "new-arrivals" },
    });
  }, [router]);

  useEffect(() => {
    try {
      if (data?.data) {
        const formattedProducts = data.data.map((product) => ({
          id: product.products_id.toString(),
          name: product.title,
          price: product.spu,
          image: product.product_images?.[0] || null,
        }));

        // Only update state if products actually changed
        setNewArrivalProducts((prev) => {
          const prevIds = prev.map((p) => p.id);
          const newIds = formattedProducts.map((p) => p.id);
          if (JSON.stringify(prevIds) === JSON.stringify(newIds)) {
            return prev;
          }
          return formattedProducts;
        });
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching new arrival products:", err);
      setError("Failed to load products");
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
          No new arrivals found
        </Text>
      </View>
    ),
    [colors.textColor]
  );

  const dataWithViewAll = useMemo(() => {
    if (newArrivalProducts.length === 0) return [];
    return [...newArrivalProducts, "viewAll"];
  }, [newArrivalProducts]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            New Arrivals
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
            New Arrivals
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.deleteButton }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadProducts}
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
        <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
          New Arrivals
        </Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={handleViewAllPress}
        >
          <Text style={[styles.viewAllText, { color: colors.button }]}>
            View All
          </Text>
          <Feather name="chevron-right" size={16} color={colors.button} />
        </TouchableOpacity>
      </View>
      <FlashList
        horizontal
        data={dataWithViewAll}
        renderItem={renderItem}
        keyExtractor={(item) =>
          typeof item === "string" ? "view-all" : `product-${item.id}`
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingVertical: 20,
          paddingHorizontal: 16,
        }}
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
    paddingBottom: 8,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
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
  productsList: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 24,
    paddingTop: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 210,
  },
  productCard: {
    width: 170,
    height: 210,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
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

export default memo(NewArrivals);
