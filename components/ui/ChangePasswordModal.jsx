import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import useProductStore from "../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import ToastNotification from "../../components/ui/ToastNotification";

const ChangePasswordModal = ({ isVisible, onClose }) => {
  const { colors } = useTheme();
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState({
    lengthValid: false,
    matchValid: false,
    hasLetter: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [feedback, setFeedback] = useState({
    visible: false,
    type: "", // 'success' or 'error'
    message: "",
  });
  const { changePassword, profileData } = useProductStore();

  useEffect(() => {
    // Validate password complexity
    const hasLetter = /[a-zA-Z]/.test(passwords.newPassword);
    const hasNumber = /\d/.test(passwords.newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      passwords.newPassword
    );

    setValidation((prev) => ({
      ...prev,
      lengthValid: passwords.newPassword.length >= 6,
      hasLetter,
      hasNumber,
      hasSpecialChar,
      matchValid:
        passwords.newPassword === passwords.confirmPassword &&
        passwords.newPassword.length > 0,
    }));
  }, [passwords]);

  const showFeedback = (type, message) => {
    setFeedback({
      visible: true,
      type,
      message,
    });
  };

  const hideFeedback = () => {
    setFeedback({ ...feedback, visible: false });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChangePassword = async () => {
    const { newPassword, confirmPassword } = passwords;

    // Client-side validations remain the same
    if (newPassword.length < 6) {
      showFeedback("error", "Password must be at least 6 characters long");
      return;
    }

    if (
      !validation.hasLetter ||
      !validation.hasNumber ||
      !validation.hasSpecialChar
    ) {
      showFeedback(
        "error",
        "Password must include one letter, one number, and one special character"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showFeedback("error", "Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({
        consumerID: profileData?.consumer_id,
        password: newPassword,
      });
      showFeedback("success", "Password changed successfully");
      setTimeout(() => {
        onClose();
        setPasswords({ newPassword: "", confirmPassword: "" });
      }, 1500);
    } catch (error) {
      // Directly show the API error response
      const apiErrorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to change password";
      showFeedback("error", apiErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!profileData) {
    return null;
  }

  const formattedDate = new Date(
    profileData.last_password_change_at
  ).toLocaleDateString();

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: "rgba(0, 0, 0, 0.6)" },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.activeColor,
              },
            ]}
          >
            <View style={styles.header}>
              <MaterialCommunityIcons
                name="form-textbox-password"
                size={28}
                color={colors.button}
                style={styles.titleIcon}
              />
              <Text style={[styles.title, { color: colors.textColor }]}>
                Change Password
              </Text>
            </View>

            <View style={styles.lastChangedContainer}>
              <Feather name="calendar" size={16} color={colors.inactiveColor} />
              <Text style={[styles.subtitle, { color: colors.inactiveColor }]}>
                Last changed: {formattedDate}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.primary,
                    borderColor:
                      validation.lengthValid &&
                      validation.hasLetter &&
                      validation.hasNumber &&
                      validation.hasSpecialChar
                        ? colors.button
                        : passwords.newPassword.length > 0
                        ? colors.warning
                        : colors.subInactiveColor,
                    color: colors.textColor,
                  },
                ]}
                placeholder="New Password"
                placeholderTextColor={colors.inactiveColor}
                secureTextEntry={!showPassword.newPassword}
                value={passwords.newPassword}
                onChangeText={(text) =>
                  setPasswords((prev) => ({ ...prev, newPassword: text }))
                }
                accessibilityLabel="New Password"
                accessibilityHint="Enter your new password (minimum 6 characters with at least one letter, one number, and one special character)"
              />
              <View style={styles.inputIcons}>
                <TouchableOpacity
                  onPress={() => togglePasswordVisibility("newPassword")}
                  style={styles.visibilityIcon}
                >
                  <Feather
                    name={showPassword.newPassword ? "eye-off" : "eye"}
                    size={20}
                    color={colors.inactiveColor}
                  />
                </TouchableOpacity>
                {passwords.newPassword.length > 0 && (
                  <Feather
                    name={
                      validation.lengthValid &&
                      validation.hasLetter &&
                      validation.hasNumber &&
                      validation.hasSpecialChar
                        ? "check-circle"
                        : "alert-circle"
                    }
                    size={20}
                    color={
                      validation.lengthValid &&
                      validation.hasLetter &&
                      validation.hasNumber &&
                      validation.hasSpecialChar
                        ? colors.button
                        : colors.warning
                    }
                  />
                )}
              </View>
            </View>

            {passwords.newPassword.length > 0 && (
              <View style={styles.validationContainer}>
                <View style={styles.validationMessage}>
                  <Feather
                    name={validation.lengthValid ? "check" : "alert-circle"}
                    size={14}
                    color={
                      validation.lengthValid ? colors.button : colors.warning
                    }
                  />
                  <Text
                    style={[
                      styles.validationText,
                      {
                        color: validation.lengthValid
                          ? colors.button
                          : colors.warning,
                      },
                    ]}
                  >
                    {validation.lengthValid
                      ? " Meets minimum length"
                      : " Must be at least 6 characters"}
                  </Text>
                </View>
                <View style={styles.validationMessage}>
                  <Feather
                    name={validation.hasLetter ? "check" : "alert-circle"}
                    size={14}
                    color={
                      validation.hasLetter ? colors.button : colors.warning
                    }
                  />
                  <Text
                    style={[
                      styles.validationText,
                      {
                        color: validation.hasLetter
                          ? colors.button
                          : colors.warning,
                      },
                    ]}
                  >
                    {validation.hasLetter
                      ? " Contains a letter"
                      : " Needs a letter"}
                  </Text>
                </View>
                <View style={styles.validationMessage}>
                  <Feather
                    name={validation.hasNumber ? "check" : "alert-circle"}
                    size={14}
                    color={
                      validation.hasNumber ? colors.button : colors.warning
                    }
                  />
                  <Text
                    style={[
                      styles.validationText,
                      {
                        color: validation.hasNumber
                          ? colors.button
                          : colors.warning,
                      },
                    ]}
                  >
                    {validation.hasNumber
                      ? " Contains a number"
                      : " Needs a number"}
                  </Text>
                </View>
                <View style={styles.validationMessage}>
                  <Feather
                    name={validation.hasSpecialChar ? "check" : "alert-circle"}
                    size={14}
                    color={
                      validation.hasSpecialChar ? colors.button : colors.warning
                    }
                  />
                  <Text
                    style={[
                      styles.validationText,
                      {
                        color: validation.hasSpecialChar
                          ? colors.button
                          : colors.warning,
                      },
                    ]}
                  >
                    {validation.hasSpecialChar
                      ? " Contains a special character"
                      : " Needs a special character"}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.primary,
                    borderColor: validation.matchValid
                      ? colors.button
                      : passwords.confirmPassword.length > 0
                      ? colors.warning
                      : colors.subInactiveColor,
                    color: colors.textColor,
                  },
                ]}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.inactiveColor}
                secureTextEntry={!showPassword.confirmPassword}
                value={passwords.confirmPassword}
                onChangeText={(text) =>
                  setPasswords((prev) => ({ ...prev, confirmPassword: text }))
                }
                accessibilityLabel="Confirm New Password"
                accessibilityHint="Re-enter your new password to confirm"
              />
              <View style={styles.inputIcons}>
                <TouchableOpacity
                  onPress={() => togglePasswordVisibility("confirmPassword")}
                  style={styles.visibilityIcon}
                >
                  <Feather
                    name={showPassword.confirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color={colors.inactiveColor}
                  />
                </TouchableOpacity>
                {passwords.confirmPassword.length > 0 && (
                  <Feather
                    name={
                      validation.matchValid ? "check-circle" : "alert-circle"
                    }
                    size={20}
                    color={
                      validation.matchValid ? colors.button : colors.warning
                    }
                  />
                )}
              </View>
            </View>

            {passwords.confirmPassword.length > 0 && (
              <View style={styles.validationMessage}>
                <Feather
                  name={validation.matchValid ? "check" : "alert-circle"}
                  size={14}
                  color={validation.matchValid ? colors.button : colors.warning}
                />
                <Text
                  style={[
                    styles.validationText,
                    {
                      color: validation.matchValid
                        ? colors.button
                        : colors.warning,
                    },
                  ]}
                >
                  {validation.matchValid
                    ? " Passwords match"
                    : " Passwords don't match"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    validation.lengthValid &&
                    validation.matchValid &&
                    validation.hasLetter &&
                    validation.hasNumber &&
                    validation.hasSpecialChar
                      ? colors.button
                      : colors.disabled,
                  shadowColor: colors.activeColor,
                },
              ]}
              onPress={handleChangePassword}
              disabled={
                isLoading ||
                !validation.lengthValid ||
                !validation.matchValid ||
                !validation.hasLetter ||
                !validation.hasNumber ||
                !validation.hasSpecialChar
              }
              accessibilityLabel="Change Password Button"
              accessibilityHint="Press to change your password"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <View style={styles.buttonContent}>
                  <Feather name="lock" size={18} color={colors.buttonText} />
                  <Text
                    style={[styles.buttonText, { color: colors.buttonText }]}
                  >
                    Change Password
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.subInactiveColor,
                },
              ]}
              onPress={onClose}
              accessibilityLabel="Cancel Button"
              accessibilityHint="Press to cancel and close the modal"
            >
              <View style={styles.buttonContent}>
                <Feather name="x" size={18} color={colors.textColor} />
                <Text
                  style={[styles.cancelButtonText, { color: colors.textColor }]}
                >
                  Cancel
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <ToastNotification
        visible={feedback.visible}
        type={feedback.type}
        message={feedback.message}
        onDismiss={hideFeedback}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
    width: "100%",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  lastChangedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  inputContainer: {
    position: "relative",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    paddingRight: 80, // Make space for icons
  },
  inputIcons: {
    position: "absolute",
    right: 16,
    top: 16,
    flexDirection: "row",
    gap: 12,
  },
  visibilityIcon: {
    padding: 2,
  },
  validationContainer: {
    marginBottom: 16,
    gap: 4,
  },
  validationMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  validationText: {
    fontSize: 13,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChangePasswordModal;
