import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Button, useTheme } from "react-native-paper";

const AlertDialog = ({
  visible,
  title,
  message,
  onDismiss,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
}) => {
  const theme = useTheme();
  const { width } = Dimensions.get("window");
  const dialogWidth = Math.min(width * 0.85, 400);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View
          style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.3)" }]}
        />
      </TouchableWithoutFeedback>

      <View style={styles.centeredView}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.primary,
              width: dialogWidth,
            },
          ]}
        >
          <View style={styles.contentContainer}>
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.textColor,
                  },
                ]}
              >
                {title}
              </Text>
            </View>
            <Text
              style={[
                styles.message,
                {
                  color:
                    theme.colors.onSurfaceVariant || theme.colors.textColor,
                },
              ]}
            >
              {message}
            </Text>
          </View>
          <View style={styles.buttonsContainer}>
            {cancelText && (
              <Button
                mode="text"
                onPress={onDismiss}
                style={[styles.button, styles.cancelButton]}
                labelStyle={{
                  color: theme.colors.textColor,
                  fontWeight: "500",
                }}
                rippleColor="rgba(0, 0, 0, 0.08)"
              >
                {cancelText}
              </Button>
            )}
            <Button
              mode="contained"
              onPress={onConfirm}
              style={[styles.button, styles.confirmButton]}
              buttonColor={theme.colors.button || theme.colors.primary}
              labelStyle={{
                color: theme.colors.buttonText,
                fontWeight: "500",
              }}
              rippleColor="rgba(255, 255, 255, 0.2)"
            >
              {confirmText}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialog: {
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentContainer: {
    padding: 24,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.15,
    flex: 1,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.25,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    paddingTop: 8,
  },
  button: {
    marginLeft: 8,
    minWidth: 64,
    borderRadius: 10,
  },
  cancelButton: {
    marginRight: 4,
  },
  confirmButton: {
    elevation: 0,
  },
});

export default AlertDialog;
