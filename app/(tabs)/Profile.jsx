import React, { useLayoutEffect, useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Text,
  Alert,
} from "react-native";
import { useTheme, Divider, TouchableRipple } from "react-native-paper";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useNavigation, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import useThemeStore from "../../components/store/useThemeStore";
import useProductStore from "../../components/api/useProductStore";
import ChangePasswordModal from "../../components/ui/ChangePasswordModal";

const ProfileHeader = ({
  profileImage,
  username,
  membership,
  theme,
  onProfileImagePick,
}) => {
  return (
    <View
      style={[
        styles.headerContainer,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <TouchableRipple
        onPress={onProfileImagePick}
        accessibilityLabel="Change profile picture"
        accessibilityRole="button"
      >
        <Image
          source={{ uri: profileImage }}
          style={[
            styles.profileImage,
            { borderColor: theme.colors.inactiveColor },
          ]}
          accessibilityLabel="Profile picture"
        />
      </TouchableRipple>
      <View style={styles.headerTextContainer}>
        <Text style={[styles.username, { color: theme.colors.textColor }]}>
          {username}
        </Text>
        <Text
          style={[styles.membershipText, { color: theme.colors.inactiveColor }]}
        >
          {membership}
        </Text>
      </View>
    </View>
  );
};

const Profile = () => {
  const theme = useTheme();
  const { setThemeMode } = useThemeStore();
  const { showActionSheetWithOptions } = useActionSheet();
  const { uploadConsumerImage, profileData, logout } = useProductStore();
  const [image, setImage] = useState(null);
  const navigation = useNavigation();
  const router = useRouter();
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleThemeSelect = () => {
    const options = ["System Default", "Light", "Dark", "Cancel"];
    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: "Select Theme",
      },
      async (selectedIndex) => {
        if (
          selectedIndex !== undefined &&
          selectedIndex !== cancelButtonIndex
        ) {
          const themeOptions = ["system", "light", "dark"];
          const selectedTheme = themeOptions[selectedIndex];

          if (selectedTheme === "system") {
            await setThemeMode("system", false);
          } else {
            await setThemeMode(selectedTheme);
          }
        }
      }
    );
  };

  const handleNavigation = (screen) => {
    router.push(screen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/Login");
    } catch (error) {
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const getMembershipDuration = (regDateString) => {
    if (!regDateString) return "";
    const regDate = new Date(regDateString.replace(" ", "T"));
    const now = new Date();
    const diffMs = now - regDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `Member for ${diffDays} ${diffDays === 1 ? "day" : "days"}`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `Member for ${diffMonths} ${
        diffMonths === 1 ? "month" : "months"
      }`;
    }

    const diffYears = Math.floor(diffMonths / 12);
    return `Member for ${diffYears} ${diffYears === 1 ? "year" : "years"}`;
  };

  const handleProfileImagePick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission to access gallery is required!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert("Please select an image first.");
      return;
    }

    const MAX_SIZE = 100 * 1024; // 100KB
    let fileInfo = await FileSystem.getInfoAsync(image);

    // If image is larger than 100KB, attempt to compress it iteratively.
    if (fileInfo.size && fileInfo.size > MAX_SIZE) {
      let currentUri = image;
      let currentFileInfo = fileInfo;
      let quality = 0.7; // initial compression quality
      let iterations = 0;
      const maxIterations = 5;

      while (currentFileInfo.size > MAX_SIZE && iterations < maxIterations) {
        const manipResult = await ImageManipulator.manipulateAsync(
          currentUri,
          [],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        currentUri = manipResult.uri;
        currentFileInfo = await FileSystem.getInfoAsync(currentUri);
        quality *= 0.7; // further reduce quality for next iteration if needed
        iterations++;
      }

      if (currentFileInfo.size > MAX_SIZE) {
        Alert.alert(
          "Image too large",
          "Could not compress the image below 100KB. Please choose a different image."
        );
        return;
      }

      // Update the image state to the compressed image and exit.
      setImage(currentUri);
      return;
    }

    try {
      const response = await uploadConsumerImage({
        image: {
          uri: image,
          name: "photo.jpg",
          type: "image/jpeg",
        },
        consumer_id: profileData?.consumer_id,
      });
      console.log("Upload response:", response);
      Alert.alert("Success", "Image uploaded successfully!");
    } catch (error) {
      console.log("Upload error:", error);
      Alert.alert("Upload failed", error.message);
    }
  };

  useEffect(() => {
    if (image) {
      handleUpload();
    }
  }, [image]);

  const accountSettings = [
    { label: "Update Profile", screen: "UpdateProfile" },
    {
      label: "Change Password",
      onPress: () => setChangePasswordModalVisible(true),
    },
    { label: "Billing Address", screen: "/screens/BillingAddress" },
    { label: "Favorite Products", screen: "/screens/Favorite" },
  ];

  const appSettings = [
    { label: "Change Theme", onPress: handleThemeSelect },
    { label: "More Features", screen: "MoreFeatures" },
  ];

  const accountActions = [
    { label: "Logout", onPress: handleLogout, special: true },
  ];

  const renderMenuGroup = (items) => (
    <View
      style={[
        styles.menuSection,
        {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.subInactiveColor,
        },
      ]}
    >
      {items.map((item, index) => (
        <View key={index}>
          <TouchableRipple
            onPress={() => {
              if (item.screen) {
                handleNavigation(item.screen);
              } else if (item.onPress) {
                item.onPress();
              }
            }}
          >
            <View style={styles.menuItem}>
              <Text
                style={[
                  { color: theme.colors.textColor },
                  item.special ? styles.logoutText : null,
                ]}
              >
                {item.label}
              </Text>
            </View>
          </TouchableRipple>
          {index < items.length - 1 && (
            <Divider
              style={[
                styles.menuDivider,
                { backgroundColor: theme.colors.subInactiveColor },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <ProfileHeader
          profileImage={
            profileData?.consumer_image ||
            "https://img.freepik.com/premium-vector/user-profile-people-icon-isolated-white-background_322958-4540.jpg"
          }
          username={profileData?.name || "Guest User"}
          membership={getMembershipDuration(profileData?.reg_date)}
          theme={theme}
          onProfileImagePick={handleProfileImagePick}
        />

        {renderMenuGroup(accountSettings)}
        {renderMenuGroup(appSettings)}
        {renderMenuGroup(accountActions)}

        <ChangePasswordModal
          isVisible={isChangePasswordModalVisible}
          onClose={() => setChangePasswordModalVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingBottom: 32,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 40,
    marginBottom: 20,
    paddingBottom: 5,
    paddingHorizontal: 10,
    elevation: 5,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
  },
  membershipText: {
    fontSize: 14,
  },
  menuSection: {
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: "#e53935",
  },
});
