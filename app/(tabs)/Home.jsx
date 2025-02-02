import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useLayoutEffect, useState } from "react";
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
import { Popover, YStack, Button, Adapt } from "tamagui";
import useCartStore from "../../components/store/useCartStore";
import {
  useFetchData,
  fetchMainCategories,
  fetchNewArrivals,
} from "../../components/api/ProductFetcher";

const Home = () => {
  const theme = useTheme();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const navigation = useNavigation();

  const cart = useCartStore((state) => state.cart);

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useFetchData("mainCategories", fetchMainCategories);

  const {
    data: newArrivalsData,
    isLoading: isNewArrivalsLoading,
    error: newArrivalsError,
  } = useFetchData("newArrivals", fetchNewArrivals);

  const categories = categoriesData ? categoriesData.data : [];
  const newArrivals = newArrivalsData ? newArrivalsData.data : [];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  const handleCategoryPress = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(product.category);
    return matchesCategory;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
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

            <Popover
              open={filterVisible}
              onOpenChange={setFilterVisible}
              placement="bottom"
            >
              <Popover.Trigger asChild>
                <IconButton
                  icon="filter-variant"
                  size={24}
                  onPress={() => setFilterVisible(true)}
                  iconColor={theme.colors.textColor}
                />
              </Popover.Trigger>

              <Adapt when="sm" platform="touch">
                <Popover.Sheet animation="medium" modal dismissOnSnapToBottom>
                  <Popover.Sheet.Frame padding="$4">
                    <Adapt.Contents />
                  </Popover.Sheet.Frame>
                  <Popover.Sheet.Overlay
                    animation="lazy"
                    enterStyle={{ opacity: 0 }}
                    exitStyle={{ opacity: 0 }}
                  />
                </Popover.Sheet>
              </Adapt>

              <Popover.Content
                borderWidth={1}
                borderColor="$borderColor"
                marginRight={10}
                enterStyle={{ y: -10, opacity: 0 }}
                exitStyle={{ y: -10, opacity: 0 }}
                elevate
                animation={[
                  "quick",
                  {
                    opacity: {
                      overshootClamping: true,
                    },
                  },
                ]}
              >
                <Popover.Arrow borderWidth={1} borderColor="$borderColor" />

                <YStack gap="$3">
                  <Text style={styles.filterTitle}>Filters</Text>
                  <View style={styles.popoverContainer}>
                    <Text>Filter</Text>
                  </View>

                  <Popover.Close asChild>
                    <Button
                      size="$3"
                      onPress={() => {
                        // Handle filter application
                        setFilterVisible(false);
                      }}
                    >
                      Apply Filters
                    </Button>
                  </Popover.Close>
                </YStack>
              </Popover.Content>
            </Popover>
          </View>
        </View>
      </View>

      {/* Categories Section */}
      <Text
        style={[styles.categoriesHeader, { color: theme.colors.textColor }]}
      >
        Categories
      </Text>

      <View>
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <View style={styles.chipContainer}>
              <Chip
                mode="outlined"
                selected={selectedCategories.includes(item)}
                onPress={() => handleCategoryPress(item)}
                style={[
                  styles.chip,
                  {
                    borderWidth: 0.5,
                    backgroundColor: theme.colors.primary,
                  },
                  selectedCategories.includes(item) && {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.active,
                  },
                ]}
                rippleColor={theme.colors.riple}
                textStyle={{
                  color: selectedCategories.includes(item)
                    ? theme.colors.textColor
                    : theme.colors.inactiveColor,
                }}
                icon={({ size }) =>
                  selectedCategories.includes(item) ? (
                    <Icon
                      name="check"
                      size={size}
                      color={theme.colors.textColor}
                    />
                  ) : null
                }
                accessibilityLabel={`Filter by ${item} category`}
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
      </View>

      {/* Products List */}
      <View style={styles.productsList}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>
              No products found. Try adjusting your filters.
            </Text>
          </View>
        ) : (
          <ProductList data={filteredProducts} />
        )}
      </View>
    </View>
  );
};

export default Home;

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
  filterTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 8,
  },
  popoverContainer: {
    width: 200,
  },
  emptyContainer: {
    padding: 15,
  },
});
