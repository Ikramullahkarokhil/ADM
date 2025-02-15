import React, { useLayoutEffect, useCallback } from "react";
import { StyleSheet, Text, View, FlatList, Pressable } from "react-native";
import useProductStore from "../../../components/api/useProductStore";
import { IconButton, useTheme } from "react-native-paper";
import { Link, useNavigation } from "expo-router";

const FavoriteProductPage = () => {
  const { user, removeFavorite, favProducts } = useProductStore();
  const theme = useTheme();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Favorite Products",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme.colors.primary, theme.colors.textColor]);

  // Memoizing the remove function to avoid unnecessary re-renders
  const handleRemoveFav = useCallback(
    async (favId) => {
      const favItem = favProducts.find((item) => item.product_fav_id === favId);
      if (favItem) {
        await removeFavorite({
          favId: favItem.product_fav_id,
          consumerID: user.consumer_id,
        });
      }
    },
    [favProducts, removeFavorite, user.consumer_id]
  );

  const renderFavoriteItem = useCallback(
    ({ item }) => (
      <Link
        href={{
          pathname: "/screens/ProductDetail",
          params: { id: item.products_id },
        }}
        asChild
        style={[styles.productCard, { backgroundColor: theme.colors.primary }]}
      >
        <Pressable android_ripple={theme.colors.ripple}>
          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, { color: theme.colors.textColor }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Text style={[styles.productPrice, { color: theme.colors.button }]}>
              ${item.price}
            </Text>
            <Text
              style={[
                styles.productSystem,
                { color: theme.colors.inactiveColor },
              ]}
            >
              {item.system_name}
            </Text>
            <Text
              style={[
                styles.productDate,
                { color: theme.colors.inactiveColor },
              ]}
            >
              {new Date(item.date).toLocaleString()}
            </Text>
          </View>
          <IconButton
            onPress={() => handleRemoveFav(item.product_fav_id)}
            style={styles.removeButton}
            iconColor={theme.colors.deleteButton}
            icon="delete"
          />
        </Pressable>
      </Link>
    ),
    [handleRemoveFav, theme.colors]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {favProducts.length > 0 ? (
        <FlatList
          data={favProducts}
          keyExtractor={(item) => item.product_fav_id.toString()}
          renderItem={renderFavoriteItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
          No favorite products found.
        </Text>
      )}
    </View>
  );
};

export default FavoriteProductPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContainer: {
    padding: 16,
  },
  productCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    color: "#888",
    marginBottom: 4,
  },
  productSystem: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 4,
  },
  productDate: {
    fontSize: 12,
    color: "#ccc",
  },
  removeButton: {
    position: "absolute",
    bottom: 1,
    right: 1,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});
