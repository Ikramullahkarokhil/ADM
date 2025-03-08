import React, {
  useEffect,
  useLayoutEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Image,
  Animated,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import {
  IconButton,
  useTheme,
  Button,
  Surface,
  Chip,
  Snackbar,
  ActivityIndicator,
  Badge,
} from "react-native-paper";
import { Link, useNavigation } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedSurface = Animated.createAnimatedComponent(Surface);
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

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
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [loadingStates, setLoadingStates] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Fetch favorites on mount and when user changes
  useEffect(() => {
    if (user?.consumer_id) {
      fetchFavProducts(user.consumer_id);
    }
  }, [user?.consumer_id, fetchFavProducts]);

  // Header animation values
  const headerHeight = 60;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  });

  const headerElevation = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 4],
    extrapolate: "clamp",
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFavProducts(user.consumer_id);
    } catch (error) {
      setSnackbarMessage("Failed to refresh favorites");
      setSnackbarVisible(true);
    } finally {
      setRefreshing(false);
    }
  }, [user.consumer_id, fetchFavProducts]);

  // Memoizing the remove function to avoid unnecessary re-renders
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

          setSnackbarMessage(`${favItem.name} removed from favorites`);
          setSnackbarVisible(true);
        } catch (error) {
          setSnackbarMessage("Failed to remove from favorites");
          setSnackbarVisible(true);
        } finally {
          setLoadingStates((prev) => ({ ...prev, [`remove_${favId}`]: false }));
        }
      }
    },
    [favProducts, removeFavorite, user.consumer_id]
  );

  // Add to cart handler with improved feedback
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

        setSnackbarMessage(`${product.name} added to cart`);
        setSnackbarVisible(true);
      } catch (error) {
        console.error("Failed to add to cart:", error);
        setSnackbarMessage("Failed to add to cart");
        setSnackbarVisible(true);
      } finally {
        setLoadingStates((prev) => ({
          ...prev,
          [`cart_${product.products_id}`]: false,
        }));
      }
    },
    [addToCart, user.consumer_id]
  );

  const renderFavoriteItem = useCallback(
    ({ item, index }) => {
      const scaleAnim = new Animated.Value(1);
      const isInCart = cartItems?.some(
        (cartItem) => cartItem.products_id === item.products_id
      );

      const onPressIn = () => {
        Animated.spring(scaleAnim, {
          toValue: 0.97,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }).start();
      };

      const onPressOut = () => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      };

      return (
        <Animated.View
          style={{
            opacity: 1,
            transform: [{ scale: scaleAnim }],
            marginBottom: 16,
          }}
        >
          <AnimatedSurface
            style={[
              styles.productCard,
              {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.subInactiveColor,
              },
            ]}
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
                android_ripple={{ color: theme.colors.ripple }}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{
                      uri: item.image_url || "https://via.placeholder.com/100",
                    }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  {item.discount && (
                    <View
                      style={[
                        styles.discountBadge,
                        { backgroundColor: theme.colors.error },
                      ]}
                    >
                      <Text style={styles.discountText}>-{item.discount}%</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <View>
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
                        <Text style={styles.originalPrice}>
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
                            { backgroundColor: theme.colors.primaryContainer },
                          ]}
                          textStyle={{
                            fontSize: 12,
                            color: theme.colors.onPrimaryContainer,
                          }}
                          icon="check-circle"
                        >
                          In Cart
                        </Chip>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.productDate,
                        { color: theme.colors.inactiveColor },
                      ]}
                    >
                      Added {formatRelativeTime(new Date(item.date))}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      onPress={() => handleAddToCart(item)}
                      style={[
                        styles.addButton,
                        {
                          backgroundColor: isInCart
                            ? theme.colors.primary
                            : theme.colors.button,
                        },
                      ]}
                      textColor={
                        isInCart ? theme.colors.onSurfaceVariant : "white"
                      }
                      labelStyle={styles.buttonLabel}
                      disabled={
                        loadingStates[`cart_${item.products_id}`] || isInCart
                      }
                      icon={
                        loadingStates[`cart_${item.products_id}`]
                          ? () => <ActivityIndicator size={16} color="white" />
                          : isInCart
                          ? "check"
                          : "cart-plus"
                      }
                    >
                      {loadingStates[`cart_${item.products_id}`]
                        ? "Adding..."
                        : isInCart
                        ? "In Cart"
                        : "Add to Cart"}
                    </Button>

                    <IconButton
                      icon={
                        loadingStates[`remove_${item.product_fav_id}`]
                          ? () => (
                              <ActivityIndicator
                                size={16}
                                color={theme.colors.deleteButton}
                              />
                            )
                          : "heart"
                      }
                      iconColor={theme.colors.deleteButton}
                      size={24}
                      onPress={() => handleRemoveFav(item.product_fav_id)}
                      style={styles.favoriteButton}
                      disabled={loadingStates[`remove_${item.product_fav_id}`]}
                    />
                  </View>
                </View>
              </Pressable>
            </Link>
          </AnimatedSurface>
        </Animated.View>
      );
    },
    [handleRemoveFav, handleAddToCart, theme.colors, loadingStates, cartItems]
  );

  const EmptyState = () => (
    <View
      style={[
        styles.emptyContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <MaterialCommunityIcons
        name="heart-off-outline"
        size={80}
        color={theme.colors.deleteButton}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.textColor }]}>
        No favorites yet
      </Text>
      <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
        Products you mark as favorites will appear here
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate("Products")}
        buttonColor={theme.colors.button}
        textColor="white"
        style={{ marginTop: 20, borderRadius: 12 }}
        icon="shopping"
      >
        Browse Products
      </Button>
    </View>
  );

  // Custom header component
  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.primary,
          opacity: headerOpacity,
          elevation: headerElevation,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: theme.colors.textColor }]}>
          My Favorites
        </Text>
        <View style={styles.headerActions}>
          <IconButton
            icon="magnify"
            iconColor={theme.colors.textColor}
            size={24}
            onPress={() => navigation.navigate("Search")}
          />
          <View>
            <IconButton
              icon="cart-outline"
              iconColor={theme.colors.textColor}
              size={24}
              onPress={() => navigation.navigate("Cart")}
            />
            {cartItems?.length > 0 && (
              <Badge style={styles.cartBadge} size={18}>
                {cartItems.length}
              </Badge>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar barStyle="light-content" translucent />

      {renderHeader()}

      {favProducts.length > 0 ? (
        <AnimatedFlatList
          data={favProducts}
          keyExtractor={(item) => item.product_fav_id.toString()}
          renderItem={renderFavoriteItem}
          contentContainerStyle={[
            styles.listContainer,
            { paddingTop: headerHeight + insets.top },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.button]}
              progressBackgroundColor={theme.colors.surface}
              progressViewOffset={headerHeight + insets.top}
            />
          }
        />
      ) : (
        <EmptyState />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[
          styles.snackbar,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
          labelStyle: { color: theme.colors.primary },
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

// Helper function to format relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  return date.toLocaleDateString();
};

export default FavoriteProductPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerContent: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  productCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  productContent: {
    flexDirection: "row",
    padding: 0,
  },
  imageContainer: {
    width: 100,
    height: 130,
    position: "relative",
  },
  productImage: {
    width: 100,
    height: 100,
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
    justifyContent: "space-between",
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
    fontSize: 20,
    fontWeight: "800",
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 16,
    fontWeight: "400",
    textDecorationLine: "line-through",
    color: "#999",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: "flex-start",
  },
  inCartChip: {
    alignSelf: "flex-start",
  },
  productDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  addButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 12,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  favoriteButton: {
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
    marginBottom: 16,
  },
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
  },
});
