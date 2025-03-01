import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { Button, useTheme, RadioButton } from "react-native-paper";
import { useLocalSearchParams, useNavigation } from "expo-router";
import useOrderStore from "../../../components/store/useOrderStore";
import useProductStore from "../../../components/api/useProductStore";

const ProductVariantSelection = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { item } = useLocalSearchParams();
  const { deleteFromCart } = useProductStore();
  const { addOrder } = useOrderStore();
  const { user } = useProductStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Order",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  const selectedItems = JSON.parse(item);

  const [selections, setSelections] = useState(
    selectedItems.map((item) => ({
      id: item.consumer_cart_items_id,
      selectedVariants: {},
      quantity: parseInt(item.qty) || 1,
    }))
  );
  const [isLoading, setIsLoading] = useState(false);

  // Handle variant selection
  const handleVariantSelect = (itemId, variantTitle, value) => {
    setSelections((prev) =>
      prev.map((sel) =>
        sel.id === itemId
          ? {
              ...sel,
              selectedVariants: {
                ...sel.selectedVariants,
                [variantTitle]: value,
              },
            }
          : sel
      )
    );
  };

  // Handle quantity change
  const handleQuantityChange = (itemId, delta) => {
    setSelections((prev) =>
      prev.map((sel) =>
        sel.id === itemId
          ? { ...sel, quantity: Math.max(1, sel.quantity + delta) }
          : sel
      )
    );
  };

  // Handle order confirmation
  const handleConfirm = async () => {
    const incompleteItems = selections.filter((sel) => {
      const currentItem = selectedItems.find(
        (i) => i.consumer_cart_items_id === sel.id
      );
      return (
        currentItem.variants.length !== Object.keys(sel.selectedVariants).length
      );
    });
    if (incompleteItems.length > 0) {
      alert("Please select all variants for each item.");
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(
        selections.map((sel) => {
          const currentItem = selectedItems.find(
            (i) => i.consumer_cart_items_id === sel.id
          );
          const orderItem = {
            ...currentItem,
            select_variant_values: Object.values(sel.selectedVariants),
            select_variant_ids: currentItem.variants.map((v) => v.variants_id),
            qty: sel.quantity,
          };
          return addOrder(orderItem);
        })
      );

      await Promise.all(
        selectedItems.map((item) =>
          deleteFromCart({
            productID: item.consumer_cart_items_id,
            consumerID: user?.consumer_id,
          })
        )
      );

      navigation.goBack();
    } catch (error) {
      console.error("Failed to place orders:", error);
      alert("An error occurred while placing your order.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quantity Selector Component
  const QuantitySelector = ({ quantity, onDecrease, onIncrease }) => (
    <View style={styles.quantityContainer}>
      <TouchableOpacity
        style={styles.quantityButton}
        onPress={onDecrease}
        accessibilityLabel="Decrease quantity"
      >
        <Text style={styles.quantityButtonText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.quantityText}>{quantity}</Text>
      <TouchableOpacity
        style={styles.quantityButton}
        onPress={onIncrease}
        accessibilityLabel="Increase quantity"
      >
        <Text style={styles.quantityButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  // Render each product item
  const renderItem = ({ item }) => {
    const selection = selections.find(
      (sel) => sel.id === item.consumer_cart_items_id
    );
    return (
      <View style={styles.itemContainer}>
        <View style={styles.header}>
          <Image
            source={require("../../../assets/images/imageSkeleton.jpg")} // Replace with { uri: item.imageUrl } if available
            style={styles.itemImage}
          />
          <View style={styles.headerContent}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.itemPrice}>
              AF {parseFloat(item.spu).toFixed(2)}
            </Text>
          </View>
        </View>
        {item.variants.map((variant) => (
          <View key={variant.variants_id} style={styles.variantContainer}>
            <Text style={styles.variantTitle}>{variant.variant_title}</Text>
            <RadioButton.Group
              onValueChange={(value) =>
                handleVariantSelect(
                  item.consumer_cart_items_id,
                  variant.variant_title,
                  value
                )
              }
              value={selection.selectedVariants[variant.variant_title] || ""}
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {variant.variant_values.split(",").map((value) => (
                  <View key={value} style={styles.radioItem}>
                    <RadioButton
                      value={value}
                      color={theme.colors.button}
                      uncheckedColor="#888"
                    />
                    <Text style={styles.radioLabel}>{value}</Text>
                  </View>
                ))}
              </View>
            </RadioButton.Group>
          </View>
        ))}
        <QuantitySelector
          quantity={selection.quantity}
          onDecrease={() =>
            handleQuantityChange(item.consumer_cart_items_id, -1)
          }
          onIncrease={() =>
            handleQuantityChange(item.consumer_cart_items_id, 1)
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={selectedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.consumer_cart_items_id}
        contentContainerStyle={styles.list}
      />
      <Button
        mode="contained"
        onPress={handleConfirm}
        style={styles.confirmButton}
        buttonColor={theme.colors.button}
        textColor={theme.colors.primary}
        loading={isLoading}
        disabled={isLoading}
      >
        Place Order
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  list: {
    paddingBottom: 100,
  },
  itemContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 4,
    margin: 16,
  },
  header: {
    flexDirection: "row",
  },
  headerContent: {
    padding: 5,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: "cover",
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  itemPrice: {
    fontSize: 16,
    color: "#888",
    marginBottom: 12,
  },
  variantContainer: {
    marginBottom: 16,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginRight: 8,
    marginVertical: 4,
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    backgroundColor: "#ddd",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  quantityText: {
    fontSize: 18,
    width: 40,
    textAlign: "center",
    color: "#333",
  },
  confirmButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 8,
    paddingVertical: 10,
  },
});

export default ProductVariantSelection;
