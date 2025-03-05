import { StyleSheet, View } from "react-native";
import useThemeStore from "../store/useThemeStore";

// Skeleton component for CategoriesSectionList
const CategoriesListSkeleton = () => {
  const { isDarkTheme } = useThemeStore();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkTheme ? "#121212" : "#f5f5f5" },
      ]}
    ></View>
  );
};

export default CategoriesListSkeleton;

// Styles
const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  categoryContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerSkeleton: {
    width: 150,
    height: 24,
    borderRadius: 4,
  },
  viewAllSkeleton: {
    width: 60,
    height: 16,
    borderRadius: 4,
  },
  subcategoriesContainer: {
    paddingVertical: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemContainer: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    overflow: "hidden",
    minWidth: "45%", // Ensures 2 columns minimum
    maxWidth: "48%", // Prevents items from taking full width
  },
  product: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  imageSkeleton: {
    width: "100%",
    height: 180,
    borderRadius: 16,
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  nameSkeleton: {
    width: "70%",
    height: 16,
    borderRadius: 4,
    alignSelf: "center",
  },
});
