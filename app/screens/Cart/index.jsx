import React, { useEffect, useState, useCallback } from "react";
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
import { Link, useNavigation, useRouter } from "expo-router";
import useOrderStore from "../../../components/store/useOrderStore";
import useProductStore from "../../../components/api/useProductStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useThemeStore from "../../../components/store/useThemeStore";
import { useLayoutEffect } from "react";

// Configure notification handler (unchanged)
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

// Constants (unchanged)
const CART_TIMEOUT = 24 * 60 * 60 * 1000;
const SIX_HOUR_INTERVAL = 6 * 60 * 60 * 1000;
const CART_STORAGE_KEY = "cart_timers";

const Cart = () => {
  const { user, deleteFromCart, cartItem } = useProductStore();
  const navigation = useNavigation();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { isDarkTheme } = useThemeStore();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [timers, setTimers] = useState({});

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Cart",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
      }
    };
    setupNotifications();
  }, []);

  useEffect(() => {
    const loadTimers = async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        const loadedTimers = stored ? JSON.parse(stored) : {};
        setTimers(loadedTimers);
      } catch (error) {
        console.error("Failed to load timers:", error);
        setTimers({});
      }
    };
    loadTimers();
  }, []);

  useEffect(() => {
    const updateTimers = async () => {
      const newTimers = { ...timers };
      let hasChanges = false;
      for (const item of cartItem) {
        const itemId = item.consumer_cart_items_id;
        if (!newTimers[itemId] && item.date) {
          // Convert the provided date string to a proper timestamp.
          const dateString = item.date.includes("T")
            ? item.date
            : item.date.replace(" ", "T");
          newTimers[itemId] = new Date(dateString).getTime();
          hasChanges = true;
        }
      }
      for (const id in newTimers) {
        if (!cartItem.some((item) => item.consumer_cart_items_id === id)) {
          delete newTimers[id];
          hasChanges = true;
        }
      }
      if (hasChanges) {
        setTimers(newTimers);
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newTimers));
      }
    };
    updateTimers();
  }, [cartItem]);

  const scheduleAllNotifications = useCallback(async () => {
    const currentTime = Date.now();
    const expiredItems = cartItem.filter((item) => {
      const timeAdded = timers[item.consumer_cart_items_id];
      if (!timeAdded) return false;
      const timeElapsed = currentTime - timeAdded;
      return timeElapsed >= CART_TIMEOUT;
    });
    for (const item of expiredItems) {
      await handleRemoveFromCart(item, false);
    }
    const remainingItems = cartItem.filter(
      (item) => !expiredItems.includes(item)
    );
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const item of remainingItems) {
      const timeAdded = timers[item.consumer_cart_items_id];
      if (!timeAdded) continue;
      const expirationTime = timeAdded + CART_TIMEOUT;
      const elapsedSinceAdded = currentTime - timeAdded;
      const passedIntervals = Math.floor(elapsedSinceAdded / SIX_HOUR_INTERVAL);
      let nextNotificationTime =
        timeAdded + (passedIntervals + 1) * SIX_HOUR_INTERVAL;
      while (nextNotificationTime < expirationTime) {
        const triggerSeconds = (nextNotificationTime - currentTime) / 1000;
        if (triggerSeconds > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Cart Reminder",
              body: `Item "${item.title}" is still in your cart and will expire soon.`,
              sound: true,
            },
            trigger: { seconds: triggerSeconds },
          });
        }
        nextNotificationTime += SIX_HOUR_INTERVAL;
      }
      const finalTrigger = (expirationTime - currentTime) / 1000;
      if (finalTrigger > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Item Expired",
            body: `Item "${item.title}" has expired and will be removed from your cart.`,
            sound: true,
          },
          trigger: { seconds: finalTrigger },
        });
      }
    }
  }, [cartItem, timers, handleRemoveFromCart]);

  useEffect(() => {
    scheduleAllNotifications();
  }, [scheduleAllNotifications]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        scheduleAllNotifications();
      } else if (nextAppState === "active") {
        Notifications.cancelAllScheduledNotificationsAsync();
        scheduleAllNotifications();
      }
    });
    return () => subscription.remove();
  }, [scheduleAllNotifications]);

  const handleRemoveFromCart = useCallback(
    async (item, notify = true) => {
      try {
        await deleteFromCart({
          productID: item.consumer_cart_items_id,
          consumerID: user?.consumer_id,
        });
        const newTimers = { ...timers };
        delete newTimers[item.consumer_cart_items_id];
        setTimers(newTimers);
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newTimers));
        if (notify) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Cart Update",
              body: `Item "${item.title}" removed from cart.`,
              sound: true,
            },
            trigger: null,
          });
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    },
    [deleteFromCart, user?.consumer_id, timers]
  );

  const toggleSelection = useCallback((consumerCartItemsId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(consumerCartItemsId)) next.delete(consumerCartItemsId);
      else next.add(consumerCartItemsId);
      return next;
    });
  }, []);

  const selectedItems = cartItem.filter((item) =>
    selectedIds.has(item.consumer_cart_items_id)
  );

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
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
        tintColor: theme.colors.textColor,
        containerStyle: { backgroundColor: theme.colors.primary },
      },
      (selectedIndex) => {
        if (selectedIndex === 0) handleRemoveFromCart(item);
      }
    );
  };

  const renderItem = ({ item }) => (
    <View
      style={[styles.itemWrapper, { backgroundColor: theme.colors.primary }]}
    >
      <TouchableOpacity
        style={[
          styles.itemContainer,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => toggleSelection(item.consumer_cart_items_id)}
        onLongPress={() => showActionSheet(item)}
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
          <Text style={[styles.itemName, { color: theme.colors.textColor }]}>
            {item.title}
          </Text>
          <Text style={[styles.itemPrice, { color: theme.colors.button }]}>
            AF {item.spu}
          </Text>
          <Text
            style={[styles.timerText, { color: theme.colors.inactiveColor }]}
          >
            Time remaining:{" "}
            {formatTimeRemaining(timers[item.consumer_cart_items_id])}
          </Text>
        </View>
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
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {cartItem.length > 0 ? (
        <FlatList
          data={cartItem}
          renderItem={renderItem}
          keyExtractor={(item) => item.consumer_cart_items_id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={styles.emptyCartText}>Your cart is empty</Text>
      )}
      {selectedItems.length > 0 && (
        <Link
          href={{
            pathname: "/screens/ProductVariantSelection",
            params: { item: JSON.stringify(selectedItems) },
          }}
          asChild
        >
          <Button
            style={styles.orderButton}
            buttonColor={theme.colors.button}
            textColor={theme.colors.primary}
          >
            Continue
          </Button>
        </Link>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { paddingBottom: 80 },
  itemWrapper: { marginHorizontal: 12, marginVertical: 5 },
  itemContainer: {
    flexDirection: "row",
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    elevation: 10,
  },
  itemImage: { width: 100, height: 100, borderRadius: 8 },
  itemDetails: { flex: 1, paddingHorizontal: 10 },
  itemName: { fontSize: 18, fontWeight: "bold" },
  itemPrice: { fontSize: 16, color: "#888", marginVertical: 4 },
  timerText: { fontSize: 14, color: "#666" },
  emptyCartText: { fontSize: 18, textAlign: "center", marginTop: 32 },
  orderButton: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: "80%",
  },
});

export default Cart;
