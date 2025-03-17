import { useState, useEffect, useLayoutEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  useWindowDimensions,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import {
  Link,
  useRouter,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import useThemeStore from "../../../components/store/useThemeStore";
import useProductStore from "../../../components/api/useProductStore";
import AllCategoriesSkeleton from "../../../components/skeleton/AllCategoriesSkeleton";

// Data transformation function (unchanged)
const transformSubCategories = (subCategories) => {
  return subCategories
    .filter((sub) => sub !== null && sub !== undefined)
    .map((sub) => ({
      categories_id: sub.categories_id || sub.id || `${Math.random()}`,
      title: sub.title || sub.name || "Unnamed Subcategory",
      category_image: sub.category_image || null,
    }));
};

// SubcategoryItem component (unchanged)
const SubcategoryItem = ({ item, index, isDarkTheme, theme }) => {
  return (
    <View style={styles.itemContainer}>
      <Link
        href={{
          pathname: `/screens/Products`,
          params: {
            subcategoryId: item.categories_id,
            subCategorieName: item.title,
          },
        }}
        asChild
      >
        <Pressable
          style={[
            styles.product,
            {
              backgroundColor: isDarkTheme
                ? "rgba(30, 30, 30, 0.8)"
                : "rgba(255, 255, 255, 0.8)",
              shadowColor: isDarkTheme ? "#000" : "#888",
            },
          ]}
          accessibilityLabel={`View products in ${item.title}`}
          android_ripple={{ color: isDarkTheme ? "#444" : "#ddd" }}
        >
          <View style={styles.imageContainer}>
            <Image
              source={
                item.category_image
                  ? { uri: item.category_image }
                  : isDarkTheme
                  ? require("../../../assets/images/darkImagePlaceholder.jpg")
                  : require("../../../assets/images/imageSkeleton.jpg")
              }
              style={styles.image}
              resizeMode="cover"
            />
            <View
              style={[
                styles.titleOverlay,
                {
                  backgroundColor: isDarkTheme
                    ? "rgba(0, 0, 0, 0.7)"
                    : "rgba(255, 255, 255, 0.7)",
                },
              ]}
            >
              <Text
                style={[styles.name, { color: isDarkTheme ? "#fff" : "#000" }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
};

const AllCategories = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 3 : 2;
  const router = useRouter();
  const { isDarkTheme } = useThemeStore();
  const { mainCategoryId, MainCategorieName, totalSubCategories } =
    useLocalSearchParams();
  const { fetchSubcategories } = useProductStore();
  const navigation = useNavigation();

  // State management
  const [subCategories, setSubCategories] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const limit = 15;
  const total = parseInt(totalSubCategories, 10) || 0; // Ensure total is a number, default to 0 if invalid

  // Header configuration
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: MainCategorieName,
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, MainCategorieName]);

  // Function to load subcategories (initial or more)
  const loadSubCategories = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setInitialLoading(true);
      setError(null);
    }
    try {
      const offset = isLoadMore ? subCategories.length : 0;
      const data = await fetchSubcategories(mainCategoryId, limit, offset);
      if (data) {
        const transformedData = transformSubCategories(data);
        if (isLoadMore) {
          setSubCategories((prev) => [...prev, ...transformedData]);
        } else {
          setSubCategories(transformedData);
        }
      } else {
        setError("No data received from the API");
      }
    } catch (err) {
      console.error("Error loading subcategories:", err);
      setError("Failed to load subcategories");
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setInitialLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    if (mainCategoryId) {
      loadSubCategories(false);
    }
  }, [mainCategoryId]);

  // Handle "Load More" button press
  const handleLoadMore = () => {
    if (!loadingMore && subCategories.length < total) {
      loadSubCategories(true);
    }
  };

  // Error state
  if (error) {
    return (
      <View
        style={[
          styles.loaderContainer,
          { backgroundColor: isDarkTheme ? "#121212" : "#f5f5f5" },
        ]}
      >
        <Text
          style={[styles.errorText, { color: isDarkTheme ? "#fff" : "#000" }]}
        >
          {error}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => loadSubCategories(false)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (!initialLoading && (!subCategories || subCategories.length === 0)) {
    return (
      <View
        style={[
          styles.loaderContainer,
          { backgroundColor: isDarkTheme ? "#121212" : "#f5f5f5" },
        ]}
      >
        <Text
          style={[styles.errorText, { color: isDarkTheme ? "#fff" : "#000" }]}
        >
          No subcategories found.
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <FlatList
        data={initialLoading ? Array(8).fill({}) : subCategories}
        renderItem={({ item, index }) =>
          initialLoading ? (
            <AllCategoriesSkeleton />
          ) : (
            <SubcategoryItem
              item={item}
              index={index}
              isDarkTheme={isDarkTheme}
              theme={theme}
            />
          )
        }
        keyExtractor={(item, index) =>
          item.categories_id
            ? item.categories_id.toString()
            : `skeleton-${index}`
        }
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={10}
        windowSize={5}
        ListFooterComponent={() => {
          if (initialLoading) return null; // Hide footer during initial load
          if (loadingMore) {
            return (
              <View style={styles.footer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            );
          }
          if (subCategories.length < total) {
            return (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.loadMoreButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={handleLoadMore}
                  disabled={loadingMore}
                >
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return null;
        }}
      />
    </View>
  );
};

export default AllCategories;

// Updated styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  itemContainer: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    overflow: "hidden",
  },
  product: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 16,
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: "center",
  },
  loadMoreText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
