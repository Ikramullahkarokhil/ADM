import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SIX_HOUR_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours (not used in testing)
const CART_STORAGE_KEY = "cart_timers";
const EXPIRED_ITEMS_KEY = "expired_cart_items";
const BACKGROUND_FETCH_TASK = "background-notification-task";

// Toggle testing mode (set to true for testing notifications every minute)
const IS_TESTING = true;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register background task for notifications
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("Running background notification check");
    const timers = await loadCartTimers();
    const currentTime = Date.now();
    const expiredItems = await checkAndHandleExpiredItems();

    if (expiredItems.length > 0) {
      console.log(`Expired items: ${expiredItems.length}`);
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
      minimumInterval: 15 * 60, // 15 minutes
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

// Schedule notifications for cart items (production)
export async function scheduleCartNotifications(cartItems) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const currentTime = Date.now();

  for (const item of cartItems) {
    const itemId = item.consumer_cart_items_id;
    const timeAdded = parseCartItemDate(item.date);

    if (!timeAdded) continue;

    const expirationTime = timeAdded + CART_TIMEOUT;
    let nextNotificationTime = currentTime;

    while (nextNotificationTime < expirationTime) {
      const timeRemaining = expirationTime - nextNotificationTime;

      if (timeRemaining > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Reminder",
            body: `${item.title} will expire soon!`,
            data: { itemId },
          },
          trigger: {
            seconds: Math.min(6 * 60 * 60, Math.floor(timeRemaining / 1000)),
          },
        });
      }

      nextNotificationTime += 6 * 60 * 60 * 1000; // Increment by 6 hours
    }
  }
}

// Schedule a repeating test notification every minute
export async function scheduleTestNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Testing Notification",
      body: "This notification appears every minute for testing purposes.",
    },
    trigger: {
      seconds: 60, // Trigger after 60 seconds
      repeats: true, // Repeat indefinitely
    },
  });

  console.log("Test notifications scheduled to repeat every minute.");
}

// Function to choose between testing and production notification scheduling
export async function scheduleAppropriateNotifications(cartItems) {
  if (IS_TESTING) {
    await scheduleTestNotification();
  } else {
    await scheduleCartNotifications(cartItems);
  }
}

// Remove an item from cart timer storage
export async function removeItemFromCartTimer(itemId) {
  const timers = await loadCartTimers();
  delete timers[itemId];
  await saveCartTimers(timers);
}

// Setup notification listeners
export function setupNotificationListeners(onNotificationReceived) {
  return Notifications.addNotificationReceivedListener(onNotificationReceived);
}

// Function to check and handle expired items in the cart timers
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
