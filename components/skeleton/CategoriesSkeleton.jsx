import React, { memo } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Skeleton } from "@rneui/base";
import { useTheme } from "react-native-paper";

const CategoriesSkeletonItem = () => {
  const theme = useTheme();
  return (
    <View style={{ padding: 8, paddingTop: 6, flex: 1 }}>
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

const CategoriesSkeletonList = memo(() => {
  return (
    <FlatList
      data={Array(6).fill(null)}
      renderItem={() => <CategoriesSkeletonItem />}
      keyExtractor={(_, index) => index.toString()}
      numColumns={2}
      key="skeleton"
      contentContainerStyle={styles.skeletonContainer}
      scrollEnabled={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={3}
      windowSize={3}
      initialNumToRender={2}
      updateCellsBatchingPeriod={50}
      getItemLayout={(data, index) => ({
        length: 150,
        offset: 150 * index,
        index,
      })}
    />
  );
});

const styles = StyleSheet.create({
  skeletonContainer: {
    marginTop: 50,
    marginHorizontal: 10,
  },
});

export default CategoriesSkeletonItem;
export { CategoriesSkeletonList };
