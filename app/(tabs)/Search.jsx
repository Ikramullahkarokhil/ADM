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
  StatusBar,
  Pressable,
} from "react-native";
import { useNavigation, useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, useTheme } from "react-native-paper";
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
  const [searchHistory, setSearchHistory] = useState([]);
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

  // Debounced search function
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
      .flat()
      .filter((subcat) => subcat && categoriesFromData.includes(subcat.id));
  }, [subcategories, categoriesFromData]);

  const priceBounds = useMemo(() => {
    if (productData.length === 0) return [0, 10000];
    const prices = productData
      .map((item) => Number.parseFloat(item.spu))
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
      const price = Number.parseFloat(product.spu);
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
      const stars = [];
      for (let i = 0; i < Math.floor(rating); i++) {
        stars.push(<Feather key={i} name="star" size={16} color="#FFD700" />);
      }
      return stars;
    };

    return (
      <View style={styles.ratingContainer}>
        {renderStars(rating)}
        <Text
          style={[styles.ratingText, { color: theme.colors.inactiveColor }]}
        >
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
      <Pressable
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
        style={({ pressed }) => [
          styles.productCard,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.productCardContent}>
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
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.productPrice, { color: theme.colors.button }]}>
              AF {item.spu}
            </Text>

            {item.brand_title !== "none" && (
              <View style={styles.categoryContainer}>
                <Text
                  style={[
                    styles.productCategory,
                    {
                      color: theme.colors.subtextColor,
                      backgroundColor: theme.colors.subInactiveColor,
                    },
                  ]}
                >
                  {item.brand_title}
                </Text>
              </View>
            )}

            <RatingStars rating={item.average_rating || 0} />
          </View>
        </View>
      </Pressable>
    );
  });

  const renderProductItem = useCallback(
    ({ item }) => <ProductItem item={item} />,
    [
      theme,
      searchQuery,
      searchHistory,
      handleSearchHistoryUpdate,
      router,
      placeholderImage,
    ]
  );

  const renderFilterModal = () => (
    <Modal
      isVisible={isFilterVisible}
      onBackdropPress={() => setIsFilterVisible(false)}
      style={styles.bottomModal}
      statusBarTranslucent
      backdropOpacity={0.5}
    >
      <View
        style={[styles.modalContent, { backgroundColor: theme.colors.primary }]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.textColor }]}>
            Filters
          </Text>
          <TouchableOpacity
            onPress={() => setIsFilterVisible(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={24} color={theme.colors.textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.filterSection}>
            <Text
              style={[styles.filterTitle, { color: theme.colors.textColor }]}
            >
              Minimum Rating
            </Text>
            <View style={styles.ratingOptions}>
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingPill,
                    {
                      backgroundColor:
                        filters.minRating === rating
                          ? theme.colors.button
                          : theme.colors.chip,
                    },
                  ]}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, minRating: rating }))
                  }
                >
                  <Text
                    style={{
                      color:
                        filters.minRating === rating
                          ? theme.colors.textColor
                          : theme.colors.textColor,
                    }}
                  >
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
                        backgroundColor: filters.selectedBrands.includes(brand)
                          ? theme.colors.button
                          : theme.colors.chip,
                      },
                    ]}
                    onPress={() => handleChipPress("selectedBrands", brand)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: filters.selectedBrands.includes(brand)
                            ? theme.colors.textColor
                            : theme.colors.textColor,
                        },
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
                        backgroundColor: filters.selectedCategories.includes(
                          category.categorie_id || category.id
                        )
                          ? theme.colors.button
                          : theme.colors.chip,
                      },
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
                        {
                          color: filters.selectedCategories.includes(
                            category.categorie_id || category.id
                          )
                            ? theme.colors.textColor
                            : theme.colors.textColor,
                        },
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
              Price Range: AF {filters.priceRange[0]} - AF{" "}
              {filters.priceRange[1]}
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
              markerStyle={[
                styles.marker,
                { backgroundColor: theme.colors.button },
              ]}
              selectedStyle={[
                styles.selectedTrack,
                { backgroundColor: theme.colors.button },
              ]}
              trackStyle={[
                styles.track,
                { backgroundColor: theme.colors.subInactiveColor },
              ]}
              containerStyle={styles.sliderContainer}
            />
          </View>

          <View style={styles.filterActions}>
            <Button
              mode="outlined"
              style={[
                styles.actionButton,
                { borderColor: theme.colors.subInactiveColor },
              ]}
              labelStyle={{ color: theme.colors.textColor }}
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
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.button },
              ]}
              onPress={() => setIsFilterVisible(false)}
              textColor={theme.colors.textColor}
            >
              Apply Filters
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderActiveFilters = () => {
    const hasActiveFilters =
      filters.minRating > 0 ||
      filters.selectedBrands.length > 0 ||
      filters.selectedCategories.length > 0 ||
      filters.priceRange[0] !== priceBounds[0] ||
      filters.priceRange[1] !== priceBounds[1];

    if (!hasActiveFilters || !searchQuery) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersScroll}
        >
          {filters.minRating > 0 && (
            <View
              style={[
                styles.activeFilterChip,
                { backgroundColor: theme.colors.button },
              ]}
            >
              <Text style={styles.activeFilterText}>
                {filters.minRating}+ Stars
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setFilters((prev) => ({ ...prev, minRating: 0 }))
                }
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <Feather name="x" size={14} color={theme.colors.textColor} />
              </TouchableOpacity>
            </View>
          )}

          {filters.selectedBrands.map((brand) => (
            <View
              key={brand}
              style={[
                styles.activeFilterChip,
                { backgroundColor: theme.colors.button },
              ]}
            >
              <Text style={[styles.activeFilterText]}>{brand}</Text>
              <TouchableOpacity
                onPress={() => handleChipPress("selectedBrands", brand)}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <Feather name="x" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}

          {filters.selectedCategories.map((catId) => {
            const category = categoryOptions.find(
              (c) => c.id === catId || c.categorie_id === catId
            );
            return category ? (
              <View
                key={catId}
                style={[
                  styles.activeFilterChip,
                  { backgroundColor: theme.colors.button },
                ]}
              >
                <Text style={[styles.activeFilterText]}>{category.name}</Text>
                <TouchableOpacity
                  onPress={() => handleChipPress("selectedCategories", catId)}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                  <Feather name="x" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ) : null;
          })}

          {(filters.priceRange[0] !== priceBounds[0] ||
            filters.priceRange[1] !== priceBounds[1]) && (
            <View
              style={[
                styles.activeFilterChip,
                { backgroundColor: theme.colors.button },
              ]}
            >
              <Text style={[styles.activeFilterText]}>
                AF {filters.priceRange[0]} - AF {filters.priceRange[1]}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setFilters((prev) => ({ ...prev, priceRange: priceBounds }))
                }
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              >
                <Feather name="x" size={14} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {hasActiveFilters && (
            <TouchableOpacity
              style={[
                styles.clearAllButton,
                { borderColor: theme.colors.subInactiveColor },
              ]}
              onPress={() =>
                setFilters({
                  minRating: 0,
                  selectedBrands: [],
                  selectedCategories: [],
                  priceRange: priceBounds,
                })
              }
            >
              <Text style={{ color: theme.colors.textColor }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <StatusBar
        barStyle={isDarkTheme ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.primary}
      />

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
        <View
          style={[
            styles.searchInputWrapper,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.subInactiveColor,
              borderWidth: 1,
            },
          ]}
        >
          <Feather
            name="search"
            size={20}
            color={theme.colors.inactiveColor}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel="Search for products"
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.primary,
                color: theme.colors.textColor,
                height: 40,
              },
            ]}
            placeholder="Search products..."
            placeholderTextColor={theme.colors.inactiveColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.colors.textColor} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: isFilterVisible
                ? theme.colors.button
                : theme.colors.primary,
              borderColor: theme.colors.subInactiveColor,
            },
          ]}
          onPress={() => setIsFilterVisible(true)}
          accessibilityLabel="Filter products"
        >
          <Feather
            name="sliders"
            size={20}
            color={
              isFilterVisible ? theme.colors.textColor : theme.colors.textColor
            }
          />
        </TouchableOpacity>
      </View>

      {renderActiveFilters()}

      <View style={{ backgroundColor: theme.colors.primary, flex: 1 }}>
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.products_id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyStateContainer}>
                <Feather
                  name="search"
                  size={50}
                  color={theme.colors.subtextColor}
                />
                <Text
                  style={[styles.emptyText, { color: theme.colors.textColor }]}
                >
                  No products found
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: theme.colors.inactiveColor },
                  ]}
                >
                  Try adjusting your search or filters
                </Text>
              </View>
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
                      style={[
                        styles.historyItemContainer,
                        { borderBottomColor: theme.colors.subInactiveColor },
                      ]}
                    >
                      <Feather
                        name="clock"
                        size={16}
                        color={theme.colors.inactiveColor}
                        style={styles.historyIcon}
                      />
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
                  <View style={styles.emptyStateContainer}>
                    <Feather
                      name="clock"
                      size={50}
                      color={theme.colors.subtextColor}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: theme.colors.textColor },
                      ]}
                    >
                      No recent searches
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtext,
                        { color: theme.colors.inactiveColor },
                      ]}
                    >
                      Your search history will appear here
                    </Text>
                  </View>
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
          <Feather
            name="alert-circle"
            size={24}
            color="#FF4D4F"
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>Oops, something went wrong.</Text>
          <Button
            mode="contained"
            onPress={() => searchProductData(searchQuery)}
            style={{ backgroundColor: theme.colors.button }}
          >
            Try Again
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    height: 50,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  logo: {
    height: 30,
    width: 120,
    resizeMode: "contain",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,

    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    paddingTop: 12,
  },
  activeFiltersScroll: {
    paddingRight: 16,
    flexDirection: "row",
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 14,
    color: "white",
  },
  clearAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  // Update these styles for list view
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  productCard: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productCardContent: {
    flexDirection: "row",
    padding: 12,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 22,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    flex: 1,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
  bottomModal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalScroll: {
    maxHeight: "100%",
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  ratingOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    marginBottom: 4,
  },
  chipText: {
    fontSize: 14,
  },
  ratingPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  sliderContainer: {
    marginTop: 10,
    marginLeft: 20,
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  marker: {
    height: 20,
    width: 20,
    borderRadius: 10,
  },
  selectedTrack: {
    height: 4,
  },
  track: {
    height: 4,
  },
  errorContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorText: {
    color: "#FF4D4F",
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  historyContainer: {
    paddingHorizontal: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  historyItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyItem: {
    fontSize: 16,
  },
});
