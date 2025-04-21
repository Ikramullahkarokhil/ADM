import { useEffect, useState, useCallback, memo, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Platform,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import useThemeStore from "../../../components/store/useThemeStore";
import { StatusBar } from "expo-status-bar";

// Product Item component optimized with memo
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
    return (
      prevProps.product.products_id === nextProps.product.products_id &&
      prevProps.colors === nextProps.colors &&
      prevProps.isDarkTheme === nextProps.isDarkTheme
    );
  }
);

const ProductsList = () => {
  const { sellerId, listType, title, sellerName } = useLocalSearchParams();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user, fetchSellerNewArivals, fetchSellerAllProducts } =
    useProductStore();
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();

  // Set navigation options
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: sellerName || "Products",
      headerTintColor: colors.buttonText,
      headerStyle: {
        backgroundColor: colors.button,
      },
      headerShadowVisible: false,
    });
  }, [title, navigation, colors]);

  // Load products data
  useEffect(() => {
    if (!sellerId) return;

    const loadProducts = async () => {
      try {
        setLoading(true);

        // Fetch data based on listType
        let productsData;
        if (listType === "newArrivals") {
          const response = await fetchSellerNewArivals({ sellerId: sellerId });
          productsData = response.new_arrivals;
        } else {
          const response = await fetchSellerAllProducts({ sellerId: sellerId });
          productsData = response.all_products;
        }

        if (productsData?.data) {
          setProducts(productsData.data || []);
          setPage(productsData.current_page || 1);
          setHasMore(!!productsData.next_page_url);
        } else {
          setProducts([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error loading products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    loadProducts();
  }, [sellerId, listType]);

  const loadMoreProducts = useCallback(async () => {
    if (!hasMore || loading || !sellerId) return;

    try {
      setLoading(true);
      const nextPage = page + 1;

      let response;
      if (listType === "newArrivals") {
        response = await fetchSellerNewArivals({
          sellerId: sellerId,
          page: nextPage,
        });
      } else {
        response = await fetchSellerAllProducts({
          sellerId: sellerId,
          page: nextPage,
        });
      }

      const productsData =
        listType === "newArrivals"
          ? response.new_arrivals
          : response.all_products;

      if (productsData?.data) {
        setProducts((prev) => [...prev, ...productsData.data]);
        setPage(nextPage);
        setHasMore(!!productsData.next_page_url);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, sellerId, listType, page]);

  const handleProductPress = useCallback((productId) => {
    router.navigate({
      pathname: "/screens/ProductDetail",
      params: { id: productId },
    });
  }, []);

  // Show loading indicator until initial load is complete
  if (!initialLoadComplete) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.primary }]}
      >
        <View>
          <StatusBar style="light" backgroundColor={colors.button} />
          <Text
            style={{
              fontSize: 18,
              padding: 10,
              borderTopWidth: 0.4,
              color: colors.buttonText,
              backgroundColor: colors.button,
              borderTopColor: colors.buttonText,
            }}
          >
            {title}
          </Text>
        </View>
        <View
          style={{ justifyContent: "center", alignItems: "center", flex: 1 }}
        >
          <ActivityIndicator size="large" color={colors.button} />
          <Text style={[styles.loadingText, { color: colors.button }]}>
            Loading products...
          </Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.primary }]}
      >
        <MaterialIcons
          name="shopping-bag"
          size={48}
          color={colors.inactiveColor}
        />
        <Text style={[styles.errorText, { color: colors.textColor }]}>
          No products found
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

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar style={"light"} backgroundColor={colors.button} />

      <Text
        style={{
          fontSize: 18,
          padding: 10,
          borderTopWidth: 0.4,
          color: colors.buttonText,
          backgroundColor: colors.button,
          borderTopColor: colors.buttonText,
        }}
      >
        {title}
      </Text>
      <FlatList
        data={products}
        keyExtractor={(item) => `product-${item.products_id}`}
        numColumns={2}
        renderItem={({ item }) => (
          <ProductItem
            product={item}
            onPress={handleProductPress}
            colors={colors}
            isDarkTheme={isDarkTheme}
          />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.7}
        ListFooterComponent={
          loading && hasMore ? (
            <ActivityIndicator
              size="small"
              color={colors.button}
              style={styles.footerLoader}
            />
          ) : null
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
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
  productItem: {
    flex: 1,
    margin: 8,
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
    height: 150,
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
  footerLoader: {
    marginVertical: 16,
  },
});

export default ProductsList;
