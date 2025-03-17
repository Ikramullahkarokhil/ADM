import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

const FavoriteProductPlaceholder = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.placeholderContainer}>
      <View
        style={[styles.image, { backgroundColor: colors.subInactiveColor }]}
      />
      <View
        style={[
          styles.contentContainer,
          { backgroundColor: colors.subInactiveColor },
        ]}
      >
        <View style={[styles.title, { backgroundColor: colors.background }]} />
        <View style={[styles.price, { backgroundColor: colors.background }]} />
        <View style={[styles.brand, { backgroundColor: colors.background }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    flexDirection: "row",
    elevation: 5,
    paddingBottom: 15,
  },
  image: {
    width: 120,
    height: 140,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  contentContainer: {
    flex: 1,
    height: 140,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    marginLeft: 1,
    padding: 15,
    gap: 15,
  },
  title: {
    height: 20,
    width: "90%",
    borderRadius: 12,
  },
  price: {
    height: 20,
    width: "40%",
    borderRadius: 12,
  },
  brand: {
    height: 25,
    width: "50%",
    borderRadius: 8,
  },
});

export default FavoriteProductPlaceholder;
