// CustomSplashScreen.js
import React from "react";
import { Image, StyleSheet, View } from "react-native";

const SplashScreen = () => {
  return (
    <View style={styles.splashContainer}>
      <Image
        source={require("../../assets/logo.gif")}
        style={styles.splashImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#01bf62", // Customize as needed
  },
  splashImage: {
    width: 200,
    height: 200,
  },
});

export default SplashScreen;
