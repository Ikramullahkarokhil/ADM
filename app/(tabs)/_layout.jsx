import React, { useState, useCallback, memo, forwardRef } from "react";
import { TouchableOpacity } from "react-native";
import { Tabs, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import useProductStore from "../../components/api/useProductStore";
import AlertDialog from "../../components/ui/AlertDialog"; // adjust if needed

// Icon Renderer Memoized
const renderIcon = ({ name, focused, color, size }) => (
  <Ionicons
    name={`${name}${focused ? "" : "-outline"}`}
    size={size}
    color={color}
  />
);

// Custom tab button with auth check
const CustomTabButton = memo(
  forwardRef(({ onPress, style, requireAuth, user, ...rest }, ref) => {
    const handlePress = useCallback(
      (e) => {
        if (requireAuth && !user) {
          rest.setAlertVisible(true);
        } else {
          onPress?.(e);
        }
      },
      [requireAuth, user, onPress, rest]
    );

    return (
      <TouchableOpacity
        {...rest}
        ref={ref}
        onPress={handlePress}
        style={[style, requireAuth && !user && { opacity: 0.5 }]}
      />
    );
  })
);

const Layout = () => {
  const theme = useTheme();
  const { user } = useProductStore();
  const router = useRouter();
  const [alertVisible, setAlertVisible] = useState(false);

  // Navigate to login screen
  const handleLogin = useCallback(() => {
    setAlertVisible(false);
    router.replace("/Login");
  }, [router]);

  const screenOptions = {
    headerTitleAlign: "center",
    headerStyle: { backgroundColor: theme.colors.primary },
    headerTintColor: theme.colors.textColor,
    tabBarStyle: { backgroundColor: theme.colors.primary },
    tabBarActiveTintColor: theme.colors.textColor,
    tabBarInactiveTintColor: theme.colors.textColor + "80",
    tabBarAllowFontScaling: true,
    headerTitleAllowFontScaling: true,
    tabBarHideOnKeyboard: true,
  };

  return (
    <>
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: (props) => renderIcon({ name: "home", ...props }),
            tabBarLabel: "Home",
            tabBarButton: (props) => (
              <CustomTabButton
                {...props}
                user={user}
                setAlertVisible={setAlertVisible}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Search"
          options={{
            tabBarIcon: (props) =>
              renderIcon({ name: "search-circle", ...props }),
            tabBarButton: (props) => (
              <CustomTabButton
                {...props}
                user={user}
                setAlertVisible={setAlertVisible}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Orders"
          options={{
            lazy: false,
            tabBarIcon: (props) => renderIcon({ name: "bag-check", ...props }),
            tabBarButton: (props) => (
              <CustomTabButton
                {...props}
                requireAuth
                user={user}
                setAlertVisible={setAlertVisible}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            lazy: false,
            tabBarIcon: (props) =>
              renderIcon({ name: "person-circle", ...props }),
            tabBarButton: (props) => (
              <CustomTabButton
                {...props}
                requireAuth
                user={user}
                setAlertVisible={setAlertVisible}
              />
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
