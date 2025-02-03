import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Chip,
  useTheme,
  IconButton,
  Button as PaperButton,
  Badge,
} from "react-native-paper";
import products from "../../assets/data/ProductData";
import ProductList from "../../components/ui/ProductList";
import { Link, useNavigation } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useCartStore from "../../components/store/useCartStore";
import useProductStore from "../../components/api/useProductStore";
import ProductSkeleton from "../../components/productSkeleton";
import CategoriesSkeleton from "../../components/CategoriesSkeleton";

const Home = () => {
  const theme = useTheme();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState("default");
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const cart = useCartStore((state) => state.cart);

  const {
    fetchNewArrivals,
    fetchMainCategories,
    mainCategories,
    newArrivals,
    error,
  } = useProductStore();

  const data = newArrivals?.data ?? [];
  const categories = mainCategories?.data ?? [];

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await fetchNewArrivals();
        await fetchMainCategories();
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const getActionSheetStyles = () => ({
    textStyle: { color: theme.colors.textColor },
    titleTextStyle: {
      color: theme.colors.textColor,
      textAlign: "center",
      width: "100%",
      marginBottom: 8,
      fontSize: 16,
      fontWeight: "600",
    },
    containerStyle: {
      backgroundColor: theme.colors.primary,
    },
  });

  const handleFilterPress = () => {
    const options = [
      "Price: Low to High",
      "Price: High to Low",
      "Newest First",
      "Cancel",
    ];
    const cancelButtonIndex = 3;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: "Filter Products",
        ...getActionSheetStyles(),
      },
      (selectedIndex) => {
        if (
          selectedIndex !== undefined &&
          selectedIndex !== cancelButtonIndex
        ) {
          const sortOptions = ["priceLow", "priceHigh", "newest"];
          setSorting(sortOptions[selectedIndex]);
        }
      }
    );
  };

  const handleCategoryPress = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredProducts = data.filter((product) => {
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(product.main_category_id);
    return matchesCategory;
  });

  const getSortedProducts = () => {
    return [...filteredProducts].sort((a, b) => {
      switch (sorting) {
        case "priceLow":
          return a.price - b.price;
        case "priceHigh":
          return b.price - a.price;
        case "newest":
          return new Date(b.releaseDate) - new Date(a.releaseDate);
        default:
          return 0;
      }
    });
  };

  const sortedProducts = getSortedProducts();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.searchContainer}>
          <Link asChild href={{ pathname: "/Search" }}>
            <PaperButton
              icon="magnify"
              mode="contained"
              buttonColor={theme.colors.background}
              style={styles.searchBar}
            >
              Search Products...
            </PaperButton>
          </Link>
          <View style={styles.iconsContainer}>
            <Link href={{ pathname: "/screens/Cart" }} asChild>
              <Pressable android_ripple={theme.colors.riple}>
                <IconButton
                  icon="cart"
                  size={24}
                  iconColor={theme.colors.textColor}
                />
                <Badge
                  style={[
                    styles.badge,
                    {
                      position: "absolute",
                      top: 5,
                      left: 25,
                      backgroundColor: "red",
                    },
                  ]}
                >
                  {cart.length}
                </Badge>
              </Pressable>
            </Link>
            <IconButton
              icon="filter-variant"
              size={24}
              onPress={handleFilterPress}
              iconColor={theme.colors.textColor}
            />
          </View>
        </View>
      </View>
      <Text
        style={[styles.categoriesHeader, { color: theme.colors.textColor }]}
      >
        Categories
      </Text>

      <View>
        {loading ? (
          <FlatList
            data={Array(4).fill(null)}
            renderItem={CategoriesSkeleton}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.categoriesListContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <View style={styles.chipContainer}>
                <Chip
                  mode="outlined"
                  selected={selectedCategories.includes(item.main_category_id)}
                  onPress={() => handleCategoryPress(item.main_category_id)}
                  style={[
                    styles.chip,
                    {
                      borderWidth: 0.5,
                      backgroundColor: theme.colors.primary,
                    },
                    selectedCategories.includes(item.main_category_id) && {
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.active,
                    },
                  ]}
                  rippleColor={theme.colors.riple}
                  textStyle={{
                    color: selectedCategories.includes(item.main_category_id)
                      ? theme.colors.textColor
                      : theme.colors.inactiveColor,
                  }}
                  icon={({ size }) =>
                    selectedCategories.includes(item.main_category_id) ? (
                      <Icon
                        name="check"
                        size={size}
                        color={theme.colors.textColor}
                      />
                    ) : null
                  }
                  accessibilityLabel={`Filter by ${item.name} category`}
                  selectedColor={theme.colors.textColor}
                  elevated={true}
                >
                  {item.name}
                </Chip>
              </View>
            )}
            keyExtractor={(item) => item.main_category_id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipListContent}
          />
        )}
      </View>

      <View style={styles.productsList}>
        {loading ? (
          <FlatList
            data={Array(6).fill(null)}
            renderItem={ProductSkeleton}
            keyExtractor={(_, index) => index.toString()}
            numColumns={2}
            contentContainerStyle={styles.productsListContent}
          />
        ) : (
          <ProductList data={sortedProducts} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingVertical: 5,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  chipContainer: {
    padding: 5,
  },
  chipListContent: {
    paddingTop: 5,
    paddingHorizontal: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchBar: {
    flex: 1,
    borderRadius: 40,
  },
  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoriesHeader: {
    marginLeft: 16,
    marginVertical: 8,
    fontSize: 22,
    fontWeight: "600",
  },
  productsList: {
    flex: 1,
  },
  emptyContainer: {
    padding: 15,
  },
  badge: {
    position: "absolute",
    top: 5,
    left: 25,
    backgroundColor: "red",
  },
  categoriesListContent: {
    paddingHorizontal: 10,
  },
});

export default Home;
