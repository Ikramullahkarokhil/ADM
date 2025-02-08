// ProductSkeleton.js
import React from "react";
import { View } from "react-native";
import { Skeleton } from "@rneui/base";
import { LinearGradient } from "expo-linear-gradient";

const ProductSkeleton = () => {
  return (
    <View style={{ padding: 10, flex: 1 }}>
      <Skeleton
        animation="pulse"
        width={"100%"}
        height={150}
        style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      />
      <Skeleton
        LinearGradientComponent={LinearGradient}
        animation="wave"
        width={"100%"}
        height={50}
        style={{
          marginVertical: 1,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}
      />
    </View>
  );
};

export default ProductSkeleton;
