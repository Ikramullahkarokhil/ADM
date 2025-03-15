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
  Text,
  Alert,
  ActivityIndicator,
  useColorScheme,
  ToastAndroid,
  Image,
} from "react-native";
import {
  Divider,
  TouchableRipple,
  Avatar,
  Surface,
  useTheme,
  Button,
} from "react-native-paper";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useNavigation, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useThemeStore from "../../components/store/useThemeStore";
import useProductStore from "../../components/api/useProductStore";
import ChangePasswordModal from "../../components/ui/ChangePasswordModal";
import AlertDialog from "../../components/ui/AlertDialog";

const ProfileHeader = ({ profileImage, username, membership, theme }) => {
  const [isImageLoading, setIsImageLoading] = useState(true);

  return (
    <Surface
      style={[styles.headerSurface, { backgroundColor: theme.colors.primary }]}
    >
      <View style={styles.headerContainer}>
        <View style={styles.avatarContainer}>
          {isImageLoading && (
            <ActivityIndicator
              size="small"
              color={theme.colors.button}
              style={styles.imageLoader}
            />
          )}
          <Avatar.Image
            source={{
              uri:
                profileImage ||
                "https://img.freepik.com/premium-vector/user-profile-people-icon-isolated-white-background_322958-4540.jpg",
            }}
            size={80}
            style={{ backgroundColor: theme.colors.background }}
            onLoadStart={() => setIsImageLoading(true)}
            onLoadEnd={() => setIsImageLoading(false)}
            onError={() => {
              setIsImageLoading(false);
              console.log("Error loading profile image");
            }}
          />
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
      </View>
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
  const { profileData, logout, deleteConsumerAccount } = useProductStore();
  const navigation = useNavigation();
  const router = useRouter();
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const colorScheme = useColorScheme();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Actual deletion logic
  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true);
      await deleteConsumerAccount(profileData.consumer_id);
      ToastAndroid.show(
        `Account ${profileData.name} has deleted successfully`,
        ToastAndroid.SHORT
      );
      await logout();
      router.replace("/Login");
    } catch (error) {
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show the confirmation dialog when delete is requested
  const showDeleteDialog = () => {
    setIsDeleteDialogVisible(true);
  };

  const handleThemeSelect = useCallback(() => {
    const options = ["System Default", "Light", "Dark", "Cancel"];
    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        tintColor: theme.colors.textColor,
        containerStyle: { backgroundColor: theme.colors.primary },
        titleTextStyle: { color: theme.colors.textColor },
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

  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logout();
      router.replace("/Login");
    } catch (error) {
      Alert.alert("Error", "Failed to logout. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

  const accountSettings = [
    {
      icon: "account-edit",
      label: "Update Profile",
      screen: "/screens/UpdateProfile",
    },
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
    { icon: "apps", label: "More Features", screen: "screens/MoreFeatures" },
  ];

  // Modify the delete account action to show the delete confirmation dialog
  const accountActions = [
    { icon: "logout", label: "Logout", onPress: handleLogout, special: true },
    {
      icon: "delete-circle",
      label: "Delete Account",
      onPress: showDeleteDialog,
      special: true,
    },
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
            profileData?.consumer_image && profileData.consumer_image !== "null"
              ? profileData.consumer_image
              : "https://img.freepik.com/premium-vector/user-profile-people-icon-isolated-white-background_322958-4540.jpg"
          }
          username={profileData?.name || "Guest User"}
          membership={getMembershipDuration(profileData?.reg_date)}
          theme={theme}
        />

        {renderMenuGroup(accountSettings, "Account Settings")}
        {renderMenuGroup(appSettings, "App Settings")}
        {renderMenuGroup(accountActions, "Account Actions")}

        <ChangePasswordModal
          isVisible={isChangePasswordModalVisible}
          onClose={() => setChangePasswordModalVisible(false)}
        />
      </ScrollView>

      {/* AlertDialog for account deletion confirmation */}
      <AlertDialog
        visible={isDeleteDialogVisible}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone."
        onDismiss={() => setIsDeleteDialogVisible(false)}
        onConfirm={() => {
          setIsDeleteDialogVisible(false);
          handleDeleteAccount();
        }}
        confirmText="Delete"
        cancelText="Cancel"
      />
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
  imageLoader: {
    position: "absolute",
    top: 30,
    left: 30,
    zIndex: 1,
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
    marginTop: 15,
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
