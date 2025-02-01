import { StyleSheet, View } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PaperProvider, useTheme } from "react-native-paper";

const _layout = () => {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.textColor,
        tabBarStyle: {
          backgroundColor: theme.colors.primary,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = focused ? "home" : "home-outline";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="Search"
        options={{
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = focused
              ? "search-circle"
              : "search-circle-outline";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="Orders"
        options={{
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = focused ? "bag-check" : "bag-check-outline";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = focused
              ? "person-circle"
              : "person-circle-outline";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        }}
      />
    </Tabs>
  );
};

export default _layout;

const styles = StyleSheet.create({});
