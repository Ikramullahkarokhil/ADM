import React, { memo, useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import CategoriesSectionList from "./CategoriesList";
import CategoriesSkeleton from "../skeleton/CategoriesSkeleton";

// Optimize category item rendering with memoization.
const CategoryItem = memo(({ item, loading }) => {
  if (loading) return <CategoriesSkeleton />;
  return <CategoriesSectionList data={[item]} />;
});

// Categories section with optimized FlatList parameters for better performance.
const CategoriesSection = memo(({ loading, categories, keyExtractor }) => {
  const renderItem = useCallback(
    ({ item }) => <CategoryItem item={item} loading={loading} />,
    [loading]
  );

  return (
    <FlatList
      data={loading ? Array(6).fill(null) : categories}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={loading ? 2 : 1}
      key={loading ? "skeleton" : "data"}
      contentContainerStyle={
        loading ? styles.skeletonContainer : styles.dataContainer
      }
      scrollEnabled={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={3}
      windowSize={3}
      initialNumToRender={2}
      updateCellsBatchingPeriod={50}
      getItemLayout={(data, index) => ({
        length: loading ? 150 : 200,
        offset: (loading ? 150 : 200) * index,
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
  dataContainer: {},
});

export default CategoriesSection;
