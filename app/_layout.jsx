import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { defaultConfig } from "@tamagui/config/v4";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useProductStore from "../components/api/useProductStore";

const _layout = () => {
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const queryClient = new QueryClient();
  const theme = isDarkTheme ? darkTheme : lightTheme;

  useEffect(() => {
    initializeTheme(colorScheme === "dark");
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [isDarkTheme]);

  return (
    <QueryClientProvider client={queryClient}>
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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </PaperProvider>
      </ActionSheetProvider>
    </QueryClientProvider>
  );
};

export default _layout;

const styles = StyleSheet.create({});
