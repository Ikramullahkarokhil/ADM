import React from "react";
import { View } from "react-native";
import { Skeleton } from "@rneui/base";
import { useTheme } from "react-native-paper";

const AllCategoriesSkeleton = () => {
  const theme = useTheme();
  return (
    <View style={{ padding: 8, paddingTop: 8, flex: 1 }}>
      <Skeleton
        width={"100%"}
        animation="none"
        height={135}
        style={{
          borderTopLeftRadius: 15,
          borderTopRightRadius: 15,
          backgroundColor: theme.colors.subInactiveColor,
        }}
      />
      <Skeleton
        width={"100%"}
        animation="none"
        height={40}
        style={{
          marginTop: 0.5,
          borderBottomLeftRadius: 15,
          borderBottomRightRadius: 15,
          backgroundColor: theme.colors.subInactiveColor,
        }}
      />
    </View>
  );
};

export default AllCategoriesSkeleton;
