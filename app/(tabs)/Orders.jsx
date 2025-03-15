import React, { useLayoutEffect } from "react";
import { View, Text, FlatList, Image, StyleSheet } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useNavigation } from "expo-router";
import useOrderStore from "../../components/store/useOrderStore";
import { MaterialIcons } from "@expo/vector-icons"; // Import the icon library

const Orders = () => {
  const orders = useOrderStore((state) => state.orders);
  const deleteOrder = useOrderStore((state) => state.deleteOrder);
  const navigation = useNavigation();
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Orders",
    });
  }, [navigation]);

  const handleCancel = (ItemId) => {
    deleteOrder(ItemId);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image
        source={
          item.image
            ? { uri: item.image }
            : require("../../assets/images/imageSkeleton.jpg")
        }
        style={styles.itemImage}
      />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemPrice}>${item.spu}</Text>
        <View style={styles.buttonContainer}>
          <Button
            style={styles.button}
            mode="contained"
            contentStyle={{ backgroundColor: theme.colors.button }}
            onPress={() => {
              // For example, navigate to an order detail page
              // navigation.navigate("OrderDetail", { orderId: item.id });
            }}
          >
            Details
          </Button>
          <Button
            onPress={() => handleCancel(item.products_id)}
            style={styles.button}
            contentStyle={{ backgroundColor: theme.colors.button }}
            mode="contained"
          >
            Cancel
          </Button>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.products_id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="remove-shopping-cart" size={64} color="#888" />
          <Text style={styles.emptyText}>You have no orders</Text>
        </View>
      )}
    </View>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  itemImage: {
    width: 110,
    height: 130,
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 2,
  },
});
