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

enableScreens();
const BACKGROUND_FETCH_TASK = "background-notification-task";

const Layout = () => {
  // Theme & state initialization
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = useMemo(
    () => (isDarkTheme ? darkTheme : lightTheme),
    [isDarkTheme]
  );
  const router = useRouter();

  // Product store hooks
  const {
    fetchProfile,
    logout,
    user,
    listCart,
    fetchBillingAddresses,
    listOrders,
    getAppVersions,
  } = useProductStore();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  // Memoized components and styles
  const loadingView = (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  const screenOptions = useMemo(
    () => ({
      headerTitleAlign: "center",
      headerStyle: { backgroundColor: theme.colors.primary },
      detachInactiveScreens: true,
    }),
    [theme.colors.primary]
  );

  // Background tasks initialization
  const initBackgroundTasks = useCallback(async () => {
    try {
      await registerBackgroundNotifications();
    } catch (error) {
      console.error("Background tasks error:", error);
    }
  }, []);

  // Effects
  useEffect(() => {
    const initApp = async () => {
      try {
        SplashScreen.preventAutoHideAsync();
        await Promise.all([
          checkTermsAcceptance(),
          initializeTheme(colorScheme === "dark"),
          NavigationBar.setBackgroundColorAsync(theme.colors.primary),
          initBackgroundTasks(),
          checkVersionUpdates(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    return () => {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK).catch((err) =>
        console.error("Background task unregister error:", err)
      );
    };
  }, []);

  const checkTermsAcceptance = async () => {
    try {
      const value = await AsyncStorage.getItem("hasAcceptedTerms");
      setHasAcceptedTerms(value === "true");
    } catch (error) {
      console.error("Terms check error:", error);
    }
  };

  const checkVersionUpdates = async () => {
    try {
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const versions = await getAppVersions();
        const updateNeeded = checkForUpdate(currentVersion, versions);
        if (updateNeeded) {
          setLatestVersion(updateNeeded);
          setUpdateModalVisible(true);
        }
      }
    } catch (error) {
      console.error("Version check error:", error);
    }
  };

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
        console.error("User data fetch error:", error);
      }
    }
  }, [user?.consumer_id]);

  useEffect(() => {
    if (!isLoading && hasAcceptedTerms !== null) {
      handleAuthAndNetwork();
    }
  }, [hasAcceptedTerms, user, isLoading]);

  const handleAuthAndNetwork = async () => {
    const isLoggedIn =
      user?.timestamp && Date.now() - user.timestamp <= 7 * 24 * 60 * 60 * 1000;

    if (hasAcceptedTerms) {
      if (!isLoggedIn && user) await logout();
      SplashScreen.hideAsync();
      router.replace(isLoggedIn ? "/(tabs)" : "/Login");
    } else {
      SplashScreen.hideAsync();
    }

    const netState = await NetInfo.fetch();
    setShowAlert(!netState.isConnected);

    if (netState.isConnected && hasAcceptedTerms) {
      fetchUserData();
    }
  };

  // Handlers
  const handleAcceptTerms = useCallback(async () => {
    try {
      await AsyncStorage.setItem("hasAcceptedTerms", "true");
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error("Terms acceptance error:", error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    NetInfo.fetch().then((state) => setShowAlert(!state.isConnected));
  }, []);

  if (isLoading || hasAcceptedTerms === null) {
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
              onDecline={BackHandler.exitApp}
            />
          ) : (
            <Stack screenOptions={screenOptions}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="Login" options={{ headerShown: false }} />
            </Stack>
          )}

          <AlertDialog
            visible={showAlert}
            title="No Internet Connection"
            message="Please check your internet connection and try again."
            onConfirm={handleRefresh}
            confirmText="Try again"
          />

          {latestVersion && (
            <UpdateModal
              visible={updateModalVisible}
              onClose={() => setUpdateModalVisible(false)}
              latestVersion={latestVersion.version}
              currentVersion={currentVersion}
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
