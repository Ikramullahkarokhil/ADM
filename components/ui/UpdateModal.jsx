import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Alert,
  Linking,
  ScrollView,
  BackHandler,
} from "react-native";
import Modal from "react-native-modal";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

const UpdateModal = ({ visible, onClose, currentVersion, versionData }) => {
  const { width: windowWidth } = useWindowDimensions();
  const [isDownloading, setIsDownloading] = useState(false);
  const [latestVersionInfo, setLatestVersionInfo] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);

  const { colors } = useTheme();

  useEffect(() => {
    if (versionData && versionData.length > 0) {
      const latestVersion = versionData.reduce((latest, current) =>
        new Date(current.release_date) > new Date(latest.release_date)
          ? current
          : latest
      );
      setLatestVersionInfo(latestVersion);

      const currentVersionInfo = versionData.find(
        (version) => version.version === currentVersion
      );

      if (currentVersionInfo) {
        const expiry = new Date(currentVersionInfo.expiry_date);
        setExpiryDate(expiry);
        if (expiry < new Date()) {
          setIsExpired(true);
        }
      }
    }
  }, [versionData, currentVersion]);

  const handleUpdate = async () => {
    if (!latestVersionInfo?.url) {
      console.error("No URL provided for update.");
      return;
    }

    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Linking.openURL(latestVersionInfo.url);
      onClose();
      return;
    }

    setIsDownloading(true);

    try {
      const canOpen = await Linking.canOpenURL(latestVersionInfo.url);

      if (canOpen) {
        await Linking.openURL(latestVersionInfo.url);
        setIsDownloading(false);
        return;
      }
    } catch (error) {
      console.error("Download failed:", error);
      setIsDownloading(false);

      Alert.alert(
        "Download Error",
        "Failed to open download link. Please try again or download manually.",
        [
          { text: "Try Again", onPress: () => handleUpdate() },
          {
            text: "Download in Browser",
            onPress: () => {
              Linking.openURL(latestVersionInfo.url);
              onClose();
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleClose = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const formatExpiryDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View>
      <Modal
        isVisible={visible}
        onBackButtonPress={!isDownloading ? handleClose : null}
        backdropOpacity={0.3}
        backdropTransitionOutTiming={0}
        animationIn="fadeInUp"
        animationOut="fadeOutDown"
        animationInTiming={500}
        animationOutTiming={50}
        useNativeDriver={true}
        style={styles.modal}
      >
        <View
          style={[
            styles.modalContent,
            {
              width: windowWidth * 0.85,
              maxWidth: 400,
              backgroundColor: colors.primary,
              shadowColor: colors.activeColor,
            },
          ]}
        >
          <View
            style={[
              styles.updateIconContainer,
              { backgroundColor: colors.activeIndicatorStyle },
            ]}
          >
            <Feather name="download" size={32} color={colors.button} />
          </View>

          <Text style={[styles.title, { color: colors.textColor }]}>
            {isDownloading ? "Opening Download" : "Update Available"}
          </Text>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />

          {!isDownloading && (
            <Text style={[styles.message, { color: colors.inactiveColor }]}>
              A new version of the app is available.
            </Text>
          )}

          {!isDownloading && (
            <View style={styles.versionContainer}>
              <View style={styles.versionItem}>
                <Text
                  style={[styles.versionLabel, { color: colors.inactiveColor }]}
                >
                  Current version
                </Text>
                <Text
                  style={[styles.versionValue, { color: colors.textColor }]}
                >
                  {currentVersion}
                </Text>
              </View>

              <View style={styles.versionArrow}>
                <Feather
                  name="arrow-right"
                  size={20}
                  color={colors.inactiveColor}
                />
              </View>

              <View style={styles.versionItem}>
                <Text
                  style={[styles.versionLabel, { color: colors.inactiveColor }]}
                >
                  Latest version
                </Text>
                <Text
                  style={[
                    styles.versionValue,
                    styles.latestVersion,
                    { color: colors.textColor },
                  ]}
                >
                  {latestVersionInfo?.version || "N/A"}
                </Text>
              </View>
            </View>
          )}

          {!isDownloading && latestVersionInfo?.description && (
            <View style={styles.descriptionContainer}>
              <Text
                style={[styles.descriptionTitle, { color: colors.textColor }]}
              >
                What's New
              </Text>
              <ScrollView
                style={styles.descriptionScroll}
                showsVerticalScrollIndicator={true}
              >
                <Text
                  style={[
                    styles.descriptionText,
                    { color: colors.inactiveColor },
                  ]}
                >
                  {latestVersionInfo.description}
                </Text>
              </ScrollView>
            </View>
          )}

          {isDownloading && (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: colors.textColor }]}>
                Opening download in your browser...
              </Text>
              <View style={styles.loadingIndicator}>
                <Feather name="loader" size={24} color={colors.textColor} />
              </View>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { borderColor: colors.subInactiveColor },
                ]}
                onPress={() => {
                  setIsDownloading(false);
                }}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.inactiveColor },
                  ]}
                >
                  cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isDownloading && (
            <View style={styles.buttonContainer}>
              {isExpired ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonAlternative,
                      { borderColor: colors.subInactiveColor },
                    ]}
                    onPress={() => BackHandler.exitApp()}
                    accessible={true}
                    accessibilityLabel="Close"
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonAlternativeText,
                        { color: colors.textColor },
                      ]}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.button,
                        shadowColor: colors.activeColor,
                      },
                    ]}
                    onPress={handleUpdate}
                    accessible={true}
                    accessibilityLabel="Update Now"
                    accessibilityHint="Downloads and installs the update"
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonPrimaryText}>Update Now</Text>
                    <Feather
                      name="external-link"
                      size={16}
                      color={colors.primary}
                      style={styles.buttonIcon}
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonSecondary,
                      { borderColor: colors.subInactiveColor },
                    ]}
                    onPress={handleClose}
                    accessible={true}
                    accessibilityLabel="Later"
                    accessibilityHint="Closes the update modal and postpones the update"
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonSecondaryText,
                        { color: colors.textColor },
                      ]}
                    >
                      Later
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.button,
                        shadowColor: colors.activeColor,
                      },
                    ]}
                    onPress={handleUpdate}
                    accessible={true}
                    accessibilityLabel="Update Now"
                    accessibilityHint="Downloads and installs the update"
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonPrimaryText}>Update Now</Text>
                    <Feather
                      name="external-link"
                      size={16}
                      color={colors.primary}
                      style={styles.buttonIcon}
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {expiryDate && (
            <Text style={[styles.expiryDate, { color: colors.inactiveColor }]}>
              {"Current version expires"}: {formatExpiryDate(expiryDate)}
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 100,
  },
  updateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 12,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  versionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  versionItem: {
    alignItems: "center",
    flex: 1,
  },
  versionArrow: {
    paddingHorizontal: 8,
  },
  versionLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  versionValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  expiryDate: {
    fontSize: 12,
    marginTop: 10,
  },
  latestVersion: {
    fontWeight: "bold",
  },
  descriptionContainer: {
    width: "100%",
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  descriptionScroll: {
    maxHeight: 120,
    width: "100%",
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingBottom: 8,
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 16,
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  button: {
    borderRadius: 12,
    padding: 14,
    minWidth: "45%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  buttonPrimaryText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
  buttonSecondaryText: {
    fontWeight: "500",
    fontSize: 15,
  },
  buttonIcon: {
    marginLeft: 6,
  },
  buttonAlternative: {
    borderWidth: 1,
  },
  buttonAlternativeText: {
    fontWeight: "500",
    fontSize: 15,
  },
});

export default UpdateModal;
