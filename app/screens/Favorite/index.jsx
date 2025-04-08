import { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  RefreshControl,
  ToastAndroid,
  Platform,
} from "react-native";
import { useTheme, Surface, Chip } from "react-native-paper";
import { Link, useNavigation, useRouter } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";
import FavoriteProductPlaceholder from "../../../components/skeleton/FavoriteSkeleton";
import { FlashList } from "@shopify/flash-list";

const FavoriteProductPage = () => {
  const {
    user,
    removeFavorite,
    favProducts,
    addToCart,
    cartItems,
    fetchFavProducts,
  } = useProductStore();
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loadingStates, setLoadingStates] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showActionSheetWithOptions } = useActionSheet();
  const { isDarkTheme } = useThemeStore();
  const router = useRouter();

  // Memoize placeholder data to avoid recreating on each render
  const placeholderData = useMemo(
    () =>
      Array(4)
        .fill()
        .map((_, index) => ({ id: `placeholder-${index}` })),
    []
  );

  // Custom Header Component Embedded - Memoized to prevent unnecessary re-renders
  const CustomHeader = useCallback(
    () => (
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.primary,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Back Button */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.buttonPressed,
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={theme.colors.textColor}
          />
        </Pressable>

        {/* Centered Title */}
        <Text style={[styles.headerTitle, { color: theme.colors.textColor }]}>
          My Favorites
        </Text>

        {/* Cart Icon */}
        <Pressable
          onPress={() => router.navigate("/screens/Cart")}
          style={({ pressed }) => [
            styles.headerIcon,
            pressed && styles.buttonPressed,
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="cart-outline"
            size={24}
            color={theme.colors.textColor}
          />
          {cartItems?.length > 0 && (
            <View
              style={[
                styles.cartBadge,
                { backgroundColor: theme.colors.deleteButton },
              ]}
            >
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </Pressable>
      </View>
    ),
    [navigation, cartItems?.length, theme.colors, insets.top, router]
  );

  // Set custom header
  useEffect(() => {
    navigation.setOptions({
      header: () => <CustomHeader />,
    });
  }, [navigation, CustomHeader]);

  // Fetch favorites with loading state
  useEffect(() => {
    let isMounted = true;
    const loadFavorites = async () => {
      if (!user?.consumer_id) return;

      setIsLoading(true);
      try {
        await fetchFavProducts(user.consumer_id);
      } catch (error) {
        if (isMounted) {
          const message =
            Platform.OS === "android"
              ? ToastAndroid.show(
                  "Failed to load favorites",
                  ToastAndroid.SHORT
                )
              : console.warn("Failed to load favorites");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [user?.consumer_id, fetchFavProducts]);

  const onRefresh = useCallback(async () => {
    if (!user?.consumer_id) return;

    setRefreshing(true);
    try {
      await fetchFavProducts(user.consumer_id);
    } catch (error) {
      const message =
        Platform.OS === "android"
          ? ToastAndroid.show("Failed to refresh favorites", ToastAndroid.SHORT)
          : console.warn("Failed to refresh favorites");
    } finally {
      setRefreshing(false);
    }
  }, [user?.consumer_id, fetchFavProducts]);

  const handleRemoveFav = useCallback(
    async (favId) => {
      if (!user?.consumer_id) return;

      const favItem = favProducts.find((item) => item.product_fav_id === favId);
      if (favItem) {
        setLoadingStates((prev) => ({ ...prev, [`remove_${favId}`]: true }));
        try {
          await removeFavorite({
            favId: favItem.product_fav_id,
            consumerID: user.consumer_id,
          });

          const message =
            Platform.OS === "android"
              ? ToastAndroid.show(
                  `${favItem.name} removed from favorites`,
                  ToastAndroid.SHORT
                )
              : console.log(`${favItem.name} removed from favorites`);
        } catch (error) {
          const message =
            Platform.OS === "android"
              ? ToastAndroid.show(
                  "Failed to remove from favorites",
                  ToastAndroid.SHORT
                )
              : console.warn("Failed to remove from favorites");
        } finally {
          setLoadingStates((prev) => ({ ...prev, [`remove_${favId}`]: false }));
        }
      }
    },
    [favProducts, removeFavorite, user?.consumer_id]
  );

  const handleAddToCart = useCallback(
    async (product) => {
      if (!user?.consumer_id) return;

      setLoadingStates((prev) => ({
        ...prev,
        [`cart_${product.products_id}`]: true,
      }));
      try {
        await addToCart({
          productID: product.products_id,
          consumerID: user.consumer_id,
        });

        const message =
          Platform.OS === "android"
            ? ToastAndroid.show(
                `${product.name} added to cart`,
                ToastAndroid.SHORT
              )
            : console.log(`${product.name} added to cart`);
      } catch (error) {
        const message =
          Platform.OS === "android"
            ? ToastAndroid.show("Failed to add to cart", ToastAndroid.SHORT)
            : console.warn("Failed to add to cart");
      } finally {
        setLoadingStates((prev) => ({
          ...prev,
          [`cart_${product.products_id}`]: false,
        }));
      }
    },
    [addToCart, user?.consumer_id]
  );

  const handleLongPress = useCallback(
    (item) => {
      const isInCart = cartItems?.some(
        (cartItem) => cartItem.products_id === item.products_id
      );

      const options = [
        isInCart ? "Already in cart" : "Add to cart",
        "Remove from favorites",
        "Cancel",
      ];

      const destructiveButtonIndex = 1;
      const cancelButtonIndex = 2;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          tintColor: theme.colors.textColor,
          containerStyle: {
            backgroundColor: theme.colors.primary,
            borderTopRightRadius: 16,
            borderTopLeftRadius: 16,
          },
        },
        (buttonIndex) => {
          if (buttonIndex === 0 && !isInCart) {
            handleAddToCart(item);
          } else if (buttonIndex === 1) {
            handleRemoveFav(item.product_fav_id);
          }
        }
      );
    },
    [
      handleAddToCart,
      handleRemoveFav,
      cartItems,
      showActionSheetWithOptions,
      theme.colors,
    ]
  );

  // Memoize the item renderer for better performance
  const renderFavoriteItem = useCallback(
    ({ item }) => {
      if (isLoading) {
        return <FavoriteProductPlaceholder />;
      }

      return (
        <Surface
          style={[
            styles.productCard,
            { backgroundColor: theme.colors.primary },
          ]}
          elevation={3}
        >
          <Link
            href={{
              pathname: "/screens/ProductDetail",
              params: { idFromFavorite: item.products_id },
            }}
            asChild
          >
            <Pressable
              style={styles.productContent}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={300}
              android_ripple={{ color: "rgba(0,0,0,0.1)" }}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={
                    isDarkTheme
                      ? require("../../../assets/images/darkImagePlaceholder.jpg")
                      : require("../../../assets/images/imageSkeleton.jpg")
                  }
                  style={styles.productImage}
                  resizeMode="cover"
                />
                {item.discount && (
                  <View
                    style={[
                      styles.discountBadge,
                      { backgroundColor: theme.colors.deleteButton },
                    ]}
                  >
                    <Text style={styles.discountText}>-{item.discount}%</Text>
                  </View>
                )}
              </View>
              <View style={styles.productInfo}>
                <Text
                  style={[
                    styles.productName,
                    { color: theme.colors.textColor },
                  ]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <View style={styles.priceContainer}>
                  <Text
                    style={[
                      styles.productPrice,
                      { color: theme.colors.button },
                    ]}
                  >
                    AF {item.price}
                  </Text>
                  {item.originalPrice && (
                    <Text
                      style={[
                        styles.originalPrice,
                        { color: theme.colors.inactiveColor },
                      ]}
                    >
                      AF {item.originalPrice}
                    </Text>
                  )}
                </View>
                <View style={styles.chipRow}>
                  <Chip
                    style={[
                      styles.categoryChip,
                      { backgroundColor: theme.colors.subInactiveColor },
                    ]}
                    textStyle={{
                      fontSize: 12,
                      color: theme.colors.textColor,
                    }}
                  >
                    {item.system_name}
                  </Chip>
                </View>
              </View>
            </Pressable>
          </Link>
        </Surface>
      );
    },
    [
      handleLongPress,
      theme.colors,
      cartItems,
      isDarkTheme,
      loadingStates,
      handleAddToCart,
      handleRemoveFav,
      isLoading,
    ]
  );

  // Memoize the empty state component
  const EmptyState = useCallback(
    () => (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <MaterialCommunityIcons
          name="heart-off-outline"
          size={80}
          color={theme.colors.error}
        />
        <Text style={[styles.emptyTitle, { color: theme.colors.textColor }]}>
          No favorites yet
        </Text>
      </View>
    ),
    [theme.colors, navigation]
  );

  // Memoize the key extractor
  const keyExtractor = useCallback(
    (item) => (isLoading ? item.id : item.product_fav_id.toString()),
    [isLoading]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <FlashList
        data={isLoading ? placeholderData : favProducts}
        keyExtractor={keyExtractor}
        renderItem={renderFavoriteItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={!isLoading && <EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.button]}
            progressBackgroundColor={theme.colors.surface}
            tintColor={theme.colors.button}
          />
        }
        showsVerticalScrollIndicator={false}
        estimatedItemSize={156} // For FlashList performance
        removeClippedSubviews={true} // Improve memory usage
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
      />
    </View>
  );
};

export default FavoriteProductPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 80,
    elevation: 5,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  buttonPressed: {
    opacity: 0.7,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  headerIcon: {
    padding: 8,
    borderRadius: 20,
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 20,
  },
  productCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  productContent: {
    flexDirection: "row",
  },
  imageContainer: {
    width: 120,
    height: 140,
  },
  productImage: {
    width: 120,
    height: 140,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  productInfo: {
    flex: 1,
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "800",
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: "400",
    textDecorationLine: "line-through",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: "flex-start",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  inCartChip: {
    alignSelf: "flex-start",
    borderRadius: 8,
    height: 24,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    minHeight: 600,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  browseButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
});
