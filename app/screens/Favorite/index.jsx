import { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Image,
  StatusBar,
  RefreshControl,
  ToastAndroid,
  useColorScheme,
} from "react-native";
import { useTheme, Surface, Chip, ActivityIndicator } from "react-native-paper";
import { Link, useNavigation, useRouter } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";

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
  const { showActionSheetWithOptions } = useActionSheet();
  const { isDarkTheme } = useThemeStore();
  const router = useRouter();

  // Use native header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "My Favorites",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,

      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.navigate("/screens/Cart")}
            style={styles.headerIcon}
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
    });
  }, [navigation, cartItems, theme.colors]);

  useEffect(() => {
    if (user?.consumer_id) {
      fetchFavProducts(user.consumer_id);
    }
  }, [user?.consumer_id, fetchFavProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFavProducts(user.consumer_id);
    } catch (error) {
      ToastAndroid.show("Failed to refresh favorites", ToastAndroid.SHORT);
    } finally {
      setRefreshing(false);
    }
  }, [user?.consumer_id, fetchFavProducts]);

  const handleRemoveFav = useCallback(
    async (favId) => {
      const favItem = favProducts.find((item) => item.product_fav_id === favId);
      if (favItem) {
        setLoadingStates((prev) => ({ ...prev, [`remove_${favId}`]: true }));
        try {
          await removeFavorite({
            favId: favItem.product_fav_id,
            consumerID: user.consumer_id,
          });
          ToastAndroid.show(
            `${favItem.name} removed from favorites`,
            ToastAndroid.SHORT
          );
        } catch (error) {
          ToastAndroid.show(
            "Failed to remove from favorites",
            ToastAndroid.SHORT
          );
        } finally {
          setLoadingStates((prev) => ({ ...prev, [`remove_${favId}`]: false }));
        }
      }
    },
    [favProducts, removeFavorite, user?.consumer_id]
  );

  const handleAddToCart = useCallback(
    async (product) => {
      setLoadingStates((prev) => ({
        ...prev,
        [`cart_${product.products_id}`]: true,
      }));
      try {
        await addToCart({
          productID: product.products_id,
          consumerID: user.consumer_id,
        });
        ToastAndroid.show(`${product.name} added to cart`, ToastAndroid.SHORT);
      } catch (error) {
        ToastAndroid.show("Failed to add to cart", ToastAndroid.SHORT);
      } finally {
        setLoadingStates((prev) => ({
          ...prev,
          [`cart_${product.products_id}`]: false,
        }));
      }
    },
    [addToCart, user?.consumer_id]
  );

  // Handle long press to show action sheet
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
            // Add to cart
            handleAddToCart(item);
          } else if (buttonIndex === 1) {
            // Remove from favorites
            handleRemoveFav(item.product_fav_id);
          }
        }
      );
    },
    [handleAddToCart, handleRemoveFav, cartItems, showActionSheetWithOptions]
  );

  const renderFavoriteItem = useCallback(
    ({ item, index }) => {
      const isInCart = cartItems?.some(
        (cartItem) => cartItem.products_id === item.products_id
      );

      return (
        <View>
          <Surface
            style={[
              styles.productCard,
              { backgroundColor: theme.colors.primary },
            ]}
            elevation={5}
          >
            <Link
              href={{
                pathname: "/screens/ProductDetail",
                params: { id: item.products_id },
              }}
              asChild
            >
              <Pressable
                style={styles.productContent}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={300}
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

                    {isInCart && (
                      <Chip
                        style={[
                          styles.inCartChip,
                          { backgroundColor: theme.colors.primary },
                        ]}
                        textStyle={{
                          fontSize: 12,
                          color: theme.colors.textColor,
                        }}
                        icon="check-circle"
                      >
                        In Cart
                      </Chip>
                    )}
                  </View>
                </View>
              </Pressable>
            </Link>
          </Surface>
        </View>
      );
    },
    [handleLongPress, theme.colors, cartItems]
  );

  const EmptyState = () => (
    <View
      style={[styles.emptyContainer, { backgroundColor: theme.colors.primary }]}
    >
      <MaterialCommunityIcons
        name="heart-off-outline"
        size={80}
        color={theme.colors.error}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.textColor }]}>
        No favorites yet
      </Text>
      <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
        Products you mark as favorites will appear here
      </Text>
      <Pressable
        style={[styles.browseButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("Products")}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      >
        <MaterialCommunityIcons
          name="shopping"
          size={20}
          color={theme.colors.textColor}
        />
        <Text style={styles.browseButtonText}>Browse Products</Text>
      </Pressable>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primary,
        },
      ]}
    >
      <FlatList
        data={favProducts}
        keyExtractor={(item) => item.product_fav_id.toString()}
        renderItem={renderFavoriteItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default FavoriteProductPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    padding: 8,
    marginLeft: 8,
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
  imagePlaceholder: {
    width: 120,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
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
    padding: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
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
    marginBottom: 12,
  },
  categoryChip: {
    alignSelf: "flex-start",
    borderRadius: 8,
  },
  inCartChip: {
    alignSelf: "flex-start",
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    minHeight: 400,
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
