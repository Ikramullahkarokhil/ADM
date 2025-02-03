// ProductSkeleton.js
import React from "react";
import { View } from "react-native";
import { Skeleton } from "@rneui/base";
import { LinearGradient } from "expo-linear-gradient";

const CategoriesSkeleton = () => {
  return (
    <View style={{ padding: 5, flex: 1 }}>
      <Skeleton
        LinearGradientComponent={LinearGradient}
        animation="wave"
        width={80}
        height={35}
        style={{
          borderRadius: 10,
        }}
      />
    </View>
  );
};

export default CategoriesSkeleton;
