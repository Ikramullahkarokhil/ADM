import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Link } from "expo-router";
import { Pressable } from "react-native";

const ProductList = ({ data }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 4 : 2;

  const renderItem = ({ item }) => (
    <Link
      style={[
        styles.product,
        {
          backgroundColor: theme.colors.primary,
          shadowColor: theme.colors.textColor,
          flex: 1,
          margin: 10,
        },
      ]}
      href={{
        pathname: `/screens/ProductDetail`,
        params: { id: item.products_id },
      }}
      asChild
    >
      <Pressable
        android_ripple={{ color: theme.colors.riple }}
        style={{ borderRadius: 10 }}
      >
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require("../../assets/images/imageSkeleton.jpg")
          }
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.details}>
          <Text
            style={[styles.name, { color: theme.colors.textColor }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          <Text style={[styles.price, { color: theme.colors.textColor }]}>
            ${item.spu}
          </Text>
        </View>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color="#FFD700" />
          <Text style={styles.rating}>{item.rating} 4.7</Text>
        </View>
      </Pressable>
    </Link>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.products_id.toString()}
      numColumns={numColumns}
      key={numColumns}
      contentContainerStyle={styles.container}
    />
  );
};

export default ProductList;

const styles = StyleSheet.create({
  container: {},
  product: {
    flex: 1,
    borderRadius: 10,
    elevation: 5,
  },
  image: {
    width: "100%",
    height: 150,
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
    marginBottom: 8,
  },
  details: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
  },
  stock: {
    fontSize: 12,
    fontWeight: "500",
  },
  ratingContainer: {
    position: "absolute",
    bottom: "3%",
    right: "3%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    elevation: 1,
  },
  rating: {
    fontSize: 14,
    color: "#f39c12",
    marginLeft: 4,
  },
});
