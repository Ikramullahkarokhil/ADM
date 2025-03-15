import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SIX_HOUR_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const CART_STORAGE_KEY = "cart_timers";
const EXPIRED_ITEMS_KEY = "expired_cart_items";
const BACKGROUND_FETCH_TASK = "background-notification-task";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("Running background notification check");
    const timers = await loadCartTimers();
    const currentTime = Date.now();
    let expiredItems = await loadExpiredItems();
    let hasChanges = false;

    // Check for expired items
    const newlyExpired = Object.entries(timers)
      .filter(([_, timestamp]) => currentTime - timestamp >= CART_TIMEOUT)
      .map(([id]) => id);

    if (newlyExpired.length > 0) {
      console.log(`Found ${newlyExpired.length} newly expired items`);
      newlyExpired.forEach((id) => {
        delete timers[id];
        if (!expiredItems.includes(id)) {
          expiredItems.push(id);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await saveCartTimers(timers);
        await saveExpiredItems(expiredItems);

        // Reschedule notifications for remaining items
        // This ensures notifications are up-to-date
        const cartItems = await AsyncStorage.getItem("cart_items");
        if (cartItems) {
          const items = JSON.parse(cartItems);
          const validItems = items.filter(
            (item) => !expiredItems.includes(item.consumer_cart_items_id)
          );
          await scheduleCartNotifications(validItems);
        }
      }
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background task failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Initialize background fetch
export async function registerBackgroundNotifications() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 900, // 15 minutes (minimum)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background fetch registered successfully");
  } catch (error) {
    console.error("Background fetch registration failed:", error);
  }
}

// Request notification permissions
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Updated date parser to match the cart component
const parseCartItemDate = (dateString) => {
  if (!dateString) return null;

  try {
    // Format: "2025-03-15 09:06:02"
    const [datePart, timePart] = dateString.split(" ");
    if (!datePart || !timePart) return null;

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    // Month is 0-indexed in JavaScript Date
    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.getTime();
  } catch (error) {
    console.error("Error parsing date:", error, dateString);
    return null;
  }
};

// Load cart timers from storage
export async function loadCartTimers() {
  try {
    const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to load timers:", error);
    return {};
  }
}

// Save cart timers to storage
export async function saveCartTimers(timers) {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(timers));
  } catch (error) {
    console.error("Failed to save timers:", error);
  }
}

// Load expired items from storage
export async function loadExpiredItems() {
  try {
    const stored = await AsyncStorage.getItem(EXPIRED_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load expired items:", error);
    return [];
  }
}

// Save expired items to storage
export async function saveExpiredItems(expiredItems) {
  try {
    await AsyncStorage.setItem(EXPIRED_ITEMS_KEY, JSON.stringify(expiredItems));
  } catch (error) {
    console.error("Failed to save expired items:", error);
  }
}

// Schedule notifications for cart items - improved version
export async function scheduleCartNotifications(cartItems) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const currentTime = Date.now();

  for (const item of cartItems) {
    const itemId = item.consumer_cart_items_id;
    const timeAdded = parseCartItemDate(item.date);

    // Skip if we couldn't parse the date
    if (!timeAdded) continue;

    const expirationTime = timeAdded + CART_TIMEOUT;
    const timeRemaining = expirationTime - currentTime;

    // Only schedule notifications if there's time remaining
    if (timeRemaining <= 0) continue;

    // Schedule expiration notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Item Expired",
        body: `${item.title} has been removed from your cart.`,
        data: { itemId, expired: true },
      },
      trigger: { seconds: Math.floor(timeRemaining / 1000) },
    });

    // Calculate 6-hour interval notifications
    // Start from the next 6-hour mark from when the item was added
    const hoursElapsed = (currentTime - timeAdded) / (60 * 60 * 1000);
    const nextIntervalHour = Math.ceil(hoursElapsed / 6) * 6;

    // Schedule notifications at 6, 12, and 18 hour marks if they're in the future
    for (let hour = nextIntervalHour; hour < 24; hour += 6) {
      const notificationTime = timeAdded + hour * 60 * 60 * 1000;
      const triggerTime = notificationTime - currentTime;

      if (triggerTime > 0 && notificationTime < expirationTime) {
        const hoursRemaining = Math.round(
          (expirationTime - notificationTime) / (60 * 60 * 1000)
        );

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Reminder",
            body: `${item.title} in cart - ${hoursRemaining}h remaining`,
            data: { itemId },
          },
          trigger: { seconds: Math.floor(triggerTime / 1000) },
        });
      }
    }
  }
}

export async function removeItemFromCartTimer(itemId) {
  const timers = await loadCartTimers();
  delete timers[itemId];
  await saveCartTimers(timers);
}

export function setupNotificationListeners(onNotificationReceived) {
  return Notifications.addNotificationReceivedListener(onNotificationReceived);
}

// Function to check and handle expired items
export async function checkAndHandleExpiredItems() {
  const timers = await loadCartTimers();
  const currentTime = Date.now();
  let expiredItems = await loadExpiredItems();
  let hasChanges = false;

  const newlyExpired = Object.entries(timers)
    .filter(([_, timestamp]) => currentTime - timestamp >= CART_TIMEOUT)
    .map(([id]) => id);

  if (newlyExpired.length > 0) {
    newlyExpired.forEach((id) => {
      delete timers[id];
      if (!expiredItems.includes(id)) {
        expiredItems.push(id);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await saveCartTimers(timers);
      await saveExpiredItems(expiredItems);
    }

    return newlyExpired;
  }

  return [];
}
