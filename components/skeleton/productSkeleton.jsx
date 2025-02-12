// ProductSkeleton.js
import React from "react";
import { View } from "react-native";
import { Skeleton } from "@rneui/base";
import { LinearGradient } from "expo-linear-gradient";

const ProductSkeleton = () => {
  return (
    <View
      style={{
        paddingTop: 15,
        paddingLeft: 10,
        paddingBottom: 10,
        flex: 1,
        flexDirection: "row",
      }}
    >
      <Skeleton
        animation="wave"
        width={100}
        height={100}
        style={{ borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}
        LinearGradientComponent={LinearGradient}
      />
      <View style={{ flex: 1, flexDirection: "column", paddingLeft: 10 }}>
        <Skeleton
          animation="wave"
          width={"90%"}
          height={20}
          style={{ borderRadius: 12 }}
          LinearGradientComponent={LinearGradient}
        />
        <Skeleton
          animation="wave"
          width={"30%"}
          height={20}
          style={{ borderRadius: 12, marginTop: 10 }}
          LinearGradientComponent={LinearGradient}
        />
        <Skeleton
          animation="wave"
          width={"40%"}
          height={20}
          style={{ borderRadius: 12, marginTop: 10 }}
          LinearGradientComponent={LinearGradient}
        />
      </View>
    </View>
  );
};

export default ProductSkeleton;
