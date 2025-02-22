import React, {
  useLayoutEffect,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Button, useTheme, Checkbox } from "react-native-paper";
import { useNavigation } from "expo-router";
import useOrderStore from "../../../components/store/useOrderStore";
import useProductStore from "../../../components/api/useProductStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import * as Notifications from "expo-notifications";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const NOTIFICATION_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds

const Cart = () => {
  const { listCart, user, deleteFromCart, cartItem } = useProductStore();
  const addOrder = useOrderStore((state) => state.addOrder);
  const navigation = useNavigation();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [timers, setTimers] = useState({});
  const [notificationShown, setNotificationShown] = useState({});

  // Request notification permissions on mount
  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
      }
    };
    setupNotifications();
  }, []);

  // Initialize timers using date from cart items
  useEffect(() => {
    const newTimers = {};
    cartItem.forEach((item) => {
      if (!timers[item.products_id]) {
        const addedTime = parseInt(item.date) * 1000;
        newTimers[item.products_id] = addedTime;
      }
    });
    setTimers((prev) => ({ ...prev, ...newTimers }));
  }, [cartItem]);

  // Check and handle expired items and show notifications
  useEffect(() => {
    const checkTimers = async () => {
      const currentTime = Date.now();
      for (const item of cartItem) {
        const timeAdded = timers[item.products_id];
        if (!timeAdded) continue;

        const timeElapsed = currentTime - timeAdded;
        const timeRemaining = CART_TIMEOUT - timeElapsed;

        // Show notification immediately for testing if not already shown
        if (!notificationShown[item.products_id] && timeRemaining > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Cart Item Notification",
              body: `Item "${item.title}" will expire from cart in less than 24 hours`,
              sound: true,
            },
            trigger: null, // immediate
          });
          setNotificationShown((prev) => ({
            ...prev,
            [item.products_id]: true,
          }));
        }
        // Regular 1-hour warning
        else if (
          timeRemaining <= NOTIFICATION_THRESHOLD &&
          timeRemaining > 0 &&
          !notificationShown[item.products_id]
        ) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Cart Item Expiring Soon",
              body: `Item "${item.title}" will expire from cart in 1 hour`,
              sound: true,
            },
            trigger: null,
          });
          setNotificationShown((prev) => ({
            ...prev,
            [item.products_id]: true,
          }));
        }

        // Remove expired items
        if (timeElapsed >= CART_TIMEOUT) {
          await handleRemoveFromCart(item);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Cart Item Expired",
              body: `Item "${item.title}" removed due to timeout`,
              sound: true,
            },
            trigger: null,
          });
        }
      }
    };

    const interval = setInterval(checkTimers, 1000);
    checkTimers(); // initial check
    return () => clearInterval(interval);
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Cart",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme.colors.primary, theme.colors.textColor]);

  const handleRemoveFromCart = useCallback(
    async (item) => {
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
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Update",
            body: "Product removed from cart",
            sound: true,
          },
          trigger: null,
        });
      } catch (error) {
        console.error("Failed to remove item:", error);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Error",
            body: "Failed to remove product",
            sound: true,
          },
          trigger: null,
        });
      }
    },
    [deleteFromCart, user.consumer_id]
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
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Order Success",
          body: "Product Ordered",
          sound: true,
        },
        trigger: null,
      });
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
        style={[
          styles.itemWrapper,
          { backgroundColor: theme.colors.background },
        ]}
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
              item.image
                ? { uri: item.image }
                : require("../../../assets/images/imageSkeleton.jpg")
            }
            style={[
              styles.itemImage,
              { backgroundColor: theme.colors.background },
            ]}
          />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.itemPrice}>${item.spu}</Text>
            <Text style={styles.timerText}>
              Time remaining: {formatTimeRemaining(timers[item.products_id])}
            </Text>
          </View>
          <Checkbox
            status={selectedIds.has(item.products_id) ? "checked" : "unchecked"}
            onPress={() => toggleSelection(item.products_id)}
            color={theme.colors.button}
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
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
          textColor={theme.colors.primary}
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
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    alignItems: "center",
    padding: 8,
    position: "relative",
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
  quantityText: {
    fontSize: 14,
    color: "#666",
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
