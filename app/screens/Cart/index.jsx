import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  AppState,
} from "react-native";
import { Button, useTheme, Checkbox } from "react-native-paper";
import { useNavigation } from "expo-router";
import useOrderStore from "../../../components/store/useOrderStore";
import useProductStore from "../../../components/api/useProductStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../../components/store/useThemeStore";

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const isActive = AppState.currentState === "active";
    return {
      shouldShowAlert: !isActive,
      shouldPlaySound: !isActive,
      shouldSetBadge: !isActive,
    };
  },
});

const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const NOTIFICATION_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds
const CART_STORAGE_KEY = "cart_timers";

const Cart = () => {
  const { listCart, user, deleteFromCart, cartItem } = useProductStore();
  const addOrder = useOrderStore((state) => state.addOrder);
  const navigation = useNavigation();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [timers, setTimers] = useState({});
  const [notificationShown, setNotificationShown] = useState({});
  const [appState, setAppState] = useState(AppState.currentState);
  const { isDarkTheme } = useThemeStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Cart",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation]);

  // Request notification permissions
  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
      }
    };
    setupNotifications();
  }, []);

  // Load timers from storage and clean up expired items on mount
  useEffect(() => {
    const loadAndCleanTimers = async () => {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const loadedTimers = stored ? JSON.parse(stored) : {};
      const currentTime = Date.now();

      // Clean up expired items
      const validTimers = {};
      for (const [id, timeAdded] of Object.entries(loadedTimers)) {
        const timeElapsed = currentTime - timeAdded;
        if (timeElapsed < CART_TIMEOUT) {
          validTimers[id] = timeAdded;
        } else {
          // Remove expired items from cart
          const item = cartItem.find((i) => i.products_id === id);
          if (item) {
            await handleRemoveFromCart(item, false); // Silent removal, no notification
          }
        }
      }
      setTimers(validTimers);
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validTimers));
    };
    loadAndCleanTimers();
  }, []);

  // Sync timers with cart items and persist
  useEffect(() => {
    const updateTimers = async () => {
      const newTimers = { ...timers };
      const currentTime = Date.now();

      cartItem.forEach((item) => {
        if (!newTimers[item.products_id]) {
          newTimers[item.products_id] = parseInt(item.date) * 1000;
        }
        // Remove if already expired
        const timeElapsed = currentTime - newTimers[item.products_id];
        if (timeElapsed >= CART_TIMEOUT) {
          handleRemoveFromCart(item, false); // Silent removal
          delete newTimers[item.products_id];
        }
      });
      setTimers(newTimers);
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newTimers));
    };
    updateTimers();
  }, [cartItem]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
      if (nextAppState === "background") {
        scheduleAllNotifications();
      } else if (nextAppState === "active") {
        // Cancel all scheduled notifications when app becomes active
        Notifications.cancelAllScheduledNotificationsAsync();
      }
    });
    return () => subscription.remove();
  }, [cartItem, timers, notificationShown, scheduleAllNotifications]);

  // Add listener to handle notifications when app is in foreground
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (appState === "active") {
          // Prevent notification from being presented
          Notifications.dismissNotificationAsync(
            notification.request.identifier
          );
        }
      }
    );
    return () => subscription.remove();
  }, [appState]);

  // Schedule notifications for all cart items
  const scheduleAllNotifications = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync(); // Clear old notifications
    const currentTime = Date.now();

    for (const item of cartItem) {
      const timeAdded = timers[item.products_id];
      if (!timeAdded) continue;

      const timeElapsed = currentTime - timeAdded;
      const timeRemaining = CART_TIMEOUT - timeElapsed;

      if (timeRemaining <= 0) {
        // Item already expired, handle silently
        await handleRemoveFromCart(item, false);
        continue;
      }

      // Schedule 1-hour warning
      if (
        timeRemaining > NOTIFICATION_THRESHOLD &&
        !notificationShown[item.products_id]
      ) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Item Expiring Soon",
            body: `Item "${item.title}" will expire from cart in 1 hour`,
            sound: true,
          },
          trigger: { seconds: (timeRemaining - NOTIFICATION_THRESHOLD) / 1000 },
        });
        setNotificationShown((prev) => ({
          ...prev,
          [item.products_id]: true,
        }));
      }

      // Schedule expiration notification
      if (timeRemaining > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Item Expired",
            body: `Item "${item.title}" removed due to timeout`,
            sound: true,
          },
          trigger: { seconds: timeRemaining / 1000 },
        });
      }
    }
  }, [cartItem, timers, notificationShown]);

  const toggleSelection = useCallback((productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const selectedItems = cartItem.filter((item) =>
    selectedIds.has(item.products_id)
  );

  const handleRemoveFromCart = useCallback(
    async (item, notify = true) => {
      try {
        await deleteFromCart({
          productID: item.products_id,
          consumerID: user.consumer_id,
        });
        setTimers((prev) => {
          const newTimers = { ...prev };
          delete newTimers[item.products_id];
          return newTimers;
        });
        setNotificationShown((prev) => {
          const newShown = { ...prev };
          delete newShown[item.products_id];
          return newShown;
        });
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(timers));
        if (notify && appState !== "active") {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Cart Update",
              body: "Product removed from cart",
              sound: true,
            },
            trigger: null,
          });
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    },
    [deleteFromCart, user.consumer_id, appState, timers]
  );

  const handleOrder = useCallback(async () => {
    try {
      await Promise.all(selectedItems.map((item) => addOrder(item)));
      await Promise.all(
        selectedItems.map((item) =>
          deleteFromCart({
            productID: item.products_id,
            consumerID: user.consumer_id,
          })
        )
      );
      await listCart(user.consumer_id);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Order failed:", error);
    }
  }, [selectedItems, addOrder, deleteFromCart, listCart, user.consumer_id]);

  const formatTimeRemaining = (timeAdded) => {
    const timeElapsed = Date.now() - timeAdded;
    const timeRemaining = Math.max(0, CART_TIMEOUT - timeElapsed);
    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor(
      (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
    );
    return `${hours}h ${minutes}m`;
  };

  const showActionSheet = (item) => {
    const options = ["Delete", "Cancel"];
    const destructiveButtonIndex = 0;
    const cancelButtonIndex = 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
        tintColor: theme.colors.textColor,
        containerStyle: { backgroundColor: theme.colors.primary },
      },
      (selectedIndex) => {
        if (selectedIndex === 0) {
          handleRemoveFromCart(item);
        }
      }
    );
  };

  const renderItem = useCallback(
    ({ item }) => (
      <View
        style={[styles.itemWrapper, { backgroundColor: theme.colors.primary }]}
      >
        <TouchableOpacity
          style={[
            styles.itemContainer,
            { backgroundColor: theme.colors.primary },
          ]}
          activeOpacity={0.8}
          onPress={() => toggleSelection(item.products_id)}
          onLongPress={() => showActionSheet(item)}
        >
          <Image
            source={
              isDarkTheme
                ? require("../../../assets/images/darkImagePlaceholder.jpg")
                : require("../../../assets/images/imageSkeleton.jpg")
            }
            resizeMode="contain"
            style={[
              styles.itemImage,
              { backgroundColor: theme.colors.background },
            ]}
          />
          <View style={styles.itemDetails}>
            <Text
              style={[styles.itemName, { color: theme.colors.textColor }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.itemPrice, { color: theme.colors.button }]}>
              ${item.spu}
            </Text>
            <Text
              style={[
                styles.timerText,
                { color: theme.colors.subInactiveColor },
              ]}
            >
              Time remaining: {formatTimeRemaining(timers[item.products_id])}
            </Text>
          </View>
          <Checkbox
            status={selectedIds.has(item.products_id) ? "checked" : "unchecked"}
            onPress={() => toggleSelection(item.products_id)}
            color={theme.colors.button}
            uncheckedColor={theme.colors.subInactiveColor}
          />
        </TouchableOpacity>
      </View>
    ),
    [
      toggleSelection,
      selectedIds,
      theme.colors.background,
      theme.colors.primary,
      theme.colors.button,
      timers,
    ]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {cartItem.length > 0 ? (
        <FlatList
          data={cartItem}
          renderItem={renderItem}
          keyExtractor={(item) => item.products_id.toString()}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={styles.emptyCartText}>Your cart is empty</Text>
      )}
      {selectedItems.length > 0 && (
        <Button
          style={styles.orderButton}
          buttonColor={theme.colors.button}
          textColor={theme.colors.textColor}
          onPress={handleOrder}
        >
          Continue
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  itemWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  itemContainer: {
    flexDirection: "row",
    borderRadius: 8,
    alignItems: "center",
    padding: 8,
    position: "relative",
    elevation: 10,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  itemPrice: {
    fontSize: 16,
    color: "#888",
    marginVertical: 4,
  },
  timerText: {
    fontSize: 14,
    color: "#666",
    marginVertical: 4,
  },
  emptyCartText: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
    marginTop: 32,
  },
  orderButton: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: "80%",
  },
});

export default Cart;
