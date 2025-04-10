import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

const CustomSplashScreen = ({ onFinish, colors }) => {
  useEffect(() => {
    // Automatically transition from the custom splash screen after 3 seconds
    const timer = setTimeout(() => {
      onFinish && onFinish();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.button }]}>
      <Image
        source={require("../../assets/splash-icon.png")}
        style={styles.logo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: "contain",
  },
});

export default CustomSplashScreen;
