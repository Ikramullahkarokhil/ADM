import { Pressable, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useColorScheme } from "react-native";
import {
  Button,
  Divider,
  IconButton,
  List,
  Menu,
  PaperProvider,
  Switch,
  useTheme,
} from "react-native-paper";
import useThemeStore from "../../components/store/useThemeStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useProductStore from "../../components/api/useProductStore";
import { useNavigation, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Profile = () => {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeStore();
  const colorScheme = useColorScheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { logout, user } = useProductStore();
  const navigation = useNavigation();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const getBiometricState = async () => {
      try {
        const storedState = await AsyncStorage.getItem("biometricEnabled");
        if (storedState !== null) {
          setBiometricEnabled(JSON.parse(storedState));
        }
      } catch (error) {
        console.error("Error retrieving biometric state:", error);
      }
    };
    getBiometricState();
  }, []);

  useLayoutEffect(() => {
    if (user) {
      navigation.setOptions({
        headerTitle: user.name,
      });
    }
  }, [navigation, user]);

  const getActionSheetStyles = () => ({
    textStyle: { color: theme.colors.textColor },
    titleTextStyle: {
      color: theme.colors.textColor,
      textAlign: "center",
      width: "100%",
      marginBottom: 8,
      fontSize: 16,
      fontWeight: "600",
    },
    containerStyle: {
      backgroundColor: theme.colors.primary,
    },
    messageTextStyle: {
      textAlign: "center",
      color: theme.colors.textColor,
    },
  });

  const handleThemeSelect = () => {
    const options = ["System Default", "Light", "Dark", "Cancel"];
    const cancelButtonIndex = options.length - 1;
    const styles = getActionSheetStyles();

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: "Select Theme",
        ...styles,
      },
      async (selectedIndex) => {
        if (
          selectedIndex !== undefined &&
          selectedIndex !== cancelButtonIndex
        ) {
          const themeOptions = ["system", "light", "dark"];
          const selectedTheme = themeOptions[selectedIndex];

          if (selectedTheme === "system") {
            await setThemeMode("system", colorScheme === "dark");
          } else {
            await setThemeMode(selectedTheme);
          }
        }
      }
    );
  };

  const getThemeText = () => {
    switch (themeMode) {
      case "system":
        return "System Default";
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "System Default";
    }
  };

  const [visible, setVisible] = useState(false);

  const openMenu = () => setVisible(true);

  const closeMenu = () => setVisible(false);

  const handleLogout = async () => {
    logout();
    router.navigate("Login");
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textColor }]}>
          Appearance
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.title, { color: theme.colors.textColor }]}>
            Theme
          </Text>
          <Pressable
            onPress={handleThemeSelect}
            style={[
              styles.selector,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Text
              style={[styles.selectorText, { color: theme.colors.textColor }]}
            >
              {getThemeText()}
            </Text>
            <IconButton
              icon="chevron-right"
              size={24}
              iconColor={theme.colors.textColor}
            />
          </Pressable>
        </View>
      </View>
      {/* Logout Button */}
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        Logout
      </Button>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
    opacity: 0.7,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  selectorText: {
    fontSize: 15,
  },
  themeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  themeText: {
    fontSize: 15,
  },
  logoutButton: {
    marginTop: 200,
  },
});
