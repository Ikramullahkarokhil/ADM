import React, { useState, memo, useCallback } from "react";
import { TouchableOpacity } from "react-native";
import { Tabs, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import useProductStore from "../../components/api/useProductStore";
import AlertDialog from "../../components/ui/AlertDialog"; // adjust path if needed

const Layout = () => {
  const theme = useTheme();
  const { user } = useProductStore();
  const router = useRouter();
  const [alertVisible, setAlertVisible] = useState(false);

  // Navigate to the Login screen when the user taps Login in the alert.
  const handleLogin = useCallback(() => {
    setAlertVisible(false);
    router.push("/Login");
  }, [router]);

  // Renders the icon for a tab.
  const renderIcon = useCallback(
    ({ name, focused, color, size }) => (
      <Ionicons
        name={`${name}${focused ? "" : "-outline"}`}
        size={size}
        color={color}
      />
    ),
    []
  );

  const CustomTabButton = memo((props) => {
    const { onPress, style, requireAuth } = props;
    const handlePress = useCallback(
      (e) => {
        if (requireAuth && !user) {
          setAlertVisible(true);
        } else {
          onPress(e);
        }
      },
      [user, onPress, requireAuth]
    );
    return (
      <TouchableOpacity
        {...props}
        onPress={handlePress}
        style={[style, requireAuth && !user && { opacity: 0.5 }]}
      />
    );
  });

  return (
    <>
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
            // No requireAuth prop here – accessible without login.
            tabBarButton: (props) => <CustomTabButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="Search"
          options={{
            tabBarIcon: (props) =>
              renderIcon({ name: "search-circle", ...props }),
            // No requireAuth prop here – accessible without login.
            tabBarButton: (props) => <CustomTabButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="Orders"
          options={{
            lazy: false,
            tabBarIcon: (props) => renderIcon({ name: "bag-check", ...props }),
            // Require authentication for Orders.
            tabBarButton: (props) => (
              <CustomTabButton {...props} requireAuth={true} />
            ),
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            lazy: false,
            tabBarIcon: (props) =>
              renderIcon({ name: "person-circle", ...props }),
            // Require authentication for Profile.
            tabBarButton: (props) => (
              <CustomTabButton {...props} requireAuth={true} />
            ),
          }}
        />
      </Tabs>

      <AlertDialog
        visible={alertVisible}
        title="Please Log In"
        message="You must be logged in to access this page."
        onDismiss={() => setAlertVisible(false)}
        onConfirm={handleLogin}
        confirmText="Login"
        cancelText="OK"
      />
    </>
  );
};

export default Layout;
