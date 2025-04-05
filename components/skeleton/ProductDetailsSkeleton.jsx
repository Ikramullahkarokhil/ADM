import { View, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "react-native-paper";

const { width: screenWidth } = Dimensions.get("window");

const ProductDetailSkeleton = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Image Carousel Skeleton */}
      <View
        style={[
          styles.carouselContainer,
          { backgroundColor: colors.subInactiveColor },
        ]}
      >
        <View style={styles.imageContainer} />
        <View style={styles.dotContainer}>
          {[...Array(4)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === 0 ? colors.button : colors.background,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Product Info Skeleton */}
      <View style={[styles.infoContainer, { backgroundColor: colors.primary }]}>
        <View style={styles.titleRow}>
          <View
            style={[styles.title, { backgroundColor: colors.subInactiveColor }]}
          />
          <View
            style={[
              styles.heartIcon,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />
        </View>

        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.star,
                { backgroundColor: colors.subInactiveColor },
              ]}
            />
          ))}
        </View>

        <View
          style={[styles.price, { backgroundColor: colors.subInactiveColor }]}
        />

        <View
          style={[
            styles.description,
            { backgroundColor: colors.subInactiveColor },
          ]}
        />
        <View
          style={[
            styles.descriptionShort,
            { backgroundColor: colors.subInactiveColor },
          ]}
        />

        <View style={styles.detailsRow}>
          <View
            style={[
              styles.detailLabel,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />
          <View
            style={[
              styles.detailValue,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />
        </View>

        <View style={styles.detailsRow}>
          <View
            style={[
              styles.detailLabel,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />
          <View
            style={[
              styles.detailValue,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />
        </View>

        <View style={styles.buttonRow}>
          <View
            style={[
              styles.button,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />
          <View
            style={[
              styles.button,
              { backgroundColor: colors.subInactiveColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  carouselContainer: {
    height: 300,
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 270,
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  infoContainer: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    height: 24,
    width: "80%",
    borderRadius: 4,
  },
  heartIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  star: {
    width: 15,
    height: 15,
    borderRadius: 2,
    marginRight: 4,
  },
  price: {
    height: 24,
    width: "40%",
    borderRadius: 4,
    marginBottom: 16,
  },
  description: {
    height: 16,
    width: "100%",
    borderRadius: 4,
    marginBottom: 8,
  },
  descriptionShort: {
    height: 16,
    width: "70%",
    borderRadius: 4,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailLabel: {
    height: 16,
    width: "30%",
    borderRadius: 4,
  },
  detailValue: {
    height: 16,
    width: "40%",
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  button: {
    width: "48%",
    height: 40,
    borderRadius: 4,
  },
});

export default ProductDetailSkeleton;
