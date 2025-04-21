// Optimized ProductList.tsx (without reducers)
import React, {
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  memo,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  ToastAndroid,
  Pressable,
  RefreshControl,
} from "react-native";
import {
  Link,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useTheme } from "react-native-paper";
import { FontAwesome, Feather, MaterialIcons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";
import AlertDialog from "../../../components/ui/AlertDialog";
import useProductStore from "../../../components/api/useProductStore";
import useThemeStore from "../../../components/store/useThemeStore";

// --- Product Item Component ---
const ProductItem = memo(
  ({
    item,
    theme,
    isDarkTheme,
    onLongPress,
    onAddToCart,
    onShare,
    isInCart,
    renderRatingStars,
    router,
  }) => {
    if (!item) return null;

    const imageSource =
      item.product_images && item.product_images.length
        ? { uri: item.product_images[0] }
        : isDarkTheme
        ? require("../../../assets/images/darkImagePlaceholder.jpg")
        : require("../../../assets/images/imageSkeleton.jpg");

    return (
      <View style={styles.itemContainer}>
        <Pressable
          onLongPress={() => onLongPress(item)}
          delayLongPress={500}
          android_ripple={{ color: theme.colors.ripple }}
          onPress={() =>
            router.navigate({
              pathname: "/screens/ProductDetail",
              params: { id: item.products_id },
            })
          }
        >
          <View
            style={[styles.listItem, { backgroundColor: theme.colors.primary }]}
          >
            <Image
              source={imageSource}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productInfo}>
              <Text
                style={[styles.productTitle, { color: theme.colors.textColor }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View style={styles.brandContainer}>
                <Text
                  style={[styles.brand, { color: theme.colors.textColor }]}
                  numberOfLines={1}
                >
                  Brand: {item.brand_title}
                </Text>
              </View>
              <View style={styles.bottomRow}>
                <Text
                  style={[styles.productPrice, { color: theme.colors.button }]}
                >
                  AF {item.spu}
                </Text>
                {renderRatingStars(item)}
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: theme.colors.button,
                    opacity: isInCart ? 0.6 : 1,
                  },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (!isInCart) onAddToCart(item);
                }}
                activeOpacity={0.7}
                disabled={isInCart}
              >
                {isInCart ? (
                  <Feather name="check-circle" size={16} color="white" />
                ) : (
                  <Feather name="shopping-cart" size={16} color="white" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: theme.colors.button },
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  onShare(item);
                }}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }
);

// --- List Skeleton Component ---
const ListSkeleton = memo(({ theme }) => (
  <View style={[styles.listItem, { backgroundColor: theme.colors.primary }]}>
    <View
      style={[
        styles.productImage,
        { backgroundColor: theme.colors.background },
      ]}
    />
    <View style={styles.productInfo}>
      <View
        style={[
          styles.skeletonText,
          { backgroundColor: theme.colors.background },
        ]}
      />
      <View
        style={[
          styles.skeletonTextSmall,
          { backgroundColor: theme.colors.background },
        ]}
      />
      <View style={styles.bottomRow}>
        <View
          style={[
            styles.skeletonPrice,
            { backgroundColor: theme.colors.background },
          ]}
        />
      </View>
    </View>
    <View style={styles.actionButtons}>
      <View
        style={[
          styles.iconButton,
          { backgroundColor: theme.colors.background },
        ]}
      />
      <View
        style={[
          styles.iconButton,
          { backgroundColor: theme.colors.background },
        ]}
      />
    </View>
  </View>
));

// --- Custom Hook for Alert Dialog ---
const useAlertDialog = () => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Ok",
    confirmAction: () => {},
  });

  const hideAlert = useCallback(
    () => setAlertState((prev) => ({ ...prev, visible: false })),
    []
  );
  const showAlert = useCallback(
    (title, message, confirmAction, confirmText = "Ok") => {
      setAlertState({
        visible: true,
        title,
        message,
        confirmAction: confirmAction || hideAlert,
        confirmText,
      });
    },
    [hideAlert]
  );

  return { alertState, showAlert, hideAlert };
};

// --- MAIN COMPONENT ---
const ProductList = () => {
  const navigation = useNavigation();
  const { subcategoryId, subCategorieName } = useLocalSearchParams();
  const {
    fetchProductsBySubcategory,
    addToCart,
    user,
    cartItem,
    error: storeError,
  } = useProductStore();
  const { isDarkTheme } = useThemeStore();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const router = useRouter();
  const flatListRef = useRef(null);
  const { alertState, showAlert, hideAlert } = useAlertDialog();

  // Local states (no reducers)
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState([]);
  const [error, setError] = useState(null);

  // Set header options
  useLayoutEffect(() => {
    navigation.setOptions({
      title: subCategorieName,
    });
  }, [navigation, subCategorieName]);

  // Load products helper
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProductsBySubcategory(subcategoryId);
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, [subcategoryId, fetchProductsBySubcategory]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchProductsBySubcategory(subcategoryId);
      setProducts(data);
    } catch (err) {
      console.error("Failed to refresh products:", err);
      setError(err.message || "Failed to refresh products");
    } finally {
      setRefreshing(false);
    }
  }, [subcategoryId, fetchProductsBySubcategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Check if product is in cart or being added
  const isInCart = useCallback(
    (item) => {
      if (!item) return false;
      return (
        (cartItem &&
          cartItem.some(
            (ci) => ci.products_id.toString() === item.products_id.toString()
          )) ||
        addingToCart.includes(item.products_id)
      );
    },
    [cartItem, addingToCart]
  );

  // Handler for adding a product to the cart
  const handleAddToCart = useCallback(
    async (product) => {
      if (!user) {
        return showAlert(
          "Login Required",
          "Please log in to add products to your cart.",
          () => router.replace("Login"),
          "Log In"
        );
      }

      if (cartItem.some((i) => i.products_id === product.products_id)) {
        return showAlert(
          "Product already in cart",
          "This product is already in your cart.",
          () => router.navigate("screens/Cart"),
          "Go to Cart"
        );
      }

      try {
        setAddingToCart((prev) => [...prev, product.products_id]);
        ToastAndroid.show("Product added to cart", ToastAndroid.SHORT);
        await addToCart({
          productID: product.products_id,
          consumerID: user.consumer_id,
        });
      } catch (err) {
        showAlert(
          "Error",
          err.message || "Error adding product to cart",
          undefined,
          "Ok"
        );
      } finally {
        setAddingToCart((prev) =>
          prev.filter((id) => id !== product.products_id)
        );
      }
    },
    [user, cartItem, addToCart, router, showAlert]
  );

  // Handler to share a product
  const shareProduct = useCallback(async (product) => {
    try {
      await Share.share({
        message: `Check out this product: ${product.title}`,
        url: product.product_url,
      });
    } catch (err) {
      console.error("Error sharing product:", err);
    }
  }, []);

  // Show action sheet with product options
  const showProductOptions = useCallback(
    (product) => {
      const options = ["Add to Cart", "Share", "Cancel"];
      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
          tintColor: theme.colors.button,
          containerStyle: { backgroundColor: theme.colors.primary },
          textStyle: { color: theme.colors.textColor },
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleAddToCart(product);
          else if (buttonIndex === 1) shareProduct(product);
        }
      );
    },
    [handleAddToCart, shareProduct, theme, showActionSheetWithOptions]
  );

  // Render rating stars for a product
  const renderRatingStars = useCallback(
    (item) => {
      if (!item?.average_rating) return null;
      return (
        <View style={styles.ratingContainer}>
          <FontAwesome
            name="star"
            size={12}
            color="#FFD700"
            style={styles.starIcon}
          />
          <Text
            style={{
              color: theme.colors.textColor,
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            {item.average_rating}
          </Text>
        </View>
      );
    },
    [theme]
  );

  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // FlatList key extractor
  const keyExtractor = useCallback(
    (item, index) => (item ? item.products_id.toString() : `skeleton-${index}`),
    []
  );

  // Render each product or skeleton if loading
  const renderItem = useCallback(
    ({ item }) => {
      if (isLoading) return <ListSkeleton theme={theme} />;
      return (
        <ProductItem
          item={item}
          theme={theme}
          isDarkTheme={isDarkTheme}
          onLongPress={showProductOptions}
          onAddToCart={handleAddToCart}
          onShare={shareProduct}
          renderRatingStars={renderRatingStars}
          isInCart={isInCart(item)}
          router={router}
        />
      );
    },
    [
      isLoading,
      theme,
      isDarkTheme,
      showProductOptions,
      handleAddToCart,
      shareProduct,
      renderRatingStars,
      isInCart,
    ]
  );

  // Render error state if needed
  if (error || storeError) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <MaterialIcons name="error-outline" size={48} color="#FF6B6B" />
        <Text style={[styles.errorText, { color: theme.colors.textColor }]}>
          {error || storeError}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.button }]}
          onPress={loadProducts}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <FlatList
        ref={flatListRef}
        data={isLoading ? Array(8).fill(null) : products}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: 110,
          offset: 110 * index,
          index,
        })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.button]}
            tintColor={theme.colors.button}
            progressBackgroundColor={theme.colors.primary}
          />
        }
      />
      {products.length > 15 && (
        <TouchableOpacity
          style={[
            styles.scrollTopButton,
            { backgroundColor: theme.colors.button },
          ]}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <MaterialIcons name="keyboard-arrow-up" size={24} color="white" />
        </TouchableOpacity>
      )}
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

export default memo(ProductList);

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: { fontSize: 16, marginVertical: 16, textAlign: "center" },
  retryButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontWeight: "600" },
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },
  itemContainer: {},
  listItem: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    height: 100,
    alignItems: "center",
    marginBottom: 10,
  },
  productImage: { width: 90, height: 100 },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 18,
  },
  brandContainer: { marginVertical: 2 },
  brand: { fontSize: 12 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPrice: { fontSize: 14, fontWeight: "bold" },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 10,
  },
  starIcon: { marginRight: 2 },
  actionButtons: {
    flexDirection: "column",
    justifyContent: "space-between",
    height: "70%",
    marginRight: 8,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollTopButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Skeleton styles
  skeletonText: { height: 14, width: "80%", borderRadius: 4, marginBottom: 8 },
  skeletonTextSmall: {
    height: 12,
    width: "50%",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonPrice: { height: 14, width: 60, borderRadius: 4 },
});
