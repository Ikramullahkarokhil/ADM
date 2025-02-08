import React, { useLayoutEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Share,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import useCartStore from "../../../components/store/useCartStore";
import useProductStore from "../../../components/api/useProductStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import * as Linking from "expo-linking";

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const { productData, loading, error } = useProductStore();
  const theme = useTheme();

  const data = productData ? productData.data : [];
  const product = data.find((item) => item.products_id.toString() === id);

  const cart = useCartStore((state) => state.cart);
  const addToCart = useCartStore((state) => state.addToCart);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Zaytoon",
    });
  }, [navigation]);

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const handleAddToCart = () => {
    if (cart.some((item) => item.products_id === product.products_id)) {
      Alert.alert("Info", "Product is already added to cart!");
    } else {
      addToCart(product);
      Alert.alert("Success", "Product added to cart!");
    }
  };
  const handleShare = async () => {
    if (!product) return;
    const deepLink = Linking.createURL(
      `/screens/ProductDetails/${product.products_id}`
    );
    try {
      await Share.share({
        message: `Check out this product: ${deepLink}`,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share product.");
      console.log(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={
          product.image
            ? { uri: item.image }
            : require("../../../assets/images/imageSkeleton.jpg")
        }
        style={styles.image}
      />
      <View style={styles.infoContainer}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.title}>{product.title}</Text>
          <Pressable
            android_ripple={theme.colors.riple}
            onPress={handleShare}
            style={styles.shareIcon}
          >
            <Ionicons name="share-outline" size={24} color="#4CAF50" />
          </Pressable>
        </View>
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, index) => (
            <FontAwesome
              key={index}
              name={index < Math.floor(product.rating) ? "star" : "star-o"}
              size={20}
              color={index < Math.floor(product.rating) ? "#FFD700" : "#ccc"}
            />
          ))}
          <Text style={styles.ratingText}>rating</Text>
        </View>
        <Text style={styles.price}>€{product.spu}</Text>
        <Text style={styles.description}>{product.description}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Brand:</Text>
          <Text style={styles.detailValue}>{product.brands_id}</Text>
        </View>

        {/* Add to Cart Button */}
        <TouchableOpacity style={styles.button} onPress={handleAddToCart}>
          <Text style={styles.buttonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  shareIcon: {
    padding: 5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#666",
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555",
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: "#888",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
});
