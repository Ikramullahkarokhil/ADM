import { StyleSheet, Text, View, useColorScheme } from "react-native";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider as PaperProvider } from "react-native-paper";
import useThemeStore from "../components/store/useThemeStore";
import { darkTheme, lightTheme } from "../components/Theme";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { createTamagui, TamaguiProvider } from "tamagui";
import { defaultConfig } from "@tamagui/config/v4";

const _layout = () => {
  const colorScheme = useColorScheme();
  const { isDarkTheme, initializeTheme } = useThemeStore();
  const config = createTamagui(defaultConfig);

  const theme = isDarkTheme ? darkTheme : lightTheme;

  useEffect(() => {
    initializeTheme(colorScheme === "dark");
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [isDarkTheme]);

  return (
    <TamaguiProvider config={config}>
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
    </TamaguiProvider>
  );
};

export default _layout;

const styles = StyleSheet.create({});
