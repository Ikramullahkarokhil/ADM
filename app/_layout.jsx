import { BackHandler, useColorScheme } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Stack, useRouter } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as BackgroundFetch from "expo-background-fetch";

import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import useProductStore from "../components/api/useProductStore";
import TermsModal from "./screens/ConsentScreen/index";
import AlertDialog from "../components/ui/NoInternetAlert";
import { registerBackgroundNotifications } from "../notification-services";

// Define background task for notifications
const BACKGROUND_FETCH_TASK = "background-notification-task";

const Layout = () => {
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = isDarkTheme ? darkTheme : lightTheme;
  const { fetchProfile, logout, user, listCart, getBillingAddress } =
    useProductStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();

  // Initialize background tasks and notifications
  useEffect(() => {
    const initBackgroundTasks = async () => {
      try {
        // Register background notifications
        await registerBackgroundNotifications();
      } catch (error) {
        console.error("Error initializing background tasks:", error);
      }
    };

    initBackgroundTasks();

    return () => {
      // Clean up background tasks if needed
      try {
        BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK).catch(
          (err) => console.log("Failed to unregister background task", err)
        );
      } catch (error) {
        console.error("Error cleaning up background tasks:", error);
      }
    };
  }, []);

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

  useEffect(() => {
    initializeTheme(colorScheme === "dark");
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [colorScheme, initializeTheme, theme.colors.primary]);

  const fetchUserData = useCallback(async () => {
    if (user?.consumer_id) {
      try {
        await fetchProfile(user.consumer_id);
        await listCart(user.consumer_id);
        await getBillingAddress(user.consumer_id);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
  }, [user?.consumer_id, fetchProfile, listCart, getBillingAddress]);

  useEffect(() => {
    const checkAuthentication = async () => {
      if (!hasAcceptedTerms || user === null) return;

      const isLoggedIn = user?.timestamp
        ? Date.now() - user.timestamp <= 7 * 24 * 60 * 60 * 1000
        : false;

      if (!isLoggedIn && user) await logout();

      if (!isLoading) {
        SplashScreen.hideAsync();
        router.replace(isLoggedIn ? "/(tabs)" : "/Login");
      }
    };

    checkAuthentication();
  }, [hasAcceptedTerms, user, logout, isLoading, router]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isInternetReachable;
      setIsConnected(connected);
      setShowAlert(!connected);

      if (connected && hasAcceptedTerms) {
        router.replace(user ? "/(tabs)" : "/Login");
        fetchUserData();
      }
    });

    return () => unsubscribe();
  }, [user, router, fetchUserData, hasAcceptedTerms]);

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
      setIsConnected(state.isConnected);
      setShowAlert(!state.isConnected);
    });
  }, []);

  if (hasAcceptedTerms === null || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
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
            <Stack
              screenOptions={{
                headerTitleAlign: "center",
                headerStyle: { backgroundColor: theme.colors.primary },
              }}
            >
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
