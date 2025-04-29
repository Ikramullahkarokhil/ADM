import React, { useEffect, useState, useMemo, Suspense, lazy } from "react";
import {
  useColorScheme,
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import NetInfo from "@react-native-community/netinfo";
import * as BackgroundFetch from "expo-background-fetch";
import { enableScreens } from "react-native-screens";
import Constants from "expo-constants";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import * as Notifications from "expo-notifications";
import {
  registerBackgroundNotifications,
  requestNotificationPermissions,
} from "../notification-services";

import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import useProductStore from "../components/api/useProductStore";
import { checkForUpdate } from "../utils/VersionUtils";
import AlertDialog from "../components/ui/NoInternetAlert";

// Lazy-load heavy UI components only when needed
const TermsModal = lazy(() => import("./screens/ConsentScreen"));
const UpdateModal = lazy(() => import("../components/ui/UpdateModal"));

const BACKGROUND_FETCH_TASK = "background-notification-task";

enableScreens();

export default function Layout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = useMemo(
    () => (isDarkTheme ? darkTheme : lightTheme),
    [isDarkTheme]
  );

  const {
    fetchProfile,
    logout,
    user,
    listCart,
    fetchBillingAddresses,
    listOrders,
    getAppVersions,
  } = useProductStore();

  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);

  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  // Memoize loading view
  const LoadingScreen = useMemo(
    () => (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    ),
    [theme.colors.primary]
  );

  // Background tasks
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Request notification permissions
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          console.warn("Notification permissions not granted");
          return;
        }

        // Register background notifications
        await registerBackgroundNotifications();
      } catch (error) {
        console.error("Failed to setup notifications:", error);
      }
    };

    setupNotifications();
    return () => {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK).catch(
        console.error
      );
    };
  }, []);

  // Monitor connectivity once
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) =>
      setIsConnected(state.isConnected)
    );
    return unsubscribe;
  }, []);

  // Check versions (debounced, no duplicate calls)
  useEffect(() => {
    (async () => {
      if (!isConnected) return;
      try {
        const versions = await getAppVersions();

        const needed = checkForUpdate(currentVersion, versions);
        if (needed) setUpdateInfo(needed);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isConnected, getAppVersions, currentVersion]);

  // Terms acceptance
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    (async () => {
      const stored = await AsyncStorage.getItem("hasAcceptedTerms");
      setAccepted(stored === "true");
      setLoading(false);
    })();
  }, []);

  // Theme & nav bar
  useEffect(() => {
    initializeTheme(colorScheme === "dark");
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [colorScheme, initializeTheme, theme.colors.primary]);

  // Authentication & routing
  useEffect(() => {
    if (loading || accepted === null) return;
    const isLoggedIn =
      user?.timestamp && Date.now() - user.timestamp <= 7 * 24 * 3600 * 1000;
    SplashScreen.hideAsync().catch(console.warn);
    if (!accepted) return;
    if (!isLoggedIn && user) logout();
    router.replace(isLoggedIn ? "/(tabs)" : "/Login");
  }, [loading, accepted, user, logout, router]);

  // Fetch user data on valid session
  useEffect(() => {
    if (user?.consumer_id && isConnected && accepted) {
      Promise.all([
        fetchProfile(user.consumer_id),
        listCart(user.consumer_id),
        fetchBillingAddresses(user.consumer_id),
        listOrders(user.consumer_id),
      ]).catch(console.error);
    }
  }, [
    user?.consumer_id,
    isConnected,
    accepted,
    fetchProfile,
    listCart,
    fetchBillingAddresses,
    listOrders,
  ]);

  if (loading || accepted === null) return LoadingScreen;

  return (
    <GestureHandlerRootView style={styles.container}>
      <ActionSheetProvider>
        <Suspense fallback={LoadingScreen}>
          <PaperProvider theme={theme}>
            <StatusBar style={isDarkTheme ? "light" : "dark"} />
            {!accepted ? (
              <TermsModal
                onAccept={async () => {
                  await AsyncStorage.setItem("hasAcceptedTerms", "true");
                  setAccepted(true);
                }}
              />
            ) : (
              <Stack
                screenOptions={{
                  headerTitleAlign: "center",
                  headerStyle: { backgroundColor: theme.colors.primary },
                  headerTintColor: theme.colors.textColor,
                  lazy: true,
                  detachInactiveScreens: true,
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="Login" options={{ headerShown: false }} />
              </Stack>
            )}
            {accepted && !isConnected && (
              <AlertDialog
                visible={!isConnected}
                title="No Internet"
                message="Check your connection"
                onConfirm={() =>
                  NetInfo.fetch().then((s) => setIsConnected(s.isConnected))
                }
              />
            )}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
