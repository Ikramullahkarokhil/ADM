import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Text,
  Alert,
} from "react-native";
import { useTheme, Divider, TouchableRipple, Avatar } from "react-native-paper";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useNavigation, useRouter } from "expo-router";
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
        <Avatar.Image
          source={{ uri: profileImage }}
          size={80}
          style={{ backgroundColor: theme.colors.surface }}
        />
      </TouchableRipple>
      <View style={styles.headerTextContainer}>
        <Text style={[styles.username, { color: theme.colors.text }]}>
          {username}
        </Text>
        <Text style={[styles.membershipText, { color: theme.colors.text }]}>
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
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleThemeSelect = useCallback(() => {
    const options = ["System Default", "Light", "Dark", "Cancel"];
    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions(
      { options, cancelButtonIndex, title: "Select Theme" },
      async (selectedIndex) => {
        if (
          selectedIndex !== undefined &&
          selectedIndex !== cancelButtonIndex
        ) {
          const themeOptions = ["system", "light", "dark"];
          const selectedTheme = themeOptions[selectedIndex];
          await setThemeMode(
            selectedTheme === "system" ? "system" : selectedTheme
          );
        }
      }
    );
  }, [showActionSheetWithOptions, setThemeMode]);

  const handleNavigation = useCallback(
    (screen) => {
      router.push(screen);
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/Login");
    } catch (error) {
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  }, [logout, router]);

  const getMembershipDuration = useCallback((regDateString) => {
    if (!regDateString) return "";
    const regDate = new Date(regDateString.replace(" ", "T"));
    const now = new Date();
    const diffMs = now - regDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 30)
      return `Member for ${diffDays} ${diffDays === 1 ? "day" : "days"}`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12)
      return `Member for ${diffMonths} ${
        diffMonths === 1 ? "month" : "months"
      }`;
    const diffYears = Math.floor(diffMonths / 12);
    return `Member for ${diffYears} ${diffYears === 1 ? "year" : "years"}`;
  }, []);

  const handleProfileImagePick = useCallback(async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission to access gallery is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!image) return Alert.alert("Please select an image first.");
    const MAX_SIZE = 100 * 1024; // 100KB
    let fileInfo = await FileSystem.getInfoAsync(image);
    if (fileInfo.size > MAX_SIZE) {
      let currentUri = image;
      let quality = 0.7;
      let iterations = 0;
      const maxIterations = 5;
      while (fileInfo.size > MAX_SIZE && iterations < maxIterations) {
        const manipResult = await ImageManipulator.manipulateAsync(
          currentUri,
          [],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        currentUri = manipResult.uri;
        fileInfo = await FileSystem.getInfoAsync(currentUri);
        quality *= 0.7;
        iterations++;
      }
      if (fileInfo.size > MAX_SIZE) {
        Alert.alert(
          "Image too large",
          "Could not compress the image below 100KB."
        );
        return;
      }
      setImage(currentUri);
    }
    try {
      await uploadConsumerImage({
        image: { uri: image, name: "photo.jpg", type: "image/jpeg" },
        consumer_id: profileData?.consumer_id,
      });
      Alert.alert("Success", "Image uploaded successfully!");
    } catch (error) {
      Alert.alert("Upload failed", error.message);
    }
  }, [image, profileData?.consumer_id, uploadConsumerImage]);

  useEffect(() => {
    if (image) handleUpload();
  }, [image, handleUpload]);

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
        },
      ]}
    >
      {items.map((item, index) => (
        <View key={index}>
          <TouchableRipple
            onPress={() =>
              item.screen ? handleNavigation(item.screen) : item.onPress?.()
            }
            accessibilityLabel={item.label}
          >
            <View style={styles.menuItem}>
              <Text
                style={[
                  styles.menuText,
                  {
                    color: item.special
                      ? theme.colors.error
                      : theme.colors.text,
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          </TouchableRipple>
          {index < items.length - 1 && (
            <Divider
              style={{ backgroundColor: theme.colors.subInactiveColor }}
            />
          )}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.primary }]}
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
  safeArea: { flex: 1 },
  container: { paddingBottom: 32 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 16,
    elevation: 4,
  },
  headerTextContainer: { marginLeft: 16 },
  username: { fontSize: 20, fontWeight: "bold" },
  membershipText: { fontSize: 14, marginTop: 4 },
  menuSection: {
    marginBottom: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    elevation: 5,
  },
  menuItem: { paddingVertical: 16, paddingHorizontal: 16 },
  menuText: { fontSize: 16 },
});
