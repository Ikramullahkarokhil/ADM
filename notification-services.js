import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SIX_HOUR_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const CART_STORAGE_KEY = "cart_timers";
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
    await checkAndScheduleNotifications();
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
  } catch (error) {
    console.error("Background fetch registration failed:", error);
  }
}

// Request notification permissions
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// UTC date parser for server timestamps
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
export async function loadCartTimers() {
  try {
    const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
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

// Schedule notifications for cart items
export async function scheduleCartNotifications(cartItems) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const currentTime = Date.now();

  for (const item of cartItems) {
    const itemId = item.consumer_cart_items_id;
    const timeAdded = parseCartItemDate(item.date);
    const expirationTime = timeAdded + CART_TIMEOUT;
    const timeRemaining = expirationTime - currentTime;

    // Schedule expiration notification
    if (timeRemaining > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Item Expiring",
          body: `${item.title} will be removed in ${Math.round(
            timeRemaining / (60 * 60 * 1000)
          )} hours`,
          data: { itemId },
        },
        trigger: { seconds: timeRemaining / 1000 },
      });
    }

    // Schedule 6-hour interval notifications
    let notificationTime = timeAdded;
    while (notificationTime < expirationTime) {
      const triggerTime = notificationTime - currentTime;
      if (triggerTime > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cart Reminder",
            body: `${item.title} in cart - ${Math.round(
              (expirationTime - notificationTime) / (60 * 60 * 1000)
            )}h remaining`,
            data: { itemId },
          },
          trigger: { seconds: triggerTime / 1000 },
        });
      }
      notificationTime += SIX_HOUR_INTERVAL;
    }
  }
}

// Background check for expired items
async function checkAndScheduleNotifications() {
  const timers = await loadCartTimers();
  const currentTime = Date.now();

  const expiredItems = Object.entries(timers)
    .filter(([_, timestamp]) => currentTime - timestamp >= CART_TIMEOUT)
    .map(([id]) => id);

  if (expiredItems.length > 0) {
    expiredItems.forEach((id) => delete timers[id]);
    await saveCartTimers(timers);
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
