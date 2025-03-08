"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  useColorScheme,
} from "react-native";
import {
  Divider,
  TouchableRipple,
  Avatar,
  Surface,
  useTheme,
} from "react-native-paper";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useNavigation, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import useThemeStore from "../../components/store/useThemeStore";
import useProductStore from "../../components/api/useProductStore";
import ChangePasswordModal from "../../components/ui/ChangePasswordModal";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const ProfileHeader = ({
  profileImage,
  username,
  membership,
  theme,
  onProfileImagePick,
  isLoading,
}) => {
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Surface
      style={[styles.headerSurface, { backgroundColor: theme.colors.primary }]}
    >
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.avatarContainer}>
          <TouchableRipple
            onPress={onProfileImagePick}
            accessibilityLabel="Change profile picture"
            accessibilityRole="button"
            style={styles.avatarRipple}
            borderless
            rippleColor={theme.colors.ripple}
          >
            <>
              <Avatar.Image
                source={{ uri: profileImage }}
                size={80}
                style={{ backgroundColor: theme.colors.background }}
              />
              <View
                style={[
                  styles.editIconContainer,
                  { backgroundColor: theme.colors.button },
                ]}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={14}
                  color="#FFFFFF"
                />
              </View>
              {isLoading && (
                <View
                  style={[
                    styles.loadingOverlay,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <ActivityIndicator color={theme.colors.button} size="small" />
                </View>
              )}
            </>
          </TouchableRipple>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.username, { color: theme.colors.textColor }]}>
            {username}
          </Text>
          <View style={styles.membershipContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={theme.colors.inactiveColor}
              style={styles.membershipIcon}
            />
            <Text
              style={[
                styles.membershipText,
                { color: theme.colors.inactiveColor },
              ]}
            >
              {membership}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Surface>
  );
};

const MenuItem = ({
  icon,
  label,
  onPress,
  theme,
  special = false,
  isLast = false,
}) => (
  <>
    <TouchableRipple
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      rippleColor={theme.colors.ripple}
    >
      <View style={styles.menuItem}>
        <View style={styles.menuIconContainer}>
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={special ? theme.colors.deleteButton : theme.colors.button}
          />
        </View>
        <Text
          style={[
            styles.menuText,
            {
              color: special
                ? theme.colors.deleteButton
                : theme.colors.textColor,
            },
          ]}
        >
          {label}
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.inactiveColor}
          style={styles.menuArrow}
        />
      </View>
    </TouchableRipple>
    {!isLast && (
      <Divider style={{ backgroundColor: theme.colors.subInactiveColor }} />
    )}
  </>
);

const SectionTitle = ({ title, theme }) => (
  <Text style={[styles.sectionTitle, { color: theme.colors.inactiveColor }]}>
    {title}
  </Text>
);

const Profile = () => {
  const { themeMode, setThemeMode } = useThemeStore();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { uploadConsumerImage, profileData, logout, fetchProfileData } =
    useProductStore();
  const [imageUri, setImageUri] = useState(null);
  const navigation = useNavigation();
  const router = useRouter();
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleThemeSelect = useCallback(() => {
    const options = ["System Default", "Light", "Dark", "Cancel"];
    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        tintColor: theme.colors.button,
        containerStyle: { backgroundColor: theme.colors.primary },
        titleTextStyle: { color: theme.colors.textColor },
        messageTextStyle: { color: theme.colors.inactiveColor },
        optionsTextStyle: { color: theme.colors.textColor },
      },
      async (selectedIndex) => {
        if (
          selectedIndex !== undefined &&
          selectedIndex !== cancelButtonIndex
        ) {
          const themeOptions = ["system", "light", "dark"];
          const selectedTheme = themeOptions[selectedIndex];
          await setThemeMode(selectedTheme, colorScheme === "dark");
        }
      }
    );
  }, [showActionSheetWithOptions, setThemeMode, theme, colorScheme]);

  const handleNavigation = useCallback(
    (screen) => {
      router.push(screen);
    },
    [router]
  );

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await logout();
              router.replace("/Login");
            } catch (error) {
              Alert.alert("Error", "Failed to logout. Please try again.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [logout, router]);

  const getMembershipDuration = useCallback((regDateString) => {
    if (!regDateString) return "New member";
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
    const options = ["Take Photo", "Choose from Library", "Cancel"];
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        tintColor: theme.colors.button,
        containerStyle: { backgroundColor: theme.colors.primary },
      },
      async (selectedIndex) => {
        if (selectedIndex === cancelButtonIndex) return;

        let permissionResult;
        let result;

        try {
          if (selectedIndex === 0) {
            permissionResult =
              await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
              Alert.alert(
                "Permission Denied",
                "Permission to access camera is required!"
              );
              return;
            }
            result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });
          } else {
            permissionResult =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
              Alert.alert(
                "Permission Denied",
                "Permission to access gallery is required!"
              );
              return;
            }
            result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });
          }

          if (!result.canceled) {
            setImageUri(result.assets[0].uri);
          }
        } catch (error) {
          Alert.alert("Error", "Failed to pick image");
        }
      }
    );
  }, [showActionSheetWithOptions, theme]);

  const handleUpload = useCallback(async () => {
    if (!imageUri) return;

    const MAX_SIZE = 100 * 1024;
    let manipResult = { uri: imageUri };

    try {
      setIsLoading(true);
      const info = await FileSystem.getInfoAsync(imageUri);
      let size = info.size;

      if (size > MAX_SIZE) {
        let quality = 0.7;
        let iterations = 0;
        const maxIterations = 5;

        while (size > MAX_SIZE && iterations < maxIterations) {
          manipResult = await ImageManipulator.manipulateAsync(
            manipResult.uri,
            [],
            {
              compress: quality,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );
          const newInfo = await FileSystem.getInfoAsync(manipResult.uri);
          size = newInfo.size;
          quality *= 0.7;
          iterations++;
        }

        if (size > MAX_SIZE) {
          Alert.alert(
            "Image Too Large",
            "Could not compress the image below 100KB."
          );
          setIsLoading(false);
          return;
        }
      }

      const apiUrl =
        "https://demo.ucsofficialstore.com/api/consumer/upload-image";
      const response = await FileSystem.uploadAsync(apiUrl, manipResult.uri, {
        httpMethod: "POST",
        headers: { Accept: "application/json" },
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "image",
        parameters: { consumer_id: profileData?.consumer_id },
      });

      const result = JSON.parse(response.body);
      if (response.status === 200) {
        Alert.alert("Success", "Profile image updated successfully!");
        setImageUri(null);
        await fetchProfileData(); // Refresh profile data
      } else {
        Alert.alert("Upload Failed", result.message || "Upload failed");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to upload image");
    } finally {
      setIsLoading(false);
    }
  }, [imageUri, profileData?.consumer_id, fetchProfileData]);

  useEffect(() => {
    if (imageUri) handleUpload();
  }, [imageUri, handleUpload]);

  const accountSettings = [
    { icon: "account-edit", label: "Update Profile", screen: "UpdateProfile" },
    {
      icon: "lock-reset",
      label: "Change Password",
      onPress: () => setChangePasswordModalVisible(true),
    },
    {
      icon: "map-marker",
      label: "Billing Address",
      screen: "/screens/BillingAddress",
    },
    { icon: "heart", label: "Favorite Products", screen: "/screens/Favorite" },
  ];

  const appSettings = [
    {
      icon: themeMode === "dark" ? "weather-night" : "weather-sunny",
      label: `Theme (${
        themeMode === "dark"
          ? "Dark"
          : themeMode === "light"
          ? "Light"
          : "System"
      })`,
      onPress: handleThemeSelect,
    },
    { icon: "apps", label: "More Features", screen: "MoreFeatures" },
  ];

  const accountActions = [
    { icon: "logout", label: "Logout", onPress: handleLogout, special: true },
  ];

  const renderMenuGroup = (items, title) => (
    <>
      <SectionTitle title={title} theme={theme} />
      <Surface
        style={[styles.menuSection, { backgroundColor: theme.colors.primary }]}
      >
        {items.map((item, index) => (
          <MenuItem
            key={index}
            icon={item.icon}
            label={item.label}
            onPress={() =>
              item.screen ? handleNavigation(item.screen) : item.onPress?.()
            }
            theme={theme}
            special={item.special}
            isLast={index === items.length - 1}
          />
        ))}
      </Surface>
    </>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.primary }]}
    >
      {isRefreshing && (
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ActivityIndicator color={theme.colors.button} size="large" />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profileImage={
            profileData?.consumer_image ||
            "https://img.freepik.com/premium-vector/user-profile-people-icon-isolated-white-background_322958-4540.jpg"
          }
          username={profileData?.name || "Guest User"}
          membership={getMembershipDuration(profileData?.reg_date)}
          theme={theme}
          onProfileImagePick={handleProfileImagePick}
          isLoading={isLoading}
        />

        {renderMenuGroup(accountSettings, "Account Settings")}
        {renderMenuGroup(appSettings, "App Settings")}
        {renderMenuGroup(accountActions, "Account Actions")}

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
    paddingHorizontal: 16,
  },
  headerSurface: {
    marginTop: 40,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarRipple: {
    borderRadius: 40,
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.7,
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: "bold",
  },
  membershipContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  membershipIcon: {
    marginRight: 4,
  },
  membershipText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 8,
  },
  menuSection: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
  },
  menuItem: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  menuIconContainer: {
    width: 40,
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    flex: 1,
  },
  menuArrow: {
    opacity: 0.5,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
