import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  AppState,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Button, useTheme, Checkbox, Divider } from "react-native-paper";
import { Link, useNavigation, useRouter, useFocusEffect } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";
import { useLayoutEffect } from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  requestNotificationPermissions,
  registerBackgroundNotifications,
  loadCartTimers,
  saveCartTimers,
  scheduleCartNotifications,
  removeItemFromCartTimer,
  setupNotificationListeners,
} from "../../../notification-services";

const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

const Cart = () => {
  const { user, deleteFromCart, cartItem, isLoading, listCart } =
    useProductStore();
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { isDarkTheme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [timers, setTimers] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsInitialized, setNotificationsInitialized] =
    useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [expiredItems, setExpiredItems] = useState([]);

  const isFirstLoad = useRef(true);
  const hasCheckedExpiration = useRef(false);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      const permissionGranted = await requestNotificationPermissions();
      if (permissionGranted) {
        await registerBackgroundNotifications();
        setNotificationsInitialized(true);
      }
    };

    initNotifications();

    // Set up notification listeners
    const subscription = setupNotificationListeners((notification) => {
      const data = notification.request.content.data;
      if (data?.expired && data?.itemId) {
        const expiredItem = cartItem.find(
          (item) => item.consumer_cart_items_id === data.itemId
        );
        if (expiredItem) {
          handleRemoveFromCart(expiredItem, true);
        }
      }
    });

    return () => subscription.remove();
  }, [cartItem]);

  // Set up navigation options
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Shopping Cart",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() => {
            if (cartItem.length > 0) {
              Alert.alert(
                "Clear Cart",
                "Are you sure you want to remove all items?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear All",
                    style: "destructive",
                    onPress: () => {
                      cartItem.forEach((item) =>
                        handleRemoveFromCart(item, false)
                      );
                    },
                  },
                ]
              );
            }
          }}
        >
          <MaterialCommunityIcons
            name="cart-remove"
            size={24}
            color={theme.colors.textColor}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme, cartItem]);

  // Parse server date string to local timestamp
  const parseCartItemDate = (dateString) => {
    if (!dateString) return Date.now();
    try {
      // Convert server UTC time to local timestamp
      return Date.parse(dateString + " UTC");
    } catch (error) {
      console.error("Error parsing date:", error);
      return Date.now();
    }
  };

  // Load cart timers from storage
  useEffect(() => {
    const loadTimersData = async () => {
      try {
        const loadedTimers = await loadCartTimers();
        logDebug("Loaded timers:", loadedTimers);
        setTimers(loadedTimers);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error loading timers:", error);
        setInitialLoadComplete(true);
      }
    };
    loadTimersData();

    return () => {
      isFirstLoad.current = false;
    };
  }, []);

  // Update timers when cart items change
  useEffect(() => {
    if (!initialLoadComplete) return;

    const updateTimers = async () => {
      const newTimers = { ...timers };
      let hasChanges = false;

      for (const item of cartItem) {
        const itemId = item.consumer_cart_items_id;
        if (!newTimers[itemId] && item.date) {
          const timestamp = parseCartItemDate(item.date);
          if (timestamp) {
            newTimers[itemId] = timestamp;
            hasChanges = true;
            logDebug(`Added timer for item ${itemId}:`, {
              date: item.date,
              timestamp,
              now: Date.now(),
              diff: Date.now() - timestamp,
            });
          }
        }
      }

      if (hasChanges) {
        setTimers(newTimers);
        await saveCartTimers(newTimers);
      }
    };

    updateTimers();
  }, [cartItem, initialLoadComplete]);

  // Check for expired items
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadComplete || isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }

      if (!hasCheckedExpiration.current) {
        hasCheckedExpiration.current = true;

        const currentTime = Date.now();
        const expired = [];

        for (const item of cartItem) {
          const itemId = item.consumer_cart_items_id;
          const timeAdded = timers[itemId];

          if (timeAdded && currentTime - timeAdded >= CART_TIMEOUT) {
            expired.push(item);
          }
        }

        if (expired.length > 0) {
          logDebug("Found expired items:", expired.length);
          setExpiredItems(expired);
        }
      }

      return () => {
        hasCheckedExpiration.current = false;
      };
    }, [cartItem, timers, initialLoadComplete])
  );

  // Remove expired items
  useEffect(() => {
    if (expiredItems.length > 0) {
      const removeExpiredItems = async () => {
        for (const item of expiredItems) {
          await handleRemoveFromCart(item, true);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        setExpiredItems([]);
      };
      removeExpiredItems();
    }
  }, [expiredItems]);

  // Schedule notifications when timers or cart items change
  useEffect(() => {
    if (
      notificationsInitialized &&
      cartItem.length > 0 &&
      initialLoadComplete
    ) {
      scheduleCartNotifications(cartItem, timers);
    }
  }, [timers, cartItem, notificationsInitialized, initialLoadComplete]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && notificationsInitialized) {
        scheduleCartNotifications(cartItem, timers);
      }
    });

    return () => subscription.remove();
  }, [cartItem, timers, notificationsInitialized, initialLoadComplete]);

  // Handle item removal
  const handleRemoveFromCart = useCallback(
    async (item, isExpired = false) => {
      try {
        await deleteFromCart({
          productID: item.consumer_cart_items_id,
          consumerID: user?.consumer_id,
        });

        await removeItemFromCartTimer(item.consumer_cart_items_id);

        const newTimers = { ...timers };
        delete newTimers[item.consumer_cart_items_id];
        setTimers(newTimers);

        if (isExpired) {
          console.log(`Item ${item.title} expired and was removed from cart`);
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    },
    [deleteFromCart, user?.consumer_id, timers]
  );

  // Toggle item selection
  const toggleSelection = useCallback((consumerCartItemsId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(consumerCartItemsId)) next.delete(consumerCartItemsId);
      else next.add(consumerCartItemsId);
      return next;
    });
  }, []);

  // Derive selected items from selectedIds
  const selectedItems = cartItem.filter((item) =>
    selectedIds.has(item.consumer_cart_items_id)
  );

  // Calculate total price
  const totalPrice =
    selectedItems && selectedItems.length > 0
      ? selectedItems.reduce((sum, item) => sum + Number(item.spu || 0), 0)
      : 0;

  // Format time remaining for display
  const formatTimeRemaining = (timeAdded) => {
    if (!timeAdded) return { text: "Unknown", isExpiringSoon: false };

    const timeElapsed = Date.now() - timeAdded;
    const timeRemaining = Math.max(0, CART_TIMEOUT - timeElapsed);
    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor(
      (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
    );

    return {
      text: `${hours}h ${minutes}m`,
      isExpiringSoon: hours < 3,
    };
  };

  // Refresh cart data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.consumer_id) {
        await listCart(user.consumer_id);
      }
    } catch (error) {
      console.error("Error refreshing cart:", error);
    } finally {
      setRefreshing(false);
    }
  }, [listCart, user?.consumer_id]);

  // Render cart item
  const renderItem = ({ item }) => {
    const timeInfo = formatTimeRemaining(timers[item.consumer_cart_items_id]);

    return (
      <View
        style={[styles.itemWrapper, { backgroundColor: theme.colors.primary }]}
      >
        <TouchableOpacity
          style={[
            styles.itemContainer,
            { backgroundColor: theme.colors.surface },
            selectedIds.has(item.consumer_cart_items_id) && styles.selectedItem,
            { borderColor: theme.colors.button },
          ]}
          onPress={() => toggleSelection(item.consumer_cart_items_id)}
          onLongPress={() => showActionSheet(item)}
          activeOpacity={0.7}
        >
          <Image
            source={
              isDarkTheme
                ? require("../../../assets/images/darkImagePlaceholder.jpg")
                : require("../../../assets/images/imageSkeleton.jpg")
            }
            style={styles.itemImage}
          />

          <View style={styles.itemDetails}>
            <Text
              style={[styles.itemName, { color: theme.colors.textColor }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={[styles.itemPrice, { color: theme.colors.button }]}>
              AF {item.spu}
            </Text>

            <View style={styles.timerContainer}>
              <Ionicons
                name="time-outline"
                size={14}
                color={
                  timeInfo.isExpiringSoon
                    ? theme.colors.error
                    : theme.colors.inactiveColor
                }
              />
              <Text
                style={[
                  styles.timerText,
                  {
                    color: timeInfo.isExpiringSoon
                      ? theme.colors.error
                      : theme.colors.inactiveColor,
                  },
                ]}
              >
                {timeInfo.text} left
              </Text>
            </View>
          </View>

          <View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleRemoveFromCart(item)}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={22}
                color={theme.colors.deleteButton}
              />
            </TouchableOpacity>
            <Checkbox
              status={
                selectedIds.has(item.consumer_cart_items_id)
                  ? "checked"
                  : "unchecked"
              }
              onPress={() => toggleSelection(item.consumer_cart_items_id)}
              color={theme.colors.button}
              uncheckedColor={theme.colors.inactiveColor}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyCartContainer}>
      <MaterialCommunityIcons
        name="cart-outline"
        size={80}
        color={theme.colors.inactiveColor}
      />
      <Text style={[styles.emptyCartText, { color: theme.colors.textColor }]}>
        Your cart is empty
      </Text>
      <Text
        style={[styles.emptyCartSubtext, { color: theme.colors.inactiveColor }]}
      >
        Browse products and add items to your cart
      </Text>
      <Button
        mode="contained"
        style={[styles.browseButton, { marginTop: 20 }]}
        buttonColor={theme.colors.button}
        textColor={theme.colors.primary}
        onPress={() => router.navigate("(tabs)")}
      >
        Browse Products
      </Button>
    </View>
  );

  // Render footer with total price and checkout button
  const renderFooter = () => {
    if (selectedItems.length === 0) return null;

    return (
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.colors.primary,
            borderTopColor: theme.colors.inactiveColor,
          },
        ]}
      >
        <View style={styles.summaryContainer}>
          {selectedItems.length > 0 && (
            <View style={styles.summaryRow}>
              <Text
                style={[styles.summaryLabel, { color: theme.colors.textColor }]}
              >
                Total:
              </Text>
              <Text style={[styles.totalPrice, { color: theme.colors.button }]}>
                AF {totalPrice.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <Link
          href={{
            pathname: "/screens/ProductVariantSelection",
            params: { item: JSON.stringify(selectedItems) },
          }}
          asChild
        >
          <Button
            mode="contained"
            style={styles.orderButton}
            buttonColor={theme.colors.button}
            textColor={theme.colors.primary}
            disabled={selectedItems.length === 0}
            icon="cart-arrow-right"
          >
            Select and Continue
          </Button>
        </Link>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.button} />
        <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
          Loading your cart...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <FlatList
        data={cartItem}
        renderItem={renderItem}
        keyExtractor={(item) => item.consumer_cart_items_id}
        contentContainerStyle={[
          styles.list,
          cartItem.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyCart}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
      {renderFooter()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  list: {
    paddingBottom: 120,
    paddingTop: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  itemWrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
  },
  itemContainer: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  selectedItem: {
    borderWidth: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    height: 80,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: "bold",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    fontSize: 14,
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyCartContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyCartText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  browseButton: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryContainer: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 16,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "bold",
  },
  orderButton: {
    borderRadius: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});

export default Cart;
