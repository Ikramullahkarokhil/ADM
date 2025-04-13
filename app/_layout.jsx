import {
  BackHandler,
  useColorScheme,
  ActivityIndicator,
  View,
} from "react-native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Stack, useRouter } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import NetInfo from "@react-native-community/netinfo";
import * as BackgroundFetch from "expo-background-fetch";
import { enableScreens } from "react-native-screens";
import Constants from "expo-constants";

import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import useProductStore from "../components/api/useProductStore";
import TermsModal from "./screens/ConsentScreen/index";
import AlertDialog from "../components/ui/NoInternetAlert";
import { registerBackgroundNotifications } from "../notification-services";
import UpdateModal from "../components/ui/UpdateModal";
import { checkForUpdate } from "../utils/VersionUtils";

const BACKGROUND_FETCH_TASK = "background-notification-task";

// Move enableScreens to outside of component (if not done already)
enableScreens();

const Layout = () => {
  // 1. Theme & styling setup
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = useMemo(
    () => (isDarkTheme ? darkTheme : lightTheme),
    [isDarkTheme]
  );

  // 2. Product & user related hooks
  const {
    fetchProfile,
    logout,
    user,
    listCart,
    fetchBillingAddresses,
    listOrders,
    getAppVersions,
  } = useProductStore();

  // 3. Local state variables
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [versionData, setVersionData] = useState([]);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const router = useRouter();
  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  // 4. Memoized loading view and screen options
  const loadingView = useMemo(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    ),
    [theme.colors.primary]
  );

  const screenOptions = useMemo(
    () => ({
      headerTitleAlign: "center",
      headerStyle: { backgroundColor: theme.colors.primary },
      detachInactiveScreens: true,
    }),
    [theme.colors.primary]
  );

  // 5. Initialize background tasks (using useCallback to avoid re-creation)
  const initBackgroundTasks = useCallback(async () => {
    try {
      await registerBackgroundNotifications();
    } catch (error) {
      console.error("Error initializing background tasks:", error);
    }
  }, []);

  useEffect(() => {
    initBackgroundTasks();
    return () => {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK).catch((err) =>
        console.error("Failed to unregister background task:", err)
      );
    };
  }, [initBackgroundTasks]);

  // 6. Check for app version updates
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          const versions = await getAppVersions();
          setVersionData(versions);
          if (versions?.length > 0) {
            const updateNeeded = checkForUpdate(currentVersion, versions);
            if (updateNeeded) {
              setLatestVersion(updateNeeded);
              setUpdateModalVisible(true);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching version data:", error);
      }
    };
    checkVersion();
  }, [getAppVersions, currentVersion]);

  // 7. Check acceptance of terms and manage splash screen visibility.
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    const checkTerms = async () => {
      try {
        const value = await AsyncStorage.getItem("hasAcceptedTerms");
        setHasAcceptedTerms(value === "true");
      } catch (error) {
        console.error("Error checking terms acceptance:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkTerms();
  }, []);

  // 8. Initialize theme and navigation bar color on change.
  useEffect(() => {
    initializeTheme(colorScheme === "dark");
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [colorScheme, initializeTheme, theme.colors.primary]);

  // 9. Fetch user data only when authenticated
  const fetchUserData = useCallback(async () => {
    if (user?.consumer_id) {
      try {
        await Promise.all([
          fetchProfile(user.consumer_id),
          listCart(user.consumer_id),
          fetchBillingAddresses(user.consumer_id),
          listOrders(user.consumer_id),
        ]);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
  }, [
    user?.consumer_id,
    fetchProfile,
    listCart,
    fetchBillingAddresses,
    listOrders,
  ]);

  // 10. Handle authentication & routing (grouping logic ensures checks fire when all data is ready)
  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isLoading && hasAcceptedTerms !== null) {
        if (hasAcceptedTerms) {
          const isLoggedIn = user?.timestamp
            ? Date.now() - user.timestamp <= 7 * 24 * 60 * 60 * 1000
            : false;
          if (!isLoggedIn && user) await logout();
          SplashScreen.hideAsync();
          router.replace(isLoggedIn ? "/(tabs)" : "/Login");
        } else {
          SplashScreen.hideAsync();
        }
      }
    };
    checkAuthentication();
  }, [hasAcceptedTerms, user, logout, isLoading, router]);

  // 11. Optimize network connectivity listener
  useEffect(() => {
    let lastConnectedStatus = null; // Local variable to avoid unnecessary state updates

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isInternetReachable);
      if (lastConnectedStatus !== connected) {
        lastConnectedStatus = connected;
        setShowAlert(!connected);
        // Refresh data only when connection is restored.
        if (connected && hasAcceptedTerms && !isLoading) {
          router.replace(user ? "/(tabs)" : "/Login");
          fetchUserData();
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [user, router, fetchUserData, hasAcceptedTerms, isLoading]);

  // 12. Memoized handlers to prevent unnecessary re-creation
  const handleAcceptTerms = useCallback(async () => {
    try {
      await AsyncStorage.setItem("hasAcceptedTerms", "true");
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error("Error setting terms acceptance:", error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    NetInfo.fetch().then((state) => {
      const connected = Boolean(state.isConnected);
      setShowAlert(!connected);
    });
  }, []);

  // 13. Show loading view until all checks are complete
  if (hasAcceptedTerms === null || isLoading) {
    return loadingView;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: theme.colors.primary }}
    >
      <ActionSheetProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={isDarkTheme ? "light" : "dark"} />
          {!hasAcceptedTerms ? (
            <TermsModal
              onAccept={handleAcceptTerms}
              onDecline={() => BackHandler.exitApp()}
            />
          ) : (
            <Stack screenOptions={screenOptions}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="Login" options={{ headerShown: false }} />
            </Stack>
          )}
          {hasAcceptedTerms && (
            <AlertDialog
              visible={showAlert}
              title="No Internet Connection"
              message="Please check your internet connection and try again."
              onConfirm={handleRefresh}
              confirmText="Try again"
            />
          )}
          {latestVersion && (
            <UpdateModal
              visible={updateModalVisible}
              onClose={() => setUpdateModalVisible(false)}
              latestVersion={latestVersion.version}
              currentVersion={currentVersion}
              versionData={versionData}
            />
          )}
        </PaperProvider>
      </ActionSheetProvider>
    </GestureHandlerRootView>
  );
};

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
};

export default Layout;
