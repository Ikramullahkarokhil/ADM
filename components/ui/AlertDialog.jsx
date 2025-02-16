// components/AlertDialog.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Button, useTheme } from "react-native-paper";
import Modal from "react-native-modal";

const AlertDialog = ({
  visible,
  title,
  message,
  onDismiss,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
  animationIn = "zoomIn",
  animationOut = "zoomOut",
}) => {
  const theme = useTheme();

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onDismiss}
      onBackButtonPress={onDismiss}
      animationIn={animationIn}
      animationOut={animationOut}
      backdropOpacity={0}
    >
      <View style={[styles.dialog, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {message}
        </Text>
        <View style={styles.buttonsContainer}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={[styles.button, { borderColor: theme.colors.button }]}
            labelStyle={{ color: theme.colors.button }}
          >
            {cancelText}
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            style={styles.button}
            buttonColor={theme.colors.button}
            labelStyle={{ color: theme.colors.primary }}
          >
            {confirmText}
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    width: "100%",
    borderRadius: 8,
    padding: 20,
    backgroundColor: "white",
    alignSelf: "center",
    elevation: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    marginLeft: 10,
  },
});

export default AlertDialog;
