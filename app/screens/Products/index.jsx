// Optimized ProductList.tsx

import React, {
  useEffect,
  useCallback,
  useReducer,
  useLayoutEffect,
  useRef,
  memo,
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
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import { FontAwesome, Feather, MaterialIcons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";
import AlertDialog from "../../../components/ui/AlertDialog";
import useThemeStore from "../../../components/store/useThemeStore";

// 1. Extract and memoize ProductItem component
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
  }) => {
    if (!item) return null;

    return (
      <View style={styles.itemContainer}>
        <Link
          href={{
            pathname: "/screens/ProductDetail",
            params: {
              id: item.products_id,
            },
          }}
          asChild
        >
          <Pressable
            onLongPress={() => onLongPress(item)}
            delayLongPress={500}
            android_ripple={{ color: theme.colors.ripple }}
          >
            <View
              style={[
                styles.listItem,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <Image
                source={
                  item.product_images && item.product_images.length > 0
                    ? { uri: item.product_images[0] }
                    : isDarkTheme
                    ? require("../../../assets/images/darkImagePlaceholder.jpg")
                    : require("../../../assets/images/imageSkeleton.jpg")
                }
                style={styles.productImage}
                resizeMode="cover"
              />

              <View style={styles.productInfo}>
                <Text
                  style={[
                    styles.productTitle,
                    { color: theme.colors.textColor },
                  ]}
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
                    style={[
                      styles.productPrice,
                      { color: theme.colors.button },
                    ]}
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
                    if (!isInCart) {
                      onAddToCart(item);
                    }
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
        </Link>
      </View>
    );
  }
);

// 2. Extract and memoize ListSkeleton component
const ListSkeleton = memo(({ theme }) => (
  <View
    style={[
      styles.listItem,
      {
        backgroundColor: theme.colors.primary,
      },
    ]}
  >
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

// 3. Create a custom hook for alert dialog
const useAlertDialog = () => {
  const [alertState, setAlertState] = React.useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Ok",
    confirmAction: () => {},
  });

  const showAlert = useCallback(
    (title, message, confirmAction, confirmText = "Ok") => {
      setAlertState({
        visible: true,
        title,
        message,
        confirmAction: confirmAction || (() => hideAlert()),
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

// 4. Create a reducer for state management
const initialState = {
  products: [],
  isLoading: true,
  refreshing: false,
  addingToCart: [],
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        products: action.payload,
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "REFRESH_START":
      return { ...state, refreshing: true };
    case "REFRESH_END":
      return { ...state, refreshing: false };
    case "ADD_TO_CART_START":
      return {
        ...state,
        addingToCart: [...state.addingToCart, action.payload],
      };
    case "ADD_TO_CART_END":
      return {
        ...state,
        addingToCart: state.addingToCart.filter((id) => id !== action.payload),
      };
    default:
      return state;
  }
}

// Main component
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isDarkTheme } = useThemeStore();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const router = useRouter();
  const flatListRef = useRef(null);

  // Use custom hook for alert dialog
  const { alertState, showAlert, hideAlert } = useAlertDialog();

  // Destructure state for readability
  const { products, isLoading, refreshing, addingToCart, error } = state;

  // Update header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: subCategorieName,
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, subCategorieName, theme]);

  // Load products
  const loadProducts = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const data = await fetchProductsBySubcategory(subcategoryId);
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      console.error("Failed to fetch products:", err);
      dispatch({
        type: "FETCH_ERROR",
        payload: err.message || "Failed to load products",
      });
    }
  }, [subcategoryId, fetchProductsBySubcategory]);

  // Check if product is in cart
  const isInCart = useCallback(
    (item) => {
      if (!item) return false;
      return (
        (cartItem &&
          cartItem.some(
            (cartItem) =>
              cartItem.products_id.toString() === item.products_id.toString()
          )) ||
        addingToCart.includes(item.products_id)
      );
    },
    [cartItem, addingToCart]
  );

  // Refresh products
  const onRefresh = useCallback(async () => {
    dispatch({ type: "REFRESH_START" });
    try {
      const data = await fetchProductsBySubcategory(subcategoryId);
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      console.error("Failed to refresh products:", err);
      dispatch({
        type: "FETCH_ERROR",
        payload: err.message || "Failed to refresh products",
      });
    } finally {
      dispatch({ type: "REFRESH_END" });
    }
  }, [subcategoryId, fetchProductsBySubcategory]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Add to cart handler
  const handleAddToCart = useCallback(
    async (product) => {
      if (!user) {
        showAlert(
          "Login Required",
          "Please log in to add products to your cart.",
          () => router.replace("Login"),
          "Log In"
        );
        return;
      }

      // Check if the product is already in the cart
      if (cartItem.some((item) => item.products_id === product.products_id)) {
        showAlert(
          "Product already in cart",
          "This product is already in your cart.",
          () => router.navigate("screens/Cart"),
          "Go to Cart"
        );
        return;
      }

      try {
        // Mark this product as being added to cart
        dispatch({ type: "ADD_TO_CART_START", payload: product.products_id });

        // Show success message
        ToastAndroid.show("Product added to cart", ToastAndroid.SHORT);

        await addToCart({
          productID: product.products_id,
          consumerID: user.consumer_id,
        });
      } catch (error) {
        showAlert(
          "Error",
          error.message || "Error adding product to cart",
          null,
          "Ok"
        );
      } finally {
        dispatch({ type: "ADD_TO_CART_END", payload: product.products_id });
      }
    },
    [user, cartItem, addToCart, router, showAlert]
  );

  // Share product handler
  const shareProduct = useCallback(async (product) => {
    try {
      await Share.share({
        message: `Check out this product: ${product.title}`,
        url: product.product_url,
      });
    } catch (error) {
      console.error("Error sharing product:", error);
    }
  }, []);

  // Show product options
  const showProductOptions = useCallback(
    (product) => {
      const options = ["Add to Cart", "Share", "Cancel"];
      const cancelButtonIndex = 2;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          tintColor: theme.colors.button,
          containerStyle: {
            backgroundColor: theme.colors.primary,
          },
          textStyle: {
            color: theme.colors.textColor,
          },
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              handleAddToCart(product);
              break;
            case 1:
              shareProduct(product);
              break;
          }
        }
      );
    },
    [handleAddToCart, shareProduct, theme, showActionSheetWithOptions]
  );

  // Render rating stars
  const renderRatingStars = useCallback(
    (item) => {
      if (!item?.average_rating || item.average_rating === 0) return null;
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

  // Scroll to top
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Optimize FlatList rendering
  const keyExtractor = useCallback(
    (item, index) => (item ? item.products_id.toString() : `skeleton-${index}`),
    []
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      if (isLoading) {
        return <ListSkeleton theme={theme} />;
      }

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

  // Handle error state
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
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 110, // item height + margin
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
            {
              backgroundColor: theme.colors.button,
            },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  messageText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  itemContainer: {
    // marginBottom: 8,
  },
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
  productImage: {
    width: 90,
    height: 100,
    overflow: "hidden",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
    height: "100%",
    paddingVertical: 15,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 18,
  },
  brandContainer: {
    marginVertical: 2,
  },
  brand: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 10,
  },
  starIcon: {
    marginRight: 2,
  },
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
  skeletonText: {
    height: 14,
    width: "80%",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTextSmall: {
    height: 12,
    width: "50%",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonPrice: {
    height: 14,
    width: 60,
    borderRadius: 4,
  },
});

export default memo(ProductList);
