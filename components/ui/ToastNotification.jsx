// components/ToastNotification.js
import React, { useEffect } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  Easing,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

const ToastNotification = ({ visible, type, message, onDismiss }) => {
  const { colors } = useTheme();
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 30,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.feedbackContainer,
        {
          backgroundColor:
            type === "success" ? colors.button : colors.deleteButton,
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
          shadowColor: colors.activeColor,
        },
      ]}
    >
      <Ionicons
        name={type === "success" ? "checkmark-circle" : "warning"}
        size={22}
        color={colors.buttonText}
      />
      <Text
        style={[
          styles.feedbackText,
          {
            color: colors.buttonText,
          },
        ]}
      >
        {message}
      </Text>
      <TouchableOpacity onPress={onDismiss}>
        <Feather name="x" size={20} color={colors.buttonText} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  feedbackContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    gap: 12,
  },
  feedbackText: {
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
});

export default ToastNotification;
