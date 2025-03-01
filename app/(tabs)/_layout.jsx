import React, { useState } from "react";
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

  // When the user taps the Login button in the alert, navigate to the login screen.
  const handleLogin = () => {
    setAlertVisible(false);
    router.push("/Login");
  };

  // Renders the icon for a tab.
  const renderIcon = ({ name, focused, color, size }) => (
    <Ionicons
      name={`${name}${focused ? "" : "-outline"}`}
      size={size}
      color={color}
    />
  );

  // Custom tab button that shows the AlertDialog when the user isn't logged in.
  const CustomTabButton = (props) => {
    const { onPress, style } = props;
    return (
      <TouchableOpacity
        {...props}
        onPress={(e) => {
          if (!user) {
            setAlertVisible(true);
          } else {
            onPress(e);
          }
        }}
        style={[style, !user && { opacity: 0.5 }]}
      />
    );
  };

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
            tabBarButton: (props) => <CustomTabButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            tabBarIcon: (props) =>
              renderIcon({ name: "person-circle", ...props }),
            tabBarButton: (props) => <CustomTabButton {...props} />,
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
