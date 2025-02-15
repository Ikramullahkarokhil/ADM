import React, { useLayoutEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
} from "react-native";
import { Button, IconButton, useTheme, Checkbox } from "react-native-paper";
import { useNavigation } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import useOrderStore from "../../../components/store/useOrderStore";
import useProductStore from "../../../components/api/useProductStore";

const Cart = () => {
  const { listCart, user, deleteFromCart, cartItem } = useProductStore();
  const addOrder = useOrderStore((state) => state.addOrder);
  const navigation = useNavigation();
  const theme = useTheme();

  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelection = useCallback((productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const selectedItems = cartItem.filter((item) =>
    selectedIds.has(item.products_id)
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Cart",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme.colors.primary, theme.colors.textColor]);

  const handleRemoveFromCart = useCallback(
    async (item) => {
      try {
        await deleteFromCart({
          productID: item.products_id,
          consumerID: user.consumer_id,
        });
        ToastAndroid.show("Product removed from cart", ToastAndroid.SHORT);
      } catch (error) {
        console.error("Failed to remove item:", error);
        ToastAndroid.show("Failed to remove product", ToastAndroid.SHORT);
      }
    },
    [deleteFromCart, listCart, user.consumer_id]
  );

  const handleOrder = useCallback(async () => {
    try {
      await Promise.all(selectedItems.map((item) => addOrder(item)));
      await Promise.all(
        selectedItems.map((item) =>
          deleteFromCart({
            productID: item.products_id,
            consumerID: user.consumer_id,
          })
        )
      );

      await listCart(user.consumer_id);
      ToastAndroid.show("Product Ordered", ToastAndroid.SHORT);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Order failed:", error);
    }
  }, [selectedItems, addOrder, deleteFromCart, listCart, user.consumer_id]);

  const renderRightActions = useCallback(
    (item) => (
      <View style={styles.rightAction}>
        <IconButton
          icon="delete"
          onPress={() => handleRemoveFromCart(item)}
          color="red"
          size={24}
        />
      </View>
    ),
    [handleRemoveFromCart]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        containerStyle={[
          styles.swipeableContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.itemContainer,
            { backgroundColor: theme.colors.primary },
          ]}
          activeOpacity={0.8}
          onPress={() => toggleSelection(item.products_id)}
        >
          <Image
            source={
              item.image
                ? { uri: item.image }
                : require("../../../assets/images/imageSkeleton.jpg")
            }
            style={[
              styles.itemImage,
              { backgroundColor: theme.colors.background },
            ]}
          />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.itemPrice}>${item.spu}</Text>
          </View>
          <Checkbox
            status={selectedIds.has(item.products_id) ? "checked" : "unchecked"}
            onPress={() => toggleSelection(item.products_id)}
            color={theme.colors.button}
          />
        </TouchableOpacity>
      </Swipeable>
    ),
    [
      renderRightActions,
      toggleSelection,
      selectedIds,
      theme.colors.background,
      theme.colors.primary,
      theme.colors.button,
    ]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {cartItem.length > 0 ? (
        <FlatList
          data={cartItem}
          renderItem={renderItem}
          keyExtractor={(item) => item.products_id.toString()}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={styles.emptyCartText}>Your cart is empty</Text>
      )}
      <Button
        style={styles.orderButton}
        buttonColor={theme.colors.button}
        disabled={selectedItems.length === 0}
        onPress={handleOrder}
        icon={() => (
          <Ionicons name="bag-add" size={24} color={theme.colors.textColor} />
        )}
      >
        Order Selected Items
      </Button>
    </View>
  );
};

export default Cart;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  swipeableContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    alignItems: "center",
    padding: 8,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  itemPrice: {
    fontSize: 16,
    color: "#888",
    marginVertical: 8,
  },
  emptyCartText: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
    marginTop: 32,
  },
  orderButton: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
  },
  rightAction: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderRadius: 8,
    height: "100%",
  },
});
