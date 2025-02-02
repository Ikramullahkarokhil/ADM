import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import useCartStore from "../../../components/store/useCartStore";
import useOrderStore from "../../../components/store/useOrderStore"; // import your order store
import { Button, useTheme } from "react-native-paper";
import { Link, useNavigation } from "expo-router";

const Cart = () => {
  const cart = useCartStore((state) => state.cart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const addOrder = useOrderStore((state) => state.addOrder); // get the addOrder action
  const navigation = useNavigation();
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Cart",
    });
  }, [navigation]);

  const handleRemoveFromCart = (itemId) => {
    removeFromCart(itemId);
  };

  const handleOrder = (item) => {
    // Add the current item to orders.
    addOrder(item);
    // Optionally remove the item from the cart after ordering.
    removeFromCart(item.id);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
        <View style={styles.buttonContainer}>
          <Button
            style={styles.button}
            buttonColor={theme.colors.textColor}
            onPress={() => handleRemoveFromCart(item.id)}
          >
            Remove
          </Button>
          <Button
            style={styles.button}
            buttonColor={theme.colors.textColor}
            onPress={() => handleOrder(item)}
          >
            Order
          </Button>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {cart.length > 0 ? (
        <FlatList
          data={cart}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={styles.emptyCartText}>Your cart is empty</Text>
      )}
    </View>
  );
};

export default Cart;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 15,
    marginHorizontal: 16,
  },
  itemImage: {
    width: 130,
    height: 130,
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    width: 80,
  },
});
