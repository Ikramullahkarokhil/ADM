import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
const CART_STORAGE_KEY = "cart_timers";
const LAST_NOTIFICATION_KEY = "last_notification_time";
const BACKGROUND_FETCH_TASK = "background-notification-task";

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

    // Check when last notification was sent
    const lastNotificationTime = await AsyncStorage.getItem(
      LAST_NOTIFICATION_KEY
    );
    const currentTime = Date.now();

    // Only check for notifications if it's been at least 5.5 hours since the last one
    // This prevents notification loops
    if (
      lastNotificationTime &&
      currentTime - parseInt(lastNotificationTime) < 5.5 * 60 * 60 * 1000
    ) {
      console.log(
        "Skipping notification check - too soon since last notification"
      );
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const cartItems = await loadCartItems();

    if (!cartItems || !cartItems.length) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await scheduleCartNotifications(cartItems);

    // Record the time of this notification check
    await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, currentTime.toString());

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
      minimumInterval: 60, // 1 hour (in minutes)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background notifications registered");
  } catch (error) {
    console.error("Background fetch registration failed:", error);
  }
}

// Request notification permissions
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Parse cart item date string to timestamp
const parseCartItemDate = (dateString) => {
  if (!dateString) return null;

  try {
    // Format: "2025-04-29 13:14:46"
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

// *** FOR BACKWARD COMPATIBILITY ***
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

// *** FOR BACKWARD COMPATIBILITY ***
// Save cart timers to storage
export async function saveCartTimers(timers) {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(timers));
  } catch (error) {
    console.error("Failed to save timers:", error);
  }
}

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

// Calculate notification times at exact 6-hour intervals
function calculateNotificationTimes(addedTime, expirationTime, currentTime) {
  const notificationTimes = [];

  // Calculate all possible notification times (at 6-hour intervals)
  // Start from the item's added time and add 6-hour intervals
  let notificationTime = addedTime + SIX_HOURS;

  while (notificationTime < expirationTime) {
    // Only include future notification times (after current time)
    if (notificationTime > currentTime) {
      notificationTimes.push(notificationTime);
    }

    // Move to next 6-hour slot
    notificationTime += SIX_HOURS;
  }

  // Add the final expiration notification
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
    currentTime - parseInt(lastNotificationTime) < ONE_HOUR
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
      // Calculate notification times at 6-hour intervals
      const notificationTimes = calculateNotificationTimes(
        earliestAddedTime,
        earliestExpiration,
        currentTime
      );

      // If we have any notification times, schedule them
      if (notificationTimes.length > 0) {
        for (const notificationTime of notificationTimes) {
          // Determine if this is the expiration notification
          const isExpiration = notificationTime === earliestExpiration;

          // Calculate hours remaining
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
    }
  } else {
    // Single item notification
    const item = cartItems[0];
    const timeAdded = parseCartItemDate(item.date);

    if (!timeAdded) return;

    const expirationTime = timeAdded + CART_TIMEOUT;

    // Calculate notification times at 6-hour intervals
    const notificationTimes = calculateNotificationTimes(
      timeAdded,
      expirationTime,
      currentTime
    );

    // If we have any notification times, schedule them
    if (notificationTimes.length > 0) {
      for (const notificationTime of notificationTimes) {
        // Determine if this is the expiration notification
        const isExpiration = notificationTime === expirationTime;

        // Calculate hours remaining
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
  }

  // Wait for all notifications to be scheduled
  if (scheduledNotifications.length > 0) {
    await Promise.all(scheduledNotifications);

    // Record the time of this notification scheduling
    await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, currentTime.toString());

    console.log(`Scheduled ${scheduledNotifications.length} notifications`);
  }

  // For backward compatibility: Update cart timers
  const timers = {};
  for (const item of cartItems) {
    if (item.consumer_cart_items_id && item.date) {
      const timeAdded = parseCartItemDate(item.date);
      if (timeAdded) {
        timers[item.consumer_cart_items_id] = timeAdded;
      }
    }
  }

  // Save to timer storage (for backward compatibility)
  await saveCartTimers(timers);
}

// Setup notification listeners
export function setupNotificationListeners(onNotificationReceived) {
  return Notifications.addNotificationReceivedListener(onNotificationReceived);
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
    currentTime - parseInt(lastNotificationTime) < ONE_HOUR
  ) {
    console.log("Skipping notification update - too soon since last update");
    return;
  }

  if (!cartItems || cartItems.length === 0) {
    // Clear all notifications if cart is empty
    await Notifications.cancelAllScheduledNotificationsAsync();
    // For backward compatibility: Clear timers
    await saveCartTimers({});
  } else {
    // Schedule notifications for updated cart
    await scheduleCartNotifications(cartItems);
  }
}

// *** FOR BACKWARD COMPATIBILITY ***
// Remove an item from cart timer storage
export async function removeItemFromCartTimer(itemId) {
  const timers = await loadCartTimers();
  delete timers[itemId];
  await saveCartTimers(timers);
}

// For testing purposes
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}
