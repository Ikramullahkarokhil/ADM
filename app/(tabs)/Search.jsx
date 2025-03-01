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
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect, useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PaperProvider,
  IconButton,
  Button,
  useTheme,
} from "react-native-paper";
import { Feather } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { debounce } from "lodash";
import useProductStore from "../../components/api/useProductStore";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import useThemeStore from "../../components/store/useThemeStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    selectedBrands: [],
    selectedCategories: [],
    priceRange: [0, 10000],
  });
  const [searchHistory, setSearchHistory] = useState([]); // State for search history
  const { isDarkTheme } = useThemeStore();
  const [page, setPage] = useState(1);
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useTheme();
  const {
    searchProductData,
    productData = [],
    error,
    subcategories,
  } = useProductStore();

  // Load search history on component mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem("searchHistory");
        if (history !== null) {
          setSearchHistory(JSON.parse(history));
        }
      } catch (error) {
        console.error("Failed to load search history:", error);
      }
    };

    loadSearchHistory();
  }, []);

  // Save search history to AsyncStorage
  const saveSearchHistory = async (history) => {
    try {
      await AsyncStorage.setItem("searchHistory", JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  // Update search history state and save to AsyncStorage
  const handleSearchHistoryUpdate = async (newHistory) => {
    setSearchHistory(newHistory);
    await saveSearchHistory(newHistory);
  };

  // Reset state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setSearchQuery("");
      setFilters({
        minRating: 0,
        selectedBrands: [],
        selectedCategories: [],
        priceRange: [0, 10000],
      });
      setPage(1);
      setIsFilterVisible(false);
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Debounced search function (no history update here)
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query) {
        searchProductData(query); // Only fetch products, no history update
      }
    }, 300),
    [searchProductData]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  const brands = useMemo(() => {
    const uniqueBrands = [
      ...new Set(productData.map((item) => item.brand_title)),
    ];
    return uniqueBrands.length > 0 ? uniqueBrands : ["No brands available"];
  }, [productData]);

  const categoriesFromData = useMemo(() => {
    const uniqueCategories = [
      ...new Set(productData.map((item) => item.categories_id)),
    ];
    return uniqueCategories;
  }, [productData]);

  const categoryOptions = useMemo(() => {
    if (!subcategories || !categoriesFromData)
      return [{ id: 0, name: "No categories available" }];
    return Object.values(subcategories)
      .flatMap((category) => category)
      .filter((subcat) => subcat && categoriesFromData.includes(subcat.id));
  }, [subcategories, categoriesFromData]);

  const priceBounds = useMemo(() => {
    if (productData.length === 0) return [0, 10000];
    const prices = productData
      .map((item) => parseFloat(item.spu))
      .filter(
        (price) => !isNaN(price) && price !== null && price !== undefined
      );
    return prices.length > 0
      ? [Math.min(...prices), Math.max(...prices)]
      : [0, 10000];
  }, [productData]);

  // Empty product list when no search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    return productData.filter((product) => {
      if (filters.minRating > 0) {
        const rating = product.average_rating || 0;
        if (rating < filters.minRating) return false;
      }
      if (
        filters.selectedBrands.length > 0 &&
        !filters.selectedBrands.includes(product.brand_title)
      ) {
        return false;
      }
      if (
        filters.selectedCategories.length > 0 &&
        (!product.categories_id ||
          !filters.selectedCategories.includes(product.categories_id))
      ) {
        return false;
      }
      const price = parseFloat(product.spu);
      if (price < filters.priceRange[0] || price > filters.priceRange[1])
        return false;
      return true;
    });
  }, [productData, filters, searchQuery]);

  const loadMoreProducts = () => {
    setPage((prevPage) => prevPage + 1);
  };

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

  const RatingStars = ({ rating }) => {
    const renderStars = (rating) => {
      let stars = [];
      for (let i = 0; i < Math.floor(rating); i++) {
        stars.push(<Feather key={i} name="star" size={16} color="#FFD700" />);
      }
      return stars;
    };

    return (
      <View style={styles.ratingContainer}>
        {renderStars(rating)}
        <Text style={[styles.ratingText, { color: theme.colors.textColor }]}>
          {rating || 0}
        </Text>
      </View>
    );
  };

  const placeholderImage = isDarkTheme
    ? require("../../assets/images/darkImagePlaceholder.jpg")
    : require("../../assets/images/imageSkeleton.jpg");

  const ProductItem = React.memo(({ item }) => {
    return (
      <TouchableOpacity
        onPress={async () => {
          // Update search history when product is clicked
          const newHistory = [
            searchQuery,
            ...searchHistory.filter((q) => q !== searchQuery),
          ].slice(0, 10);

          await handleSearchHistoryUpdate(newHistory);

          // Navigate to product detail
          router.push({
            pathname: `/screens/ProductDetail`,
            params: { id: item.products_id },
          });
        }}
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
            item.product_images && item.product_images.length > 0
              ? { uri: item.product_images[0] }
              : placeholderImage
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
          <Text style={[styles.productPrice, { color: theme.colors.button }]}>
            AF {item.spu}
          </Text>
          <View style={styles.categoryContainer}>
            {item.brand_title !== "none" && (
              <Text
                style={[
                  styles.productCategory,
                  {
                    color: theme.colors.textColor,
                    backgroundColor: theme.colors.subInactiveColor,
                  },
                ]}
              >
                {item.brand_title}
              </Text>
            )}
          </View>
          <View style={styles.ratingContainer}>
            <Feather name="star" size={16} color="#FFD700" />
            <RatingStars rating={item.average_rating || 0} />
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  const renderProductItem = useCallback(
    ({ item }) => <ProductItem item={item} />,
    [theme]
  );

  const renderSeparator = () => (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme.colors.subInactiveColor },
      ]}
    />
  );

  const renderFilterModal = () => (
    <Modal
      isVisible={isFilterVisible}
      onBackdropPress={() => setIsFilterVisible(false)}
      style={styles.bottomModal}
      statusBarTranslucent
    >
      <View
        style={[styles.modalContent, { backgroundColor: theme.colors.primary }]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.textColor }]}>
            Filters
          </Text>
          <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
            <Feather name="x" size={24} color={theme.colors.textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 400 }}>
          <View style={styles.filterSection}>
            <Text
              style={[styles.filterTitle, { color: theme.colors.textColor }]}
            >
              Minimum Rating
            </Text>
            <View style={styles.ratingContainer}>
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingPill,
                    {
                      backgroundColor: theme.colors.subInactiveColor,
                    },
                    filters.minRating === rating && styles.selectedPill,
                  ]}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, minRating: rating }))
                  }
                >
                  <Text style={{ color: theme.colors.textColor }}>
                    {rating === 0 ? "Any" : `${rating}+ ★`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text
              style={[styles.filterTitle, { color: theme.colors.textColor }]}
            >
              Brands
            </Text>
            <View style={styles.chipContainer}>
              {brands
                .filter((brand) => brand.toLowerCase() !== "none")
                .map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: theme.colors.subInactiveColor,
                        borderColor: theme.colors.inactiveColor,
                      },
                      filters.selectedBrands.includes(brand) &&
                        styles.selectedChip,
                    ]}
                    onPress={() => handleChipPress("selectedBrands", brand)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.colors.textColor },
                      ]}
                    >
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          {categoryOptions?.length > 0 && (
            <View style={styles.filterSection}>
              <Text
                style={[styles.filterTitle, { color: theme.colors.textColor }]}
              >
                Categories
              </Text>
              <View style={styles.chipContainer}>
                {categoryOptions.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: theme.colors.subInactiveColor,
                        borderColor: theme.colors.inactiveColor,
                      },
                      filters.selectedCategories.includes(
                        category.categorie_id || category.id
                      ) && styles.selectedChip,
                    ]}
                    onPress={() =>
                      handleChipPress(
                        "selectedCategories",
                        category.categorie_id || category.id
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.colors.textColor },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.filterSection}>
            <Text
              style={[styles.filterTitle, { color: theme.colors.textColor }]}
            >
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
          <Image
            source={
              !isDarkTheme
                ? require("../../assets/images/darkLogo.png")
                : require("../../assets/images/lightLogo.png")
            }
            style={styles.logo}
          />
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            accessibilityLabel="Search for products"
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.subInactiveColor,
                color: theme.colors.textColor,
              },
            ]}
            placeholder="Search products..."
            placeholderTextColor={theme.colors.inactiveColor}
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
              searchQuery ? (
                <Text style={styles.emptyText}>No products found</Text>
              ) : (
                <View style={styles.historyContainer}>
                  <Text
                    style={[
                      styles.historyTitle,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    Recent Searches
                  </Text>
                  {searchHistory.length > 0 ? (
                    searchHistory.map((query, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSearchQuery(query)}
                        style={styles.historyItemContainer}
                      >
                        <Text
                          style={[
                            styles.historyItem,
                            { color: theme.colors.textColor },
                          ]}
                        >
                          {query}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text
                      style={[
                        styles.emptyText,
                        { color: theme.colors.textColor },
                      ]}
                    >
                      No recent searches
                    </Text>
                  )}
                </View>
              )
            }
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
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 5,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    elevation: 10,
    borderWidth: 0.5,
    paddingHorizontal: 15,
    height: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
  separator: {
    height: 1,
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
    marginTop: 5,
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
  },
  selectedPill: {
    backgroundColor: "#fff3e0",
    borderColor: "#ff9800",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  marker: {
    backgroundColor: "#2196f3",
    height: 20,
    width: 20,
    borderRadius: 10,
    marginLeft: 20,
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
  logo: {
    height: 30,
    width: 120,
  },
  historyContainer: {
    padding: 10,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  historyItemContainer: {
    paddingVertical: 8,
  },
  historyItem: {
    fontSize: 16,
  },
});
