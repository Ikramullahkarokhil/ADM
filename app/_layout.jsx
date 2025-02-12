import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import useProductStore from "../components/api/useProductStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TermsModal from "./screens/ConsentScreen/index";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";

const Layout = () => {
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = isDarkTheme ? darkTheme : lightTheme;
  const { searchProductData, logout, user } = useProductStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkedTerms, setCheckedTerms] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const router = useRouter();

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    console.log(user);
  }, []);

  useEffect(() => {
    const checkTermsAcceptance = async () => {
      try {
        const value = await AsyncStorage.getItem("hasAcceptedTerms");
        setHasAcceptedTerms(value === "true");
      } catch (error) {
        console.error("Error checking terms acceptance:", error);
      } finally {
        setCheckedTerms(true);
      }
    };

    checkTermsAcceptance();
  }, []);

  useEffect(() => {
    const initialize = () => {
      initializeTheme(colorScheme === "dark");

      searchProductData();
      NavigationBar.setBackgroundColorAsync(theme.colors.primary);
    };
    initialize();
  }, [isDarkTheme, colorScheme]);

  // Check authentication status
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (user && user.consumer_id) {
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

    if (checkedTerms && hasAcceptedTerms) {
      checkAuthentication();
    } else if (checkedTerms && !hasAcceptedTerms) {
      setIsLoading(false);
    }
  }, [checkedTerms, hasAcceptedTerms, logout, user]);

  useEffect(() => {
    if (checkedTerms && !isLoading) {
      SplashScreen.hideAsync();

      if (hasAcceptedTerms) {
        if (isLoggedIn) {
          router.replace("/(tabs)");
        } else {
          router.replace("/Login");
        }
      }
    }
  }, [isLoading, isLoggedIn, router, hasAcceptedTerms, checkedTerms]);

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
              onAccept={async () => {
                await AsyncStorage.setItem("hasAcceptedTerms", "true");
                setHasAcceptedTerms(true);
              }}
              onDecline={() => {
                BackHandler.exitApp();
              }}
            />
          ) : (
            <Stack
              screenOptions={{
                headerTitleAlign: "center",
                animation: "simple_push",
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

export default Layout;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
