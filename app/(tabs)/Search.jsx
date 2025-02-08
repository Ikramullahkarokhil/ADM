import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useLayoutEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useNavigation } from "expo-router";
import {
  Button,
  IconButton,
  PaperProvider,
  Searchbar,
  useTheme,
} from "react-native-paper";
import useProductStore from "../../components/api/useProductStore";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const navigation = useNavigation();
  const theme = useTheme();

  const { searchProductData, productData, error, loading } = useProductStore();
  const data = productData?.data ?? [];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        searchProductData(searchQuery);
      } else {
        setFilteredProducts([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    let filtered = data;
    if (minRating > 0) {
      filtered = filtered.filter((product) => product.rating >= minRating);
    }
    setFilteredProducts(filtered);
  }, [productData, minRating]);

  const renderProductItem = ({ item }) => (
    <Link
      href={{
        pathname: `/screens/ProductDetail`,
        params: { id: item.products_id },
      }}
      asChild
    >
      <Pressable
        style={styles.itemContainer}
        android_ripple={{ color: theme.colors.ripple }}
      >
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require("../../assets/images/imageSkeleton.jpg")
          }
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={3}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>${item.spu}</Text>
          <View style={styles.categoryContainer}>
            <Text style={styles.productCategory}>{item.brands_id}</Text>
            <View style={styles.ratingContainer}>
              <Feather name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  const renderFilterModal = () => (
    <Modal
      visible={isFilterVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsFilterVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.filterTitle}>Filter by Rating</Text>
          <TouchableOpacity
            style={styles.filterOption}
            onPress={() => {
              setMinRating(0);
              setIsFilterVisible(false);
            }}
          >
            <Text>Any Rating</Text>
          </TouchableOpacity>
          {[1, 2, 3, 4, 5].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={styles.filterOption}
              onPress={() => {
                setMinRating(rating);
                setIsFilterVisible(false);
              }}
            >
              <Text>{rating} Stars & Up</Text>
            </TouchableOpacity>
          ))}
          <Button onPress={() => setIsFilterVisible(false)}>Close</Button>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <PaperProvider>
        <View style={styles.headerContainer}>
          <Text style={[styles.header, { color: theme.colors.textColor }]}>
            Zaytoon
          </Text>
        </View>
        <View style={styles.searchContainer}>
          <Searchbar
            style={[
              styles.searchInput,
              { backgroundColor: theme.colors.background },
            ]}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          <View style={styles.filterButton}>
            <IconButton
              icon="filter-variant"
              size={24}
              iconColor={theme.colors.textColor}
              onPress={() => setIsFilterVisible(true)}
            />
          </View>
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.products_id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery ? "No products found" : "Search for products above"}
            </Text>
          }
        />

        {renderFilterModal()}
        {error && (
          <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>
        )}
      </PaperProvider>
    </SafeAreaView>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  headerContainer: {
    height: 30,
    width: "100%",
  },
  header: {
    fontSize: 18,
    justifyContent: "center",
    alignSelf: "center",
    paddingTop: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 5,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    borderRadius: 100,
    elevation: 5,
  },
  filterButton: {
    padding: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  separator: {
    height: 1,
    backgroundColor: "#CCC",
    marginHorizontal: 10,
  },
  productImage: {
    width: 130,
    height: 130,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: "contain",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2A4D69",
    marginBottom: 6,
  },
  categoryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#888",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    marginTop: "100%",
    elevation: 100,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFF",
    padding: 20,
    height: "100%",
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  filterOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
  },
  loader: {
    marginTop: 50,
  },
});
