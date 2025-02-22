import React, { memo } from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";

// Define tab configuration outside the component to prevent recreation
const TAB_CONFIG = [
  {
    name: "index",
    icon: "home",
  },
  {
    name: "Search",
    icon: "search-circle",
  },
  {
    name: "Orders",
    icon: "bag-check",
  },
  {
    name: "Profile",
    icon: "person-circle",
  },
];

// Common screen options to avoid repetition
const getScreenOptions = (theme) => ({
  headerTitleAlign: "center",
  headerStyle: { backgroundColor: theme.colors.primary },
  headerTintColor: theme.colors.textColor,
  tabBarStyle: {
    backgroundColor: theme.colors.primary,
    borderTopWidth: 0,
    elevation: 0, // Improves Android performance
  },
  tabBarActiveTintColor: theme.colors.textColor,
  tabBarInactiveTintColor: theme.colors.textColor + "80", // 50% opacity
});

// Tab icon renderer component
const TabIcon = memo(({ name, focused, color, size }) => (
  <Ionicons
    name={`${name}${focused ? "" : "-outline"}`}
    size={size}
    color={color}
  />
));

TabIcon.displayName = "TabIcon";

const Layout = () => {
  const theme = useTheme();

  // Memoize screen options to prevent unnecessary recalculations
  const screenOptions = React.useMemo(
    () => getScreenOptions(theme),
    [theme.colors.primary, theme.colors.textColor]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <TabIcon
                name={tab.icon}
                focused={focused}
                color={color}
                size={size}
              />
            ),
            // Optional: Add lazy loading for better performance
            lazy: true,
          }}
        />
      ))}
    </Tabs>
  );
};

export default memo(Layout);
