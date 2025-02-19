import { BackHandler, useColorScheme } from "react-native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Stack, useRouter } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, View } from "react-native";

// Custom hooks and components
import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import useProductStore from "../components/api/useProductStore";
import TermsModal from "./screens/ConsentScreen/index";

const Layout = () => {
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = isDarkTheme ? darkTheme : lightTheme;
  const {
    listCart,
    fetchFavProducts,
    fetchProfile,
    searchProductData,
    getBillingAddress,
    logout,
    user,
  } = useProductStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkedTerms, setCheckedTerms] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(null);
  const router = useRouter();

  // Prevent auto-hiding the splash screen on mount.
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  // Check for terms acceptance.
  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem("hasAcceptedTerms");
        setHasAcceptedTerms(value === "true");
      } catch (error) {
        console.error("Error checking terms acceptance:", error);
      } finally {
        setCheckedTerms(true);
      }
    })();
  }, []);

  // Initialize theme and set the navigation bar color.
  const navBarBackgroundColor = useMemo(
    () => theme.colors.primary,
    [theme.colors.primary]
  );

  useEffect(() => {
    initializeTheme(colorScheme === "dark");
    NavigationBar.setBackgroundColorAsync(navBarBackgroundColor);
  }, [colorScheme, initializeTheme, navBarBackgroundColor]);

  // Fetch profile, favorite products, and product data concurrently.
  useEffect(() => {
    const fetchData = async () => {
      if (user?.consumer_id) {
        await Promise.all([
          fetchProfile(user.consumer_id),
          // fetchFavProducts(user.consumer_id),
          // listCart(user.consumer_id),
          // getBillingAddress(user.consumer_id),
          // searchProductData(),
        ]);
      }
    };

    fetchData();
  }, [user?.consumer_id, fetchProfile, fetchFavProducts, searchProductData]);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (user && user.timestamp) {
          const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
          const isExpired = Date.now() - user.timestamp > oneWeekInMs;
          if (isExpired) {
            await logout();
            setIsLoggedIn(false);
          } else {
            setIsLoggedIn(true);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (checkedTerms) {
      checkAuthentication();
    }
  }, [checkedTerms, user, logout]);

  useEffect(() => {
    if (checkedTerms && !isLoading) {
      SplashScreen.hideAsync();
      if (hasAcceptedTerms) {
        router.replace(isLoggedIn ? "/(tabs)" : "/Login");
      }
    }
  }, [checkedTerms, isLoading, hasAcceptedTerms, isLoggedIn, router]);

  const handleAcceptTerms = useCallback(async () => {
    try {
      await AsyncStorage.setItem("hasAcceptedTerms", "true");
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error("Error setting terms acceptance:", error);
    }
  }, []);

  const handleDeclineTerms = useCallback(() => {
    BackHandler.exitApp();
  }, []);

  if (hasAcceptedTerms === null || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ActionSheetProvider>
        <PaperProvider theme={theme}>
          <StatusBar
            style={isDarkTheme ? "light" : "dark"}
            backgroundColor={theme.colors.primary}
          />
          {!hasAcceptedTerms ? (
            <TermsModal
              onAccept={handleAcceptTerms}
              onDecline={handleDeclineTerms}
            />
          ) : (
            <Stack
              screenOptions={{
                headerTitleAlign: "center",
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="Login" options={{ headerShown: false }} />
            </Stack>
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
