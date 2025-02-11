import React, {
  useLayoutEffect,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Button, IconButton, useTheme, Checkbox } from "react-native-paper";
import { useNavigation } from "expo-router";
import useCartStore from "../../../components/store/useCartStore";
import useOrderStore from "../../../components/store/useOrderStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Swipeable } from "react-native-gesture-handler";

const Cart = () => {
  const cart = useCartStore((state) => state.cart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const addOrder = useOrderStore((state) => state.addOrder);
  const navigation = useNavigation();
  const theme = useTheme();

  const [selectedItems, setSelectedItems] = useState([]);

  const toggleSelection = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.products_id === item.products_id);
      if (exists) {
        return prev.filter((i) => i.products_id !== item.products_id);
      } else {
        return [...prev, item];
      }
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Cart",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme.colors.primary, theme.colors.textColor]);

  useEffect(() => {
    // Select all products by default
    setSelectedItems([...cart]);
  }, [cart]);

  const handleRemoveFromCart = (item) => {
    removeFromCart(item.products_id);
    setSelectedItems((prev) =>
      prev.filter((i) => i.products_id !== item.products_id)
    );
  };

  const handleOrder = async () => {
    try {
      const successfulItems = [];
      for (const item of selectedItems) {
        try {
          await addOrder(item);
          successfulItems.push(item.products_id);
        } catch (error) {
          console.error("Failed to order item:", item, error);
        }
      }
      // Remove only successfully ordered items from the cart
      successfulItems.forEach((id) => removeFromCart(id));
      setSelectedItems((prev) =>
        prev.filter((item) => !successfulItems.includes(item.products_id))
      );
    } catch (error) {
      console.error("Order process failed:", error);
    }
  };

  const renderRightActions = (item) => (
    <View style={styles.rightAction}>
      <IconButton
        icon="delete"
        onPress={() => handleRemoveFromCart(item)}
        color="red"
        size={24}
      />
    </View>
  );

  const renderItem = ({ item }) => (
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
        onPress={() => toggleSelection(item)}
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
          <Text style={styles.itemName}>{item.title}</Text>
          <Text style={styles.itemPrice}>${item.spu}</Text>
        </View>
        <Checkbox
          status={
            selectedItems.find((i) => i.products_id === item.products_id)
              ? "checked"
              : "unchecked"
          }
          onPress={() => toggleSelection(item)}
          color={theme.colors.button}
        />
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {cart.length > 0 ? (
        <FlatList
          data={cart}
          renderItem={renderItem}
          keyExtractor={(item) => item.products_id.toString()}
          contentContainerStyle={styles.list}
          scrollEnabled
        />
      ) : (
        <Text style={styles.emptyCartText}>Your cart is empty</Text>
      )}
      <Button
        style={styles.orderButton}
        buttonColor={theme.colors.button}
        disabled={selectedItems.length === 0}
        onPress={handleOrder}
        icon={() => <Ionicons name="bag-add" size={24} color="white" />}
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
    flex: 1,
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
    bottom: 5,
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
