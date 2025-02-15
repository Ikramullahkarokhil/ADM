import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import useProductStore from "../../components/api/useProductStore";

const ChangePasswordModal = ({ isVisible, onClose }) => {
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword, profileData } = useProductStore();

  const handleChangePassword = async () => {
    const { newPassword, confirmPassword } = passwords;

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({
        consumerID: profileData.consumer_id,
        password: newPassword,
      });
      Alert.alert("Success", "Password changed successfully.");
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to change password.";
      Alert.alert("Error", errorMessage);
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              Last Password Change: {formattedDate}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={passwords.newPassword}
              onChangeText={(text) =>
                setPasswords((prev) => ({ ...prev, newPassword: text }))
              }
              accessibilityLabel="New Password"
              accessibilityHint="Enter your new password"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={passwords.confirmPassword}
              onChangeText={(text) =>
                setPasswords((prev) => ({ ...prev, confirmPassword: text }))
              }
              accessibilityLabel="Confirm New Password"
              accessibilityHint="Re-enter your new password to confirm"
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleChangePassword}
              disabled={isLoading}
              accessibilityLabel="Change Password Button"
              accessibilityHint="Press to change your password"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Change Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityLabel="Cancel Button"
              accessibilityHint="Press to cancel and close the modal"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    width: "90%",
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    color: "#666",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007bff",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ChangePasswordModal;
