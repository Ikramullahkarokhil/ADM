import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds
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

// Request notification permissions
export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

// Setup notification listeners
export const setupNotificationListeners = (onNotificationReceived) => {
  return Notifications.addNotificationReceivedListener(onNotificationReceived);
};

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
export const loadCartItems = async () => {
  try {
    const stored = await AsyncStorage.getItem("cartItems");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load cart items:", error);
    return [];
  }
};

// Calculate notification times at exact intervals
const calculateNotificationTimes = (addedTime, expirationTime, currentTime) => {
  const notificationTimes = [];

  // Calculate the next 6-hour interval from current time
  const timeElapsedSinceAdd = currentTime - addedTime;
  const intervalsPassed = Math.floor(timeElapsedSinceAdd / SIX_HOURS);
  const nextInterval = addedTime + (intervalsPassed + 1) * SIX_HOURS;

  // Add notifications at 6-hour intervals
  let notificationTime = nextInterval;

  // Ensure first notification is in the future
  while (notificationTime < currentTime + 60000) {
    notificationTime += SIX_HOURS;
  }

  // Add all future 6-hour interval notifications
  while (notificationTime < expirationTime - ONE_HOUR) {
    notificationTimes.push(notificationTime);
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
  notificationTimes.push(expirationTime);

  return notificationTimes;
};

// Check if an item is actually expired
const isItemExpired = (timeAdded) => {
  if (!timeAdded) return false;
  const currentTime = Date.now();
  return currentTime - timeAdded >= CART_TIMEOUT;
};

// Check if an item is about to expire (within 15 minutes)
const isItemAboutToExpire = (timeAdded) => {
  if (!timeAdded) return false;
  const currentTime = Date.now();
  const timeUntilExpiration = timeAdded + CART_TIMEOUT - currentTime;
  return timeUntilExpiration > 0 && timeUntilExpiration <= 15 * 60 * 1000; // 15 minutes
};

// Schedule notifications for cart items
const scheduleCartNotifications = async (cartItems) => {
  if (!cartItems || !cartItems.length) return;

  // Cancel existing notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Separate items into active and about-to-expire
  const activeItems = [];
  const expiringItems = [];

  cartItems.forEach((item) => {
    const timeAdded = parseCartItemDate(item.date);
    if (!timeAdded) return;

    if (isItemAboutToExpire(timeAdded)) {
      expiringItems.push(item);
    } else if (!isItemExpired(timeAdded)) {
      activeItems.push(item);
    }
  });

  const currentTime = Date.now();
  const scheduledNotifications = [];

  // Check when last notification was sent
  const lastNotificationTime = await AsyncStorage.getItem(
    LAST_NOTIFICATION_KEY
  );

  // Prevent notification spam by ensuring we don't send notifications too frequently
  // But allow expiration notifications to bypass this check
  if (
    lastNotificationTime &&
    currentTime - parseInt(lastNotificationTime) < THIRTY_MINUTES &&
    expiringItems.length === 0
  ) {
    console.log("Skipping notifications - too soon since last notification");
    return;
  }

  // Schedule notifications for regular active items first
  if (activeItems.length > 1) {
    // Group notifications for multiple items
    let earliestExpiration = Infinity;
    let earliestAddedTime = Infinity;

    for (const item of activeItems) {
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
                ? `${activeItems.length} items have been removed from your cart due to expiration.`
                : `You have ${activeItems.length} items in your cart that will expire in ${hoursRemaining} hours`,
              data: {
                type: isExpiration ? "expiration" : "reminder",
                count: activeItems.length,
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
  } else if (activeItems.length === 1) {
    // Single item notification
    const item = activeItems[0];
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

  // Now schedule immediate expiration notifications for items about to expire
  for (const item of expiringItems) {
    const timeAdded = parseCartItemDate(item.date);
    if (!timeAdded) continue;

    const expirationTime = timeAdded + CART_TIMEOUT;
    const secondsUntilExpiration = Math.max(
      1,
      Math.floor((expirationTime - currentTime) / 1000)
    );

    scheduledNotifications.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Cart Item Expiring Soon",
          body: `"${item.title}" will expire from your cart very soon.`,
          data: {
            itemId: item.consumer_cart_items_id,
            title: item.title,
            type: "expiration",
          },
        },
        trigger: {
          seconds: secondsUntilExpiration,
        },
      })
    );
  }

  // Wait for all notifications to be scheduled
  if (scheduledNotifications.length > 0) {
    await Promise.all(scheduledNotifications);
    await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, currentTime.toString());
    console.log(`Scheduled ${scheduledNotifications.length} notifications`);
  }
};

// Update cart notifications when cart changes
export const updateCartNotifications = async (cartItems) => {
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
};

// Register background task for notifications
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("Running background notification check");

    // Check when last notification was sent
    const lastNotificationTime = await AsyncStorage.getItem(
      LAST_NOTIFICATION_KEY
    );
    const currentTime = Date.now();

    // Only check for notifications if it's been at least 30 minutes since the last one
    // Unless there are items about to expire
    const cartItems = await loadCartItems();
    if (!cartItems || !cartItems.length) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check if any items are about to expire
    const hasExpiringItems = cartItems.some((item) => {
      const timeAdded = parseCartItemDate(item.date);
      return timeAdded && isItemAboutToExpire(timeAdded);
    });

    // Skip if too soon since last notification and no expiring items
    if (
      lastNotificationTime &&
      currentTime - parseInt(lastNotificationTime) < THIRTY_MINUTES &&
      !hasExpiringItems
    ) {
      console.log(
        "Skipping notification check - too soon since last notification"
      );
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Schedule notifications with all cart items
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
export const registerBackgroundNotifications = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 30 * 60, // 30 minutes
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    });
  } catch (error) {
    console.error("Background fetch registration failed:", error);
  }
};

// For testing purposes
export const getScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};
