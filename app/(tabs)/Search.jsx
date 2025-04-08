"use client";

import {
  useReducer,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  memo,
  useRef,
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
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, useTheme } from "react-native-paper";
import { Feather } from "@expo/vector-icons";
import Modal from "react-native-modal";
import useProductStore from "../../components/api/useProductStore";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import useThemeStore from "../../components/store/useThemeStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AlertDialog from "../../components/ui/AlertDialog";

// Constants to avoid recreating objects on each render
const STORAGE_KEY = "searchHistory";
const INITIAL_PRICE_RANGE = [0, 10000];
const DEBOUNCE_DELAY = 300;
const RATINGS = [0, 1, 2, 3, 4, 5];
const INITIAL_ITEMS_TO_RENDER = 8;
const BATCH_SIZE = 10;

// Optimized debounce function with useRef to persist timeout between renders
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

// Initial state for reducer
const initialState = {
  searchQuery: "",
  isFilterVisible: false,
  filters: {
    minRating: 0,
    selectedBrands: [],
    selectedCategories: [],
    priceRange: INITIAL_PRICE_RANGE,
  },
  searchHistory: [],
  showClearHistoryDialog: false,
  page: 1,
  isLoading: false,
  refreshing: false,
};

// Optimized reducer with better type handling
function reducer(state, action) {
  switch (action.type) {
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "TOGGLE_FILTER_MODAL":
      return { ...state, isFilterVisible: action.payload };
    case "UPDATE_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case "UPDATE_FILTER_ITEM": {
      const { filterType, value } = action.payload;
      const currentValues = state.filters[filterType];
      return {
        ...state,
        filters: {
          ...state.filters,
          [filterType]: currentValues.includes(value)
            ? currentValues.filter((item) => item !== value)
            : [...currentValues, value],
        },
      };
    }
    case "RESET_FILTERS":
      return {
        ...state,
        filters: {
          ...initialState.filters,
          priceRange: action.payload || INITIAL_PRICE_RANGE,
        },
      };
    case "SET_SEARCH_HISTORY":
      return { ...state, searchHistory: action.payload };
    case "TOGGLE_CLEAR_HISTORY_DIALOG":
      return { ...state, showClearHistoryDialog: action.payload };
    case "SET_PAGE":
      return { ...state, page: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "RESET_STATE":
      return {
        ...initialState,
        searchHistory: state.searchHistory, // Preserve search history
      };
    default:
      return state;
  }
}

// Optimized RatingStars component
const RatingStars = memo(({ rating, theme }) => {
  // Pre-calculate stars for better performance
  const stars = useMemo(() => {
    const result = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < 5; i++) {
      result.push(
        <Feather
          key={i}
          name={i < fullStars ? "star" : "star"}
          size={16}
          color={i < fullStars ? "#FFD700" : theme.colors.subInactiveColor}
        />
      );
    }
    return result;
  }, [rating, theme.colors.subInactiveColor]);

  return (
    <View style={styles.ratingContainer}>
      {stars}
      <Text style={[styles.ratingText, { color: theme.colors.inactiveColor }]}>
        {rating || 0}
      </Text>
    </View>
  );
});

// Optimized ProductItem component with better prop structure
const ProductItem = memo(
  ({ item, onProductPress, theme, isDarkTheme }) => {
    const handlePress = useCallback(() => {
      onProductPress(item.products_id);
    }, [item.products_id, onProductPress]);

    const placeholderImage = isDarkTheme
      ? require("../../assets/images/darkImagePlaceholder.jpg")
      : require("../../assets/images/imageSkeleton.jpg");

    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.productCard,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        accessibilityLabel={`Product: ${item.title}`}
        accessibilityHint="Tap to view product details"
      >
        <View style={styles.productCardContent}>
          <Image
            source={
              item.product_images?.length > 0
                ? { uri: item.product_images[0] }
                : placeholderImage
            }
            style={styles.productImage}
            resizeMode="cover"
            accessibilityLabel={`Image of ${item.title}`}
            fadeDuration={200}
            progressiveRenderingEnabled={true}
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

            {item.brand_title && item.brand_title !== "none" && (
              <View style={styles.categoryContainer}>
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
              </View>
            )}

            {item.average_rating > 0 && (
              <RatingStars rating={item.average_rating} theme={theme} />
            )}
          </View>
        </View>
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo to prevent unnecessary re-renders
    return (
      prevProps.item.products_id === nextProps.item.products_id &&
      prevProps.theme === nextProps.theme &&
      prevProps.isDarkTheme === nextProps.isDarkTheme
    );
  }
);

// Optimized FilterChip component
const FilterChip = memo(({ label, isSelected, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      {
        backgroundColor: isSelected ? theme.colors.button : theme.colors.chip,
        borderColor: theme.colors.subInactiveColor,
        borderWidth: 1,
      },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.chipText,
        {
          color: isSelected ? "#FFFFFF" : theme.colors.textColor,
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
));

// Optimized ActiveFilterChip component
const ActiveFilterChip = memo(({ label, onRemove, theme }) => (
  <View
    style={[styles.activeFilterChip, { backgroundColor: theme.colors.button }]}
  >
    <Text style={styles.activeFilterText}>{label}</Text>
    <TouchableOpacity
      onPress={onRemove}
      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
    >
      <Feather name="x" size={14} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
));

// Optimized FilterModal component
const FilterModal = memo(
  ({
    isVisible,
    onClose,
    filters,
    onUpdateFilters,
    onUpdateFilterItem,
    onResetFilters,
    theme,
    brands,
    categoryOptions,
    priceBounds,
  }) => {
    return (
      <Modal
        isVisible={isVisible}
        onBackdropPress={onClose}
        style={styles.bottomModal}
        statusBarTranslucent
        backdropOpacity={0.5}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        animationOutTiming={300}
        animationInTiming={300}
        useNativeDriver={true}
        useNativeDriverForBackdrop={true}
        backdropTransitionOutTiming={0}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[styles.modalTitle, { color: theme.colors.textColor }]}
            >
              Filters
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close filters"
            >
              <Feather name="x" size={24} color={theme.colors.textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === "android"}
          >
            {/* Rating Section */}
            <View style={styles.filterSection}>
              <Text
                style={[styles.filterTitle, { color: theme.colors.textColor }]}
              >
                Minimum Rating
              </Text>
              <View style={styles.ratingOptions}>
                {RATINGS.map((rating) => (
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
                    onPress={() => onUpdateFilters({ minRating: rating })}
                    accessibilityLabel={`${
                      rating === 0 ? "Any" : rating + "+"
                    } star rating`}
                    accessibilityState={{
                      selected: filters.minRating === rating,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          filters.minRating === rating
                            ? "#FFFFFF"
                            : theme.colors.textColor,
                        fontWeight:
                          filters.minRating === rating ? "bold" : "normal",
                      }}
                    >
                      {rating === 0 ? "Any" : `${rating}+ ★`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Brands Section */}
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
                    <FilterChip
                      key={brand}
                      label={brand}
                      isSelected={filters.selectedBrands.includes(brand)}
                      onPress={() =>
                        onUpdateFilterItem("selectedBrands", brand)
                      }
                      theme={theme}
                    />
                  ))}
              </View>
            </View>

            {/* Categories Section */}
            {categoryOptions?.length > 0 && (
              <View style={styles.filterSection}>
                <Text
                  style={[
                    styles.filterTitle,
                    { color: theme.colors.textColor },
                  ]}
                >
                  Categories
                </Text>
                <View style={styles.chipContainer}>
                  {categoryOptions.map((category) => (
                    <FilterChip
                      key={category.id}
                      label={category.name}
                      isSelected={filters.selectedCategories.includes(
                        category.categorie_id || category.id
                      )}
                      onPress={() =>
                        onUpdateFilterItem(
                          "selectedCategories",
                          category.categorie_id || category.id
                        )
                      }
                      theme={theme}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Price Range Section */}
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
                  onUpdateFilters({ priceRange: values })
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
                enableLabel
                customLabel={(props) => (
                  <View style={styles.sliderLabelContainer}>
                    <Text style={styles.sliderLabel}>
                      AF {props.oneMarkerValue}
                    </Text>
                    <Text style={styles.sliderLabel}>
                      AF {props.twoMarkerValue}
                    </Text>
                  </View>
                )}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.filterActions}>
              <Button
                mode="outlined"
                style={[
                  styles.actionButton,
                  { borderColor: theme.colors.subInactiveColor },
                ]}
                labelStyle={{ color: theme.colors.textColor }}
                onPress={() => onResetFilters(priceBounds)}
                accessibilityLabel="Reset filters"
              >
                Reset
              </Button>
              <Button
                mode="contained"
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.button },
                ]}
                onPress={onClose}
                textColor="#FFFFFF"
                accessibilityLabel="Apply filters"
              >
                Apply Filters
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }
);

// Optimized ActiveFilters component
const ActiveFilters = memo(
  ({
    filters,
    searchQuery,
    priceBounds,
    theme,
    categoryOptions,
    onUpdateFilters,
    onUpdateFilterItem,
    onResetFilters,
  }) => {
    // Check if any filters are active
    const hasActiveFilters = useMemo(
      () =>
        filters.minRating > 0 ||
        filters.selectedBrands.length > 0 ||
        filters.selectedCategories.length > 0 ||
        filters.priceRange[0] !== priceBounds[0] ||
        filters.priceRange[1] !== priceBounds[1],
      [filters, priceBounds]
    );

    if (!hasActiveFilters || !searchQuery) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersScroll}
        >
          {filters.minRating > 0 && (
            <ActiveFilterChip
              label={`${filters.minRating}+ Stars`}
              onRemove={() => onUpdateFilters({ minRating: 0 })}
              theme={theme}
            />
          )}

          {filters.selectedBrands.map((brand) => (
            <ActiveFilterChip
              key={`brand-${brand}`}
              label={brand}
              onRemove={() => onUpdateFilterItem("selectedBrands", brand)}
              theme={theme}
            />
          ))}

          {filters.selectedCategories.map((catId) => {
            const category = categoryOptions.find(
              (c) => c.id === catId || c.categorie_id === catId
            );
            return category ? (
              <ActiveFilterChip
                key={`cat-${catId}`}
                label={category.name}
                onRemove={() => onUpdateFilterItem("selectedCategories", catId)}
                theme={theme}
              />
            ) : null;
          })}

          {(filters.priceRange[0] !== priceBounds[0] ||
            filters.priceRange[1] !== priceBounds[1]) && (
            <ActiveFilterChip
              label={`AF ${filters.priceRange[0]} - AF ${filters.priceRange[1]}`}
              onRemove={() => onUpdateFilters({ priceRange: priceBounds })}
              theme={theme}
            />
          )}

          <TouchableOpacity
            style={[
              styles.clearAllButton,
              { borderColor: theme.colors.subInactiveColor },
            ]}
            onPress={() => onResetFilters(priceBounds)}
          >
            <Text style={{ color: theme.colors.textColor }}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
);

// Optimized HistoryItem component
const HistoryItem = memo(({ query, theme, onPress }) => (
  <TouchableOpacity
    onPress={() => onPress(query)}
    style={[
      styles.historyItemContainer,
      { borderBottomColor: theme.colors.subInactiveColor },
    ]}
    accessibilityLabel={`Search for ${query}`}
    accessibilityHint="Tap to search for this term"
  >
    <Feather
      name="clock"
      size={16}
      color={theme.colors.inactiveColor}
      style={styles.historyIcon}
    />
    <Text style={[styles.historyItem, { color: theme.colors.textColor }]}>
      {query}
    </Text>
  </TouchableOpacity>
));

// Optimized SearchResults component
const SearchResults = memo(
  ({
    isLoading,
    isSearching,
    searchQuery,
    filteredProducts,
    filters,
    priceBounds,
    theme,
    renderProductItem,
    loadMoreProducts,
    onResetFilters,
    searchHistory,
    clearSearchHistory,
    onHistoryItemPress,
  }) => {
    // Loading state
    if (isLoading || isSearching) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.button} />
          <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
            Searching...
          </Text>
        </View>
      );
    }

    // No results state
    if (searchQuery && filteredProducts.length === 0) {
      const hasActiveFilters =
        filters.minRating > 0 ||
        filters.selectedBrands.length > 0 ||
        filters.selectedCategories.length > 0 ||
        filters.priceRange[0] !== priceBounds[0] ||
        filters.priceRange[1] !== priceBounds[1];

      return (
        <View style={styles.emptyStateContainer}>
          <Feather name="search" size={50} color={theme.colors.textColor} />
          <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
            No products found
          </Text>
          <Text
            style={[styles.emptySubtext, { color: theme.colors.inactiveColor }]}
          >
            Try adjusting your search or filters
          </Text>
          {hasActiveFilters && (
            <Button
              mode="outlined"
              style={{ marginTop: 16, borderColor: theme.colors.button }}
              labelStyle={{ color: theme.colors.button }}
              onPress={() => onResetFilters(priceBounds)}
            >
              Clear Filters
            </Button>
          )}
        </View>
      );
    }

    // Search results
    if (searchQuery) {
      return (
        <View style={{ flex: 1 }}>
          <View style={styles.resultsHeader}>
            <Text
              style={[styles.resultsCount, { color: theme.colors.textColor }]}
            >
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "result" : "results"} for "
              {searchQuery}"
            </Text>
          </View>
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => `product-${item.products_id}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreProducts}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={Platform.OS === "android"}
            maxToRenderPerBatch={BATCH_SIZE}
            windowSize={10}
            initialNumToRender={INITIAL_ITEMS_TO_RENDER}
            getItemLayout={(data, index) => ({
              length: 144, // height of item + margin
              offset: 144 * index,
              index,
            })}
          />
        </View>
      );
    }

    // Search history
    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text
            style={[
              styles.historyTitle,
              { color: theme.colors.textColor, marginTop: 20 },
            ]}
          >
            Recent Searches
          </Text>
          {searchHistory.length > 0 && (
            <TouchableOpacity
              onPress={clearSearchHistory}
              style={styles.clearHistoryButton}
              accessibilityLabel="Clear search history"
            >
              <Text style={{ color: theme.colors.button }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchHistory.length > 0 ? (
          searchHistory
            .slice(0, 5)
            .map((query, index) => (
              <HistoryItem
                key={`history-${index}`}
                query={query}
                theme={theme}
                onPress={onHistoryItemPress}
              />
            ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Feather name="clock" size={50} color={theme.colors.textColor} />
            <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
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
    );
  }
);

// Main component
const Search = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isDarkTheme } = useThemeStore();
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useTheme();
  const inputRef = useRef(null);

  // Destructure state for readability
  const {
    searchQuery,
    isFilterVisible,
    filters,
    searchHistory,
    showClearHistoryDialog,
    page,
    isLoading,
  } = state;

  const {
    searchProductData,
    productData = [],
    error,
    subcategories,
    isSearching,
  } = useProductStore();

  // Load search history on component mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem(STORAGE_KEY);
        if (history !== null) {
          dispatch({
            type: "SET_SEARCH_HISTORY",
            payload: JSON.parse(history),
          });
        }
      } catch (error) {
        console.error("Failed to load search history:", error);
      }
    };

    loadSearchHistory();
  }, []);

  // Save search history to AsyncStorage
  const saveSearchHistory = useCallback(async (history) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }, []);

  // Update search history state and save to AsyncStorage
  const handleSearchHistoryUpdate = useCallback(
    async (newHistory) => {
      dispatch({ type: "SET_SEARCH_HISTORY", payload: newHistory });
      await saveSearchHistory(newHistory);
    },
    [saveSearchHistory]
  );

  // Clear search history
  const clearSearchHistory = useCallback(() => {
    dispatch({ type: "TOGGLE_CLEAR_HISTORY_DIALOG", payload: true });
  }, []);

  // Reset state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      dispatch({ type: "RESET_STATE" });
      // Focus the search input when the screen comes into focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Create debounced search function
  const performSearch = useCallback(
    (query) => {
      if (query) {
        dispatch({ type: "SET_LOADING", payload: true });
        searchProductData(query).finally(() =>
          dispatch({ type: "SET_LOADING", payload: false })
        );
      }
    },
    [searchProductData]
  );

  const debouncedSearch = useDebounce(performSearch, DEBOUNCE_DELAY);

  // Trigger search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Memoize derived values
  const brands = useMemo(() => {
    const uniqueBrands = [
      ...new Set(productData.map((item) => item.brand_title)),
    ].filter(Boolean);
    return uniqueBrands.length > 0 ? uniqueBrands : ["No brands available"];
  }, [productData]);

  const categoriesFromData = useMemo(() => {
    const uniqueCategories = [
      ...new Set(productData.map((item) => item.categories_id)),
    ].filter(Boolean);
    return uniqueCategories;
  }, [productData]);

  const categoryOptions = useMemo(() => {
    if (!subcategories || !categoriesFromData.length)
      return [{ id: 0, name: "No categories available" }];

    return Object.values(subcategories)
      .flat()
      .filter((subcat) => subcat && categoriesFromData.includes(subcat.id));
  }, [subcategories, categoriesFromData]);

  const priceBounds = useMemo(() => {
    if (productData.length === 0) return INITIAL_PRICE_RANGE;

    const prices = productData
      .map((item) => parseFloat(item.spu))
      .filter(
        (price) => !isNaN(price) && price !== null && price !== undefined
      );

    return prices.length > 0
      ? [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
      : INITIAL_PRICE_RANGE;
  }, [productData]);

  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];

    return productData.filter((product) => {
      // Rating filter
      if (filters.minRating > 0) {
        const rating = parseFloat(product.average_rating) || 0;
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
      if (
        isNaN(price) ||
        price < filters.priceRange[0] ||
        price > filters.priceRange[1]
      )
        return false;

      return true;
    });
  }, [productData, filters, searchQuery]);

  // Handle loading more products
  const loadMoreProducts = useCallback(() => {
    if (!isLoading && !isSearching) {
      dispatch({ type: "SET_PAGE", payload: page + 1 });
    }
  }, [page, isLoading, isSearching]);

  // Handle filter item updates
  const handleFilterItemUpdate = useCallback((filterType, value) => {
    dispatch({
      type: "UPDATE_FILTER_ITEM",
      payload: { filterType, value },
    });
  }, []);

  // Handle filter updates
  const handleUpdateFilters = useCallback((filterUpdates) => {
    dispatch({ type: "UPDATE_FILTERS", payload: filterUpdates });
  }, []);

  // Handle filter reset
  const handleResetFilters = useCallback((priceBounds) => {
    dispatch({ type: "RESET_FILTERS", payload: priceBounds });
  }, []);

  // Handle search query update
  const handleSearchQueryChange = useCallback((query) => {
    dispatch({ type: "SET_SEARCH_QUERY", payload: query });
  }, []);

  // Handle product press - update history and navigate
  const handleProductPress = useCallback(
    (productId) => {
      if (searchQuery && searchQuery.trim()) {
        // Create new history array with current query at the beginning
        const newHistory = [
          searchQuery,
          ...searchHistory.filter((q) => q !== searchQuery),
        ].slice(0, 10);

        // Update search history
        handleSearchHistoryUpdate(newHistory);
      }

      // Navigate to product detail
      router.push({
        pathname: `/screens/ProductDetail`,
        params: { id: productId },
      });
    },
    [searchQuery, searchHistory, handleSearchHistoryUpdate, router]
  );

  // Handle history item press
  const handleHistoryItemPress = useCallback(
    (query) => {
      dispatch({ type: "SET_SEARCH_QUERY", payload: query });
      // Directly call search to avoid waiting for debounce
      performSearch(query);
    },
    [performSearch]
  );

  // Memoize renderProductItem function
  const renderProductItem = useCallback(
    ({ item }) => (
      <ProductItem
        item={item}
        onProductPress={handleProductPress}
        theme={theme}
        isDarkTheme={isDarkTheme}
      />
    ),
    [handleProductPress, theme, isDarkTheme]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <StatusBar
        barStyle={isDarkTheme ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.primary}
      />

      {/* Header with Logo */}
      <View style={styles.headerContainer}>
        <Image
          source={
            !isDarkTheme
              ? require("../../assets/images/darkLogo.png")
              : require("../../assets/images/lightLogo.png")
          }
          style={styles.logo}
          accessibilityLabel="App logo"
        />
      </View>

      {/* Search Input and Filter Button */}
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
            ref={inputRef}
            accessibilityLabel="Search for products"
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.primary,
                color: theme.colors.textColor,
              },
            ]}
            placeholder="Search products..."
            placeholderTextColor={theme.colors.inactiveColor}
            value={searchQuery}
            onChangeText={handleSearchQueryChange}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => handleSearchQueryChange("")}
              accessibilityLabel="Clear search"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
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
          onPress={() =>
            dispatch({ type: "TOGGLE_FILTER_MODAL", payload: true })
          }
          accessibilityLabel="Filter products"
        >
          <Feather
            name="sliders"
            size={20}
            color={isFilterVisible ? "#FFFFFF" : theme.colors.textColor}
          />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      <ActiveFilters
        filters={filters}
        searchQuery={searchQuery}
        priceBounds={priceBounds}
        theme={theme}
        categoryOptions={categoryOptions}
        onUpdateFilters={handleUpdateFilters}
        onUpdateFilterItem={handleFilterItemUpdate}
        onResetFilters={handleResetFilters}
      />

      {/* Search Results or History */}
      <View style={{ backgroundColor: theme.colors.primary, flex: 1 }}>
        <SearchResults
          isLoading={isLoading}
          isSearching={isSearching}
          searchQuery={searchQuery}
          filteredProducts={filteredProducts}
          filters={filters}
          priceBounds={priceBounds}
          theme={theme}
          renderProductItem={renderProductItem}
          loadMoreProducts={loadMoreProducts}
          onResetFilters={handleResetFilters}
          searchHistory={searchHistory}
          clearSearchHistory={clearSearchHistory}
          onHistoryItemPress={handleHistoryItemPress}
        />
      </View>

      {/* Filter Modal */}
      <FilterModal
        isVisible={isFilterVisible}
        onClose={() =>
          dispatch({ type: "TOGGLE_FILTER_MODAL", payload: false })
        }
        filters={filters}
        onUpdateFilters={handleUpdateFilters}
        onUpdateFilterItem={handleFilterItemUpdate}
        onResetFilters={handleResetFilters}
        theme={theme}
        brands={brands}
        categoryOptions={categoryOptions}
        priceBounds={priceBounds}
      />

      {/* Clear History Dialog */}
      <AlertDialog
        visible={showClearHistoryDialog}
        title="Clear Search History"
        message="Are you sure you want to clear your search history?"
        onDismiss={() =>
          dispatch({ type: "TOGGLE_CLEAR_HISTORY_DIALOG", payload: false })
        }
        onConfirm={async () => {
          try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            dispatch({ type: "SET_SEARCH_HISTORY", payload: [] });
            dispatch({ type: "TOGGLE_CLEAR_HISTORY_DIALOG", payload: false });
          } catch (error) {
            console.error("Failed to clear search history:", error);
          }
        }}
        confirmText="Clear"
        cancelText="Cancel"
        backdropOpacity={0.4}
      />

      {/* Error State */}
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

// Optimized styles with better organization and platform-specific enhancements
const styles = StyleSheet.create({
  // Layout containers
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

  // Search input
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
    height: 50,
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

  // Active filters
  activeFiltersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    paddingTop: 12,
  },
  activeFiltersScroll: {
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
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

  // Results header
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Product list
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  productCard: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
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

  // Empty states
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

  // Filter modal
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

  // Slider
  sliderContainer: {
    marginTop: 10,
    marginLeft: 20,
  },
  sliderLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 14,
    color: "#666",
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

  // Filter actions
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

  // Error state
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
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

  // Search history
  historyContainer: {
    paddingHorizontal: 16,
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  clearHistoryButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  historyItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyItem: {
    fontSize: 16,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default memo(Search);
