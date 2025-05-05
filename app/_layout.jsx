import React, { useEffect, useState, useMemo, Suspense, lazy } from "react";
import {
  useColorScheme,
  ActivityIndicator,
  View,
  StyleSheet,
  ToastAndroid,
} from "react-native";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import NetInfo from "@react-native-community/netinfo";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { enableScreens } from "react-native-screens";
import Constants from "expo-constants";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import {
  requestNotificationPermissions,
  registerBackgroundNotifications,
  setupNotificationListeners,
  updateCartNotifications,
} from "../services/notificationService";

import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import useProductStore from "../components/api/useProductStore";
import { checkForUpdate } from "../utils/VersionUtils";
import AlertDialog from "../components/ui/NoInternetAlert";
import IntroScreen from "./screens/IntroScreen";
import { SafeAreaView } from "react-native-safe-area-context";

// Lazy-load heavy UI components only when needed
const UpdateModal = lazy(() => import("../components/ui/UpdateModal"));

const BACKGROUND_TASK_NAME = "background-notification-task";

// Enable native screens for better performance
enableScreens();

export default function Layout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = useMemo(
    () => (isDarkTheme ? darkTheme : lightTheme),
    [isDarkTheme]
  );

  // Product store hooks
  const {
    fetchProfile,
    logout,
    user,
    listCart,
    fetchBillingAddresses,
    listOrders,
    getAppVersions,
    cartItem,
  } = useProductStore();

  // App state
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  const { MainCategorieName, subCategorieName, sellerName, sellerTitle } =
    useGlobalSearchParams();

  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  // Memoize loading view for better performance
  const LoadingScreen = useMemo(
    () => (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    ),
    [theme.colors.primary]
  );

  // Setup notification system only once
  useEffect(() => {
    let subscription;
    let isFirstLoad = true;

    const setupNotificationSystem = async () => {
      try {
        // Request notification permissions
        const hasPermission = await requestNotificationPermissions();
        setNotificationPermission(hasPermission);

        if (!hasPermission) {
          console.warn("Notification permissions not granted");
          return;
        }

        // Register background notifications task
        await registerBackgroundNotifications();

        // Setup notification listener for app-wide handling
        subscription = setupNotificationListeners((notification) => {
          console.log("Notification received in root layout:", notification);
          const data = notification.request.content.data;

          // Handle different types of notifications
          if (data?.type === "expiration") {
            ToastAndroid.show(
              `${data.count || 1} item(s) have expired from your cart`,
              ToastAndroid.LONG
            );

            // Refresh cart only if expired items and user logged in
            if (user?.consumer_id) {
              listCart(user.consumer_id).catch((error) =>
                console.error("Error refreshing cart:", error)
              );
            }
          } else if (data?.type === "reminder") {
            // Show reminder notifications
            ToastAndroid.show(
              notification.request.content.body,
              ToastAndroid.LONG
            );
          }
        });

        try {
          // Register background task with proper configuration
          await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
            minimumInterval: 30 * 60, // 30 minutes
            stopOnTerminate: false,
            startOnBoot: true,
          });
        } catch (error) {
          console.error("Failed to register background task:", error);
        }

        // Save cart items to storage for background task access
        if (cartItem && cartItem.length > 0) {
          try {
            await AsyncStorage.setItem("cartItems", JSON.stringify(cartItem));

            // Only update notifications if this isn't the first app load
            // This prevents notifications from showing immediately on app open
            if (!isFirstLoad) {
              await updateCartNotifications(cartItem);
            }
            isFirstLoad = false;
          } catch (error) {
            console.error("Failed to save cart items:", error);
          }
        }
      } catch (error) {
        console.error("Failed to setup notifications:", error);
      }
    };

    setupNotificationSystem();

    // Cleanup function
    return () => {
      if (subscription) {
        subscription.remove();
      }

      // Try to unregister the task and catch any errors
      try {
        TaskManager.unregisterTaskAsync(BACKGROUND_TASK_NAME).catch((error) => {
          // Ignore specific errors about task not being registered or different consumer
          console.log("Background task cleanup:", error.message);
        });
      } catch (error) {
        console.log("Background task cleanup error:", error);
      }
    };
  }, [user?.consumer_id, listCart, cartItem]);

  // Monitor connectivity once
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) =>
      setIsConnected(!!state.isConnected)
    );
    return unsubscribe;
  }, []);

  // Check versions (debounced, no duplicate calls)
  useEffect(() => {
    let isMounted = true;

    const checkVersions = async () => {
      if (!isConnected) return;

      try {
        const versions = await getAppVersions();

        if (!isMounted) return;

        const needed = checkForUpdate(currentVersion, versions);
        if (needed) setUpdateInfo(needed);
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkVersions();

    return () => {
      isMounted = false;
    };
  }, [isConnected, getAppVersions, currentVersion]);

  // Check onboarding status
  useEffect(() => {
    let isMounted = true;

    const loadInitialState = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Check if user has completed onboarding
        const onboardingCompleted = await AsyncStorage.getItem(
          "hasCompletedOnboarding"
        );

        // Check terms acceptance
        const stored = await AsyncStorage.getItem("hasAcceptedTerms");

        if (!isMounted) return;

        setHasCompletedOnboarding(onboardingCompleted === "true");
        setAccepted(stored === "true");
      } catch (error) {
        console.error("Error loading onboarding state:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          SplashScreen.hideAsync().catch(console.warn);
        }
      }
    };

    loadInitialState();

    return () => {
      isMounted = false;
    };
  }, []);

  // Theme & nav bar
  useEffect(() => {
    // Initialize theme with current system value
    initializeTheme(colorScheme === "dark");

    // No need to force update for system theme - it will be handled by initializeTheme
  }, [colorScheme, initializeTheme]);

  // Handle routing based on auth state
  useEffect(() => {
    if (loading || hasCompletedOnboarding === null || accepted === null) return;

    // Skip navigation if user hasn't completed onboarding or accepted terms
    if (hasCompletedOnboarding === false || accepted === false) return;

    // Check if user session is valid (less than 7 days old)
    const isLoggedIn =
      user?.timestamp && Date.now() - user.timestamp <= 7 * 24 * 3600 * 1000;

    // If user session is invalid but user exists, log them out
    if (!isLoggedIn && user) logout();

    // Navigate to appropriate screen
    router.replace(isLoggedIn ? "/(tabs)" : "/Login");
  }, [loading, accepted, hasCompletedOnboarding, user, logout, router]);

  // Fetch user data when session is valid and connected
  useEffect(() => {
    if (!user?.consumer_id || !isConnected || !accepted) return;

    // Fetch all user data in parallel
    Promise.all([
      fetchProfile(user.consumer_id).catch((e) =>
        console.error("Error fetching profile:", e)
      ),
      listCart(user.consumer_id).catch((e) =>
        console.error("Error fetching cart:", e)
      ),
      fetchBillingAddresses(user.consumer_id).catch((e) =>
        console.error("Error fetching addresses:", e)
      ),
      listOrders(user.consumer_id).catch((e) =>
        console.error("Error fetching orders:", e)
      ),
    ]).catch((error) => {
      console.error("Error fetching user data:", error);
    });
  }, [
    user?.consumer_id,
    isConnected,
    accepted,
    fetchProfile,
    listCart,
    fetchBillingAddresses,
    listOrders,
  ]);

  // Handle completing the onboarding process
  const handleCompleteOnboarding = async () => {
    try {
      await AsyncStorage.setItem("hasAcceptedTerms", "true");
      await AsyncStorage.setItem("hasCompletedOnboarding", "true");

      setAccepted(true);
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Error saving onboarding state:", error);

      // Still try to update state even if storage fails
      setAccepted(true);
      setHasCompletedOnboarding(true);
    }
  };

  // Show loading screen while initializing
  if (loading) {
    return LoadingScreen;
  }

  // Show intro screen if user hasn't completed onboarding
  if (hasCompletedOnboarding === false) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <PaperProvider theme={theme}>
          <StatusBar style={isDarkTheme ? "light" : "dark"} />
          <IntroScreen theme={theme} onComplete={handleCompleteOnboarding} />
        </PaperProvider>
      </SafeAreaView>
    );
  }

  // Main app UI
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <ActionSheetProvider>
        <Suspense fallback={LoadingScreen}>
          <PaperProvider theme={theme}>
            {!accepted ? (
              // If terms not accepted yet, show the Terms modal via IntroScreen
              <IntroScreen
                theme={theme}
                startAtConsent={true}
                onComplete={handleCompleteOnboarding}
              />
            ) : (
              // Main app navigation stack
              <Stack
                screenOptions={{
                  headerTitleAlign: "center",
                  headerStyle: { backgroundColor: theme.colors.primary },
                  headerTintColor: theme.colors.textColor,
                  lazy: true,
                  detachInactiveScreens: true,
                  freezeOnBlur: true,
                  statusBarStyle: isDarkTheme ? "light" : "dark",
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="Login" options={{ headerShown: false }} />
                <Stack.Screen
                  name="screens/AboutUs/index"
                  options={{ title: "About Us" }}
                />
                <Stack.Screen
                  name="screens/AllCategories/index"
                  options={{ title: MainCategorieName }}
                />
                <Stack.Screen
                  name="screens/AllNewArrivals/index"
                  options={{ title: "New Arrivals" }}
                />
                <Stack.Screen
                  name="screens/AllSaleProducts/index"
                  options={{ title: "Hot Deals" }}
                />
                <Stack.Screen
                  name="screens/AllTopSellers/index"
                  options={{ title: "Top Sellers" }}
                />
                <Stack.Screen
                  name="screens/BillingAddress/index"
                  options={{ title: "Billing Addresses" }}
                />
                <Stack.Screen
                  name="screens/Cart/index"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="screens/Comments/index"
                  options={{ title: "Comments" }}
                />
                <Stack.Screen
                  name="screens/JustForYou/index"
                  options={{ title: "Just For You" }}
                />
                <Stack.Screen
                  name="screens/MoreFeatures/index"
                  options={{ title: "More Features" }}
                />
                <Stack.Screen
                  name="screens/OrderDetails/index"
                  options={{ title: "Order Details" }}
                />
                <Stack.Screen name="screens/ProductDetail/index" />
                <Stack.Screen
                  name="screens/Products/index"
                  options={{ title: subCategorieName }}
                />
                <Stack.Screen
                  name="screens/ProductVariantSelection/index"
                  options={{ title: "Customize Order" }}
                />
                <Stack.Screen
                  name="screens/Questions/index"
                  options={{ title: "Questions" }}
                />
                <Stack.Screen
                  name="screens/SellerProducts/index"
                  options={{
                    title: sellerName,

                    headerTitle: sellerName || "Products",
                    headerTintColor: theme.colors.buttonText,
                    headerStyle: {
                      backgroundColor: theme.colors.button,
                    },
                    headerShadowVisible: false,
                    statusBarStyle: "light",
                  }}
                />
                <Stack.Screen
                  name="screens/SellerProfile/index"
                  options={{ title: sellerTitle }}
                />
                <Stack.Screen
                  name="screens/SellerReviews/index"
                  options={{
                    headerTitle: sellerName,
                    headerTintColor: theme.colors.buttonText,
                    headerStyle: {
                      backgroundColor: theme.colors.button,
                    },
                    headerShadowVisible: false,
                    statusBarStyle: "light",
                  }}
                />
                <Stack.Screen
                  name="screens/Signup/index"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="screens/UpdateProfile/index"
                  options={{ title: "Update Profile" }}
                />
              </Stack>
            )}

            {/* Show no internet alert when needed */}
            {accepted && !isConnected && (
              <AlertDialog
                visible={!isConnected}
                title="No Internet"
                message="Check your connection"
                onConfirm={() =>
                  NetInfo.fetch().then((s) => setIsConnected(!!s.isConnected))
                }
              />
            )}

            {/* Show update modal when an update is available */}
            {updateInfo && (
              <UpdateModal
                visible={true}
                latestVersion={updateInfo.version}
                currentVersion={currentVersion}
              />
            )}
          </PaperProvider>
        </Suspense>
      </ActionSheetProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
