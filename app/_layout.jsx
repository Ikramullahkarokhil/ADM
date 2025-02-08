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
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TermsModal from "./screens/ConsentScreen/index";

SplashScreen.preventAutoHideAsync();

const Layout = () => {
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const theme = isDarkTheme ? darkTheme : lightTheme;
  const { logout, user } = useProductStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkedTerms, setCheckedTerms] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const router = useRouter();

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
    if (checkedTerms) {
      if (!hasAcceptedTerms) {
        SplashScreen.hideAsync();
      } else if (!isLoading) {
        SplashScreen.hideAsync();
      }
    }
  }, [checkedTerms, hasAcceptedTerms, isLoading]);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (!user) {
          setIsLoggedIn(false);
        } else if (user.consumer_id) {
          const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
          const isExpired = Date.now() - user.timestamp > oneWeekInMs;
          if (isExpired) {
            await logout();
            setIsLoggedIn(false);
          } else {
            setIsLoggedIn(true);
          }
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (hasAcceptedTerms) {
      checkAuthentication();
    }
  }, [hasAcceptedTerms, logout, user]);

  // Routing logic
  useEffect(() => {
    if (hasAcceptedTerms && !isLoading) {
      if (isLoggedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/Login");
      }
    }
  }, [isLoading, isLoggedIn, router, hasAcceptedTerms]);

  useEffect(() => {
    initializeTheme(colorScheme === "dark");
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [isDarkTheme, colorScheme, theme.colors.primary, initializeTheme]);

  if (checkedTerms && !hasAcceptedTerms) {
    return (
      <ActionSheetProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="auto" />
          <TermsModal
            onAccept={async () => {
              await AsyncStorage.setItem("hasAcceptedTerms", "true");
              setHasAcceptedTerms(true);
            }}
            onDecline={() => {
              // Handle decline (e.g., exit app)
              BackHandler.exitApp();
            }}
          />
        </PaperProvider>
      </ActionSheetProvider>
    );
  }

  // Show loading indicator while checking auth
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Main layout
  return (
    <ActionSheetProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          style={isDarkTheme ? "light" : "dark"}
          backgroundColor={theme.colors.primary}
        />
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            animation: "simple_push",
          }}
        >
          {isLoggedIn ? (
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="Login" options={{ headerShown: false }} />
          )}
        </Stack>
      </PaperProvider>
    </ActionSheetProvider>
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
