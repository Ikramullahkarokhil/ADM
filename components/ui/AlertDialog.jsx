import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
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
}) => {
  const theme = useTheme();
  const { width } = Dimensions.get("window");
  const dialogWidth = Math.min(width * 0.85, 400);

  const [contentAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        delay: 150,
      }).start();
    } else {
      contentAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onDismiss}
      onBackButtonPress={onDismiss}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropOpacity={0.3}
      backdropTransitionOutTiming={100}
      backdropTransitionInTiming={100}
      useNativeDriver={true}
      useNativeDriverForBackdrop={true}
      avoidKeyboard
    >
      <View
        style={[
          styles.dialog,
          {
            backgroundColor:
              theme.colors.surface || theme.colors.background || "white",
            width: dialogWidth,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.onSurface || theme.colors.text || "#000",
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
                  theme.colors.onSurfaceVariant || theme.colors.text || "#555",
              },
            ]}
          >
            {message}
          </Text>
        </Animated.View>
        <View style={styles.buttonsContainer}>
          {cancelText && (
            <Button
              mode="text"
              onPress={onDismiss}
              style={[styles.button, styles.cancelButton]}
              labelStyle={{
                color: theme.colors.textColor || theme.colors.primary,
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
              color: theme.colors.buttonText || "#fff",
              fontWeight: "500",
            }}
            rippleColor="rgba(255, 255, 255, 0.2)"
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
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
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
