import React from "react";
import { View } from "react-native";
import { Skeleton } from "@rneui/base";
import { LinearGradient } from "expo-linear-gradient";

const CategoriesSkeleton = () => {
  return (
    <View style={{ padding: 10, flex: 1 }}>
      <Skeleton
        LinearGradientComponent={LinearGradient}
        animation="wave"
        width={"100%"}
        height={150}
        style={{
          borderRadius: 8,
        }}
      />
      <Skeleton
        LinearGradientComponent={LinearGradient}
        animation="wave"
        width={"50%"}
        height={15}
        style={{
          borderRadius: 8,
          marginTop: 5,
        }}
      />
    </View>
  );
};

export default CategoriesSkeleton;
