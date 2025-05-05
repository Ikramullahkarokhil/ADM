import * as Notifications from "expo-notifications";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds
const CART_STORAGE_KEY = "cart_timers";
const LAST_NOTIFICATION_KEY = "last_notification_time";
const BACKGROUND_TASK_NAME = "background-notification-task";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Setup notification listeners
export function setupNotificationListeners(onNotificationReceived) {
  return Notifications.addNotificationReceivedListener(onNotificationReceived);
}

// Register background task for notifications
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    console.log("Running background notification check");

    // Check when last notification was sent
    const lastNotificationTime = await AsyncStorage.getItem(
      LAST_NOTIFICATION_KEY
    );
    const currentTime = Date.now();

    // Only check for notifications if it's been at least 30 minutes since the last one
    if (
      lastNotificationTime &&
      currentTime - parseInt(lastNotificationTime) < THIRTY_MINUTES
    ) {
      console.log(
        "Skipping notification check - too soon since last notification"
      );
      return BackgroundTask.Result.NO_DATA;
    }

    const cartItems = await loadCartItems();

    if (!cartItems || !cartItems.length) {
      return BackgroundTask.Result.NO_DATA;
    }

    // Schedule notifications for all items
    await scheduleCartNotifications(cartItems);

    // Record the time of this notification check
    await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, currentTime.toString());

    return BackgroundTask.Result.NEW_DATA;
  } catch (error) {
    console.error("Background task failed:", error);
    return BackgroundTask.Result.FAILED;
  }
});

// Initialize background task
export async function registerBackgroundNotifications() {
  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 30 * 60, // 30 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background notifications registered");
  } catch (error) {
    console.error("Background task registration failed:", error);
  }
}

// Parse cart item date string to timestamp
const parseCartItemDate = (dateString) => {
  if (!dateString) return null;

  try {
    const [datePart, timePart] = dateString.split(" ");
    if (!datePart || !timePart) return null;

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.getTime();
  } catch (error) {
    console.error("Error parsing date:", error, dateString);
    return null;
  }
};

// Load cart items from storage
export async function loadCartItems() {
  try {
    const stored = await AsyncStorage.getItem("cartItems");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load cart items:", error);
    return [];
  }
}

// Calculate notification times at exact intervals
function calculateNotificationTimes(addedTime, expirationTime, currentTime) {
  const notificationTimes = [];

  // Add notifications at 6-hour intervals
  let notificationTime = addedTime + SIX_HOURS;
  while (notificationTime < expirationTime - ONE_HOUR) {
    if (notificationTime > currentTime) {
      notificationTimes.push(notificationTime);
    }
    notificationTime += SIX_HOURS;
  }

  // Add final hour notifications
  const finalHour = expirationTime - ONE_HOUR;
  if (finalHour > currentTime) {
    notificationTimes.push(finalHour);
  }

  // Add final 30-minute notification
  const finalThirtyMinutes = expirationTime - THIRTY_MINUTES;
  if (finalThirtyMinutes > currentTime) {
    notificationTimes.push(finalThirtyMinutes);
  }

  // Add expiration notification
  if (expirationTime > currentTime) {
    notificationTimes.push(expirationTime);
  }

  return notificationTimes;
}

// Schedule notifications for cart items
export async function scheduleCartNotifications(cartItems) {
  if (!cartItems || !cartItems.length) return;

  // Cancel existing notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  const currentTime = Date.now();
  const scheduledNotifications = [];

  // Check when last notification was sent
  const lastNotificationTime = await AsyncStorage.getItem(
    LAST_NOTIFICATION_KEY
  );

  // Prevent notification spam by ensuring we don't send notifications too frequently
  if (
    lastNotificationTime &&
    currentTime - parseInt(lastNotificationTime) < THIRTY_MINUTES
  ) {
    console.log("Skipping notifications - too soon since last notification");
    return;
  }

  // Group notifications if there are multiple items
  if (cartItems.length > 1) {
    // Find the earliest expiration time
    let earliestExpiration = Infinity;
    let earliestAddedTime = Infinity;

    for (const item of cartItems) {
      const timeAdded = parseCartItemDate(item.date);
      if (!timeAdded) continue;

      const expirationTime = timeAdded + CART_TIMEOUT;

      if (expirationTime < earliestExpiration) {
        earliestExpiration = expirationTime;
        earliestAddedTime = timeAdded;
      }
    }

    if (earliestExpiration !== Infinity) {
      const notificationTimes = calculateNotificationTimes(
        earliestAddedTime,
        earliestExpiration,
        currentTime
      );

      for (const notificationTime of notificationTimes) {
        const isExpiration = notificationTime === earliestExpiration;
        const hoursRemaining = Math.ceil(
          (notificationTime - currentTime) / ONE_HOUR
        );

        scheduledNotifications.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: isExpiration ? "Cart Items Expired" : "Cart Reminder",
              body: isExpiration
                ? `${cartItems.length} items have been removed from your cart due to expiration.`
                : `You have ${cartItems.length} items in your cart that will expire in ${hoursRemaining} hours`,
              data: {
                type: isExpiration ? "expiration" : "reminder",
                count: cartItems.length,
              },
            },
            trigger: {
              seconds: Math.max(
                1,
                Math.floor((notificationTime - currentTime) / 1000)
              ),
            },
          })
        );
      }
    }
  } else {
    // Single item notification
    const item = cartItems[0];
    const timeAdded = parseCartItemDate(item.date);

    if (!timeAdded) return;

    const expirationTime = timeAdded + CART_TIMEOUT;
    const notificationTimes = calculateNotificationTimes(
      timeAdded,
      expirationTime,
      currentTime
    );

    for (const notificationTime of notificationTimes) {
      const isExpiration = notificationTime === expirationTime;
      const hoursRemaining = Math.ceil(
        (notificationTime - currentTime) / ONE_HOUR
      );

      scheduledNotifications.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: isExpiration ? "Cart Item Expired" : "Cart Reminder",
            body: isExpiration
              ? `"${item.title}" has been removed from your cart due to expiration.`
              : `"${item.title}" will expire from your cart in ${hoursRemaining} hours`,
            data: {
              itemId: item.consumer_cart_items_id,
              title: item.title,
              type: isExpiration ? "expiration" : "reminder",
            },
          },
          trigger: {
            seconds: Math.max(
              1,
              Math.floor((notificationTime - currentTime) / 1000)
            ),
          },
        })
      );
    }
  }

  // Wait for all notifications to be scheduled
  if (scheduledNotifications.length > 0) {
    await Promise.all(scheduledNotifications);
    await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, currentTime.toString());
    console.log(`Scheduled ${scheduledNotifications.length} notifications`);
  }
}

// Update cart notifications when cart changes
export async function updateCartNotifications(cartItems) {
  // Check when last update was sent
  const lastNotificationTime = await AsyncStorage.getItem(
    LAST_NOTIFICATION_KEY
  );
  const currentTime = Date.now();

  // Add some throttling to prevent notification loop
  if (
    lastNotificationTime &&
    currentTime - parseInt(lastNotificationTime) < THIRTY_MINUTES
  ) {
    console.log("Skipping notification update - too soon since last update");
    return;
  }

  if (!cartItems || cartItems.length === 0) {
    // Clear all notifications if cart is empty
    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    // Schedule notifications for updated cart
    await scheduleCartNotifications(cartItems);
  }
}

// For testing purposes
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}
