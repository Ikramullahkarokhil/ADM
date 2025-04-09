import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button, useTheme, ActivityIndicator } from "react-native-paper";
import Modal from "react-native-modal";

const AlertDialog = ({
  visible,
  title,
  message,
  onConfirm,
  confirmText = "OK",
  animationIn = "zoomIn",
  animationOut = "zoomOut",
}) => {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  // Handle button press by showing the loading indicator,
  // waiting for a few seconds and then calling the onConfirm prop.
  const handlePress = () => {
    setLoading(true);
    // Simulate a delay (e.g., 2 seconds)
    setTimeout(() => {
      setLoading(false);
      onConfirm();
    }, 2000);
  };

  return (
    <Modal
      isVisible={visible}
      animationIn={animationIn}
      animationOut={animationOut}
      backdropOpacity={0.1}
    >
      <View style={[styles.dialog, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.title, { color: theme.colors.textColor }]}>
          {title}
        </Text>
        <Text style={[styles.message, { color: theme.colors.textColor }]}>
          {message}
        </Text>
        <View style={styles.buttonsContainer}>
          <Button
            mode="contained"
            onPress={handlePress}
            style={styles.button}
            buttonColor={theme.colors.button}
            labelStyle={{ color: theme.colors.buttonText }}
          >
            {loading ? (
              <ActivityIndicator
                animating={true}
                color={theme.colors.buttonText}
              />
            ) : (
              confirmText
            )}
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    width: "90%", // Adjusted for better responsiveness
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
