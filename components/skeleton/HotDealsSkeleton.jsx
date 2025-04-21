import React from "react";
import { View } from "react-native";
import { Skeleton } from "@rneui/base";
import { useTheme } from "react-native-paper";

const HotDealsSkeleton = () => {
  const theme = useTheme();
  return (
    <View style={{ padding: 16, flex: 1, flexDirection: "row", gap: 10 }}>
      <View>
        <View>
          <Skeleton
            width={120}
            animation="none"
            height={20}
            style={{
              borderRadius: 8,
              backgroundColor: theme.colors.subInactiveColor,
              marginBottom: 3,
            }}
          />
          <Skeleton
            width={120}
            animation="none"
            height={20}
            style={{
              borderRadius: 8,
              backgroundColor: theme.colors.subInactiveColor,
              marginBottom: 10,
            }}
          />
        </View>
        <View>
          <Skeleton
            width={160}
            animation="none"
            height={135}
            style={{
              borderTopLeftRadius: 15,
              borderTopRightRadius: 15,
              backgroundColor: theme.colors.subInactiveColor,
            }}
          />
          <Skeleton
            width={160}
            animation="none"
            height={60}
            style={{
              marginTop: 0.5,
              borderBottomLeftRadius: 15,
              borderBottomRightRadius: 15,
              backgroundColor: theme.colors.subInactiveColor,
            }}
          />
        </View>
      </View>
      <View>
        <View style={{ alignSelf: "flex-end", flexDirection: "row" }}>
          <Skeleton
            width={35}
            animation="none"
            height={35}
            style={{
              borderRadius: 8,
              backgroundColor: theme.colors.subInactiveColor,
              marginBottom: 3,
              marginRight: 3,
            }}
          />
          <Skeleton
            width={35}
            animation="none"
            height={35}
            style={{
              borderRadius: 8,
              backgroundColor: theme.colors.subInactiveColor,
              marginBottom: 3,
              marginRight: 3,
            }}
          />
          <Skeleton
            width={35}
            animation="none"
            height={35}
            style={{
              borderRadius: 8,
              backgroundColor: theme.colors.subInactiveColor,
              marginBottom: 3,
              marginRight: 3,
            }}
          />
          <Skeleton
            width={35}
            animation="none"
            height={35}
            style={{
              borderRadius: 8,
              backgroundColor: theme.colors.subInactiveColor,
              marginBottom: 3,
            }}
          />
        </View>
        <View>
          <Skeleton
            width={160}
            animation="none"
            height={135}
            style={{
              borderTopLeftRadius: 15,
              borderTopRightRadius: 15,
              backgroundColor: theme.colors.subInactiveColor,
              marginTop: 15,
            }}
          />
          <Skeleton
            width={160}
            animation="none"
            height={60}
            style={{
              marginTop: 0.5,
              borderBottomLeftRadius: 15,
              borderBottomRightRadius: 15,
              backgroundColor: theme.colors.subInactiveColor,
            }}
          />
        </View>
      </View>
    </View>
  );
};

export default HotDealsSkeleton;
