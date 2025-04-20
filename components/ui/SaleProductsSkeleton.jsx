import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";

const SaleProductsSkeleton = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const itemWidth = width > 550 ? width / 3 - 24 : width / 2 - 24;

  // Skeleton item component
  const SkeletonItem = () => (
    <View style={[styles.cardWrapper, { width: itemWidth }]}>
      <View style={[styles.productCard, { backgroundColor: colors.primary }]}>
        <View style={styles.imageContainer}>
          <View
            style={[
              styles.productImage,
              { backgroundColor: colors.surfaceDisabled },
            ]}
          />
          <View
            style={[
              styles.titleOverlay,
              { backgroundColor: colors.surfaceDisabled },
            ]}
          >
            <View
              style={[
                styles.skeletonText,
                { backgroundColor: colors.onSurfaceDisabled },
              ]}
            />
            <View style={styles.priceContainer}>
              <View
                style={[
                  styles.skeletonPrice,
                  { backgroundColor: colors.onSurfaceDisabled },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.headerContainer}>
        <View
          style={[
            styles.skeletonTitle,
            { backgroundColor: colors.surfaceDisabled },
          ]}
        />
      </View>

      <View style={styles.skeletonList}>
        {[...Array(4)].map((_, i) => (
          <SkeletonItem key={`skeleton-${i}`} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  skeletonTitle: {
    height: 24,
    width: 100,
    borderRadius: 4,
  },
  skeletonList: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  cardWrapper: {
    marginRight: 12,
    paddingBottom: 10,
  },
  productCard: {
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    height: "100%",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    height: 70,
  },
  skeletonText: {
    height: 14,
    width: "80%",
    borderRadius: 4,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonPrice: {
    height: 16,
    width: 60,
    borderRadius: 4,
  },
});

export default SaleProductsSkeleton;
