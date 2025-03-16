import { StyleSheet, Text, View } from "react-native";
import React, { useLayoutEffect } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "react-native-paper";

const index = () => {
  const { orderId } = useLocalSearchParams();
  const navigation = useNavigation();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Order Details ${orderId}`,
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.textColor,
    });
  }, [navigation, colors]);

  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
      }}
    >
      <Text>orderID: {orderId}</Text>
    </View>
  );
};

export default index;

const styles = StyleSheet.create({});
