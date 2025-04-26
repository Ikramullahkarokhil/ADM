import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "@rneui/base";
import { useTheme } from "react-native-paper";

const HotDealsSkeleton = () => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {/** Left Column **/}
      <View style={styles.column}>
        <Skeleton
          width="70%"
          height={20}
          animation="none"
          style={[
            styles.title,
            { backgroundColor: theme.colors.subInactiveColor },
          ]}
        />
        <Skeleton
          width="50%"
          height={20}
          animation="none"
          style={[
            styles.title,
            {
              backgroundColor: theme.colors.subInactiveColor,
              marginBottom: 10,
            },
          ]}
        />

        <Skeleton
          width="100%" // <-- 100% of its column
          height={135}
          animation="none"
          style={[
            styles.cardTop,
            { backgroundColor: theme.colors.subInactiveColor },
          ]}
        />
        <Skeleton
          width="100%"
          height={60}
          animation="none"
          style={[
            styles.cardBottom,
            { backgroundColor: theme.colors.subInactiveColor },
          ]}
        />
      </View>

      {/** Right Column **/}
      <View style={styles.column}>
        <View style={styles.iconsRow}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton
              key={idx}
              width={35}
              height={35}
              animation="none"
              style={[
                styles.icon,
                { backgroundColor: theme.colors.subInactiveColor },
              ]}
            />
          ))}
        </View>

        <Skeleton
          width="100%"
          height={135}
          animation="none"
          style={[
            styles.cardTop,
            { backgroundColor: theme.colors.subInactiveColor },
          ]}
        />
        <Skeleton
          width="100%"
          height={60}
          animation="none"
          style={[
            styles.cardBottom,
            { backgroundColor: theme.colors.subInactiveColor },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    flex: 1,
  },
  column: {
    width: "48%", // each column is 48% of the container :contentReference[oaicite:1]{index=1}
  },
  title: {
    borderRadius: 8,
    marginBottom: 6,
  },
  iconsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  icon: {
    borderRadius: 8,
    marginLeft: 2,
  },
  cardTop: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginTop: 5,
  },
  cardBottom: {
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginTop: 2,
  },
});

export default HotDealsSkeleton;
