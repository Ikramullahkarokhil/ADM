import React from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";

const Layout = () => {
  const theme = useTheme();

  const renderIcon = ({ name, focused, color, size }) => (
    <Ionicons
      name={`${name}${focused ? "" : "-outline"}`}
      size={size}
      color={color}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.textColor,
        tabBarStyle: { backgroundColor: theme.colors.primary },
        tabBarActiveTintColor: theme.colors.textColor,
        tabBarInactiveTintColor: theme.colors.textColor + "80",
        tabBarAllowFontScaling: true,
        headerTitleAllowFontScaling: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: (props) => renderIcon({ name: "home", ...props }),
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="Search"
        options={{
          tabBarIcon: (props) =>
            renderIcon({ name: "search-circle", ...props }),
        }}
      />
      <Tabs.Screen
        name="Orders"
        options={{
          tabBarIcon: (props) => renderIcon({ name: "bag-check", ...props }),
          tabBarBadge: 2,
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          tabBarIcon: (props) =>
            renderIcon({ name: "person-circle", ...props }),
        }}
      />
    </Tabs>
  );
};

export default Layout;
