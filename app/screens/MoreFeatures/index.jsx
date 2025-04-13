import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "react-native-paper";

const index = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "More Features",
    });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Ionicons name="time-outline" size={64} color={theme.colors.textColor} />
      <Text style={[styles.text, { color: theme.colors.textColor }]}>
        Coming Soon
      </Text>
    </View>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff", // optional: change background color if needed
  },
  text: {
    fontSize: 20,
    marginTop: 10,
    color: "#333",
  },
});
