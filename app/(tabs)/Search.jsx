import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Link, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PaperProvider,
  Searchbar,
  IconButton,
  Button,
  useTheme,
} from "react-native-paper";
import { Feather } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { debounce } from "lodash";
import useProductStore from "../../components/api/useProductStore";
import MultiSlider from "@ptomasroos/react-native-multi-slider";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    selectedBrands: [],
    selectedCategories: [],
    priceRange: [0, 10000],
  });

  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const navigation = useNavigation();
  const theme = useTheme();

  const { searchProductData, productData, error, subcategories } =
    useProductStore();
  const data = productData?.data ?? [];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Debounced search function using lodash.debounce
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query) {
        searchProductData(query);
      }
    }, 300),
    [searchProductData]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel(); // Cleanup debounce on unmount
  }, [searchQuery, debouncedSearch]);

  // Get unique brands for filter options
  const brands = useMemo(() => {
    const uniqueBrands = [...new Set(data.map((item) => item.brand_title))];
    return uniqueBrands.length > 0 ? uniqueBrands : ["No brands available"];
  }, [data]);

  // Get unique subcategories from product data (by their IDs)
  const categoriesFromData = useMemo(() => {
    const uniqueCategories = [
      ...new Set(data.map((item) => item.categories_id)),
    ];
    return uniqueCategories;
  }, [data]);

  const categoryOptions = useMemo(() => {
    if (!subcategories || !categoriesFromData)
      return [{ id: 0, name: "No categories available" }];
    return Object.values(subcategories)
      .flatMap((category) => category?.data || [])
      .filter((subcat) => subcat && categoriesFromData.includes(subcat.id));
  }, [subcategories, categoriesFromData]);

  const priceBounds = useMemo(() => {
    if (data.length === 0) return [0, 10000];
    const prices = data
      .map((item) => parseFloat(item.spu))
      .filter(
        (price) => !isNaN(price) && price !== null && price !== undefined
      );
    return prices.length > 0
      ? [Math.min(...prices), Math.max(...prices)]
      : [0, 10000];
  }, [data]);

  // Memoized filtered products
  const filteredProducts = useMemo(() => {
    return data.filter((product) => {
      // Rating filter
      if (filters.minRating > 0) {
        const rating = product.average_rating || 0;
        if (rating < filters.minRating) return false;
      }

      // Brand filter
      if (
        filters.selectedBrands.length > 0 &&
        !filters.selectedBrands.includes(product.brand_title)
      ) {
        return false;
      }
      // Category filter
      if (
        filters.selectedCategories.length > 0 &&
        (!product.categories_id ||
          !filters.selectedCategories.includes(product.categories_id))
      ) {
        return false;
      }

      // Price filter
      const price = parseFloat(product.spu);
      if (price < filters.priceRange[0] || price > filters.priceRange[1])
        return false;

      return true;
    });
  }, [data, filters]);

  // Refresh control
  const onRefresh = () => {
    setRefreshing(true);
    searchProductData(searchQuery).finally(() => setRefreshing(false));
  };

  const loadMoreProducts = () => {
    setPage((prevPage) => prevPage + 1);
  };

  // Chip press handler
  const handleChipPress = (filterType, value) => {
    setFilters((prev) => {
      const currentValues = prev[filterType];
      return {
        ...prev,
        [filterType]: currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });
  };

  // Render product item
  const ProductItem = React.memo(({ item }) => (
    <Link
      href={{
        pathname: `/screens/ProductDetail`,
        params: { id: item.products_id },
      }}
      asChild
    >
      <TouchableOpacity
        style={{
          backgroundColor: theme.colors.primary,
          flexDirection: "row",
          padding: 12,
          alignItems: "center",
        }}
        activeOpacity={0.7}
      >
        <Image
          source={
            item.product_image
              ? { uri: item.product_image }
              : require("../../assets/images/imageSkeleton.jpg")
          }
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text
            style={[styles.productName, { color: theme.colors.textColor }]}
            numberOfLines={3}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.productPrice, { color: theme.colors.textColor }]}
          >
            ${item.spu}
          </Text>
          <View style={styles.categoryContainer}>
            <Text
              style={[styles.productCategory, { color: theme.colors.pimary }]}
            >
              {item.brand_title}
            </Text>
            <View style={styles.ratingContainer}>
              <Feather name="star" size={16} color="#FFD700" />
              <Text
                style={[styles.ratingText, { color: theme.colors.textColor }]}
              >
                {item.average_rating || 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  ));

  const renderProductItem = useCallback(
    ({ item }) => <ProductItem item={item} />,
    []
  );

  const renderSeparator = () => <View style={styles.separator} />;

  // Filter modal component
  const renderFilterModal = () => (
    <Modal
      isVisible={isFilterVisible}
      onBackdropPress={() => setIsFilterVisible(false)}
      style={styles.bottomModal}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
            <Feather name="x" size={24} color={theme.colors.textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 400 }}>
          {/* Rating Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Minimum Rating</Text>
            <View style={styles.ratingContainer}>
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingPill,
                    filters.minRating === rating && styles.selectedPill,
                  ]}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, minRating: rating }))
                  }
                >
                  <Text>{rating === 0 ? "Any" : `${rating}+ ★`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Brand Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Brands</Text>
            <View style={styles.chipContainer}>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={[
                    styles.filterChip,
                    filters.selectedBrands.includes(brand) &&
                      styles.selectedChip,
                  ]}
                  onPress={() => handleChipPress("selectedBrands", brand)}
                >
                  <Text style={styles.chipText}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Categories</Text>
            <View style={styles.chipContainer}>
              {categoryOptions.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterChip,
                    filters.selectedCategories.includes(
                      category.categorie_id
                    ) && styles.selectedChip,
                  ]}
                  onPress={() =>
                    handleChipPress("selectedCategories", category.categorie_id)
                  }
                >
                  <Text style={styles.chipText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>
              Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
            </Text>
            <MultiSlider
              min={priceBounds[0]}
              max={priceBounds[1]}
              values={filters.priceRange}
              onValuesChange={(values) =>
                setFilters((prev) => ({ ...prev, priceRange: values }))
              }
              step={10}
              snapped
              allowOverlap
              markerStyle={styles.marker}
              selectedStyle={styles.selectedTrack}
              trackStyle={styles.track}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.filterActions}>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() =>
                setFilters({
                  minRating: 0,
                  selectedBrands: [],
                  selectedCategories: [],
                  priceRange: priceBounds,
                })
              }
            >
              Reset
            </Button>
            <Button
              mode="contained"
              style={styles.actionButton}
              onPress={() => setIsFilterVisible(false)}
            >
              Apply
            </Button>
          </View>
        </ScrollView>
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
            accessibilityLabel="Search for products"
            style={[
              styles.searchInput,
              { backgroundColor: theme.colors.primary },
            ]}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          <IconButton
            icon="filter-variant"
            size={24}
            onPress={() => setIsFilterVisible(true)}
            accessibilityLabel="Filter products"
            iconColor={theme.colors.textColor}
          />
        </View>

        <View style={{ backgroundColor: theme.colors.primary, flex: 1 }}>
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.products_id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No products found"
                  : "Search for products above"}
              </Text>
            }
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={loadMoreProducts}
            onEndReachedThreshold={0.5}
          />
        </View>

        {renderFilterModal()}

        {error && (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.errorText}>Oops, something went wrong.</Text>
            <Button
              mode="contained"
              onPress={() => searchProductData(searchQuery)}
              buttonColor={theme.colors.button}
            >
              Try Again
            </Button>
          </View>
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
    height: 50,
    width: "100%",
    justifyContent: "center",
  },
  header: {
    fontSize: 18,
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
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {},
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
  bottomModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFF",
    padding: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  filterScroll: {},
  filterSection: {
    marginBottom: 25,
  },
  filterTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },
  chipText: {
    fontSize: 14,
  },
  ratingPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  selectedPill: {
    backgroundColor: "#fff3e0",
    borderColor: "#ff9800",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
  },
  marker: {
    backgroundColor: "#2196f3",
    height: 20,
    width: 20,
    borderRadius: 10,
  },
  selectedTrack: {
    backgroundColor: "#2196f3",
  },
  track: {
    backgroundColor: "#ddd",
  },
  errorContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
});
