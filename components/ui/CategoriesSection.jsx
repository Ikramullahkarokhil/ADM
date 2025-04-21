import React, { memo, useCallback } from "react";
import { FlatList, StyleSheet } from "react-native";
import CategoriesSectionList from "./CategoriesList";
import CategoriesSkeleton, {
  CategoriesSkeletonList,
} from "../skeleton/CategoriesSkeleton";

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

  if (loading) return <CategoriesSkeletonList />;

  return (
    <FlatList
      data={categories}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={1}
      key="data"
      contentContainerStyle={styles.dataContainer}
      scrollEnabled={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={3}
      windowSize={3}
      initialNumToRender={2}
      updateCellsBatchingPeriod={50}
      getItemLayout={(data, index) => ({
        length: 200,
        offset: 200 * index,
        index,
      })}
    />
  );
});

const styles = StyleSheet.create({
  dataContainer: {},
});

export default CategoriesSection;
