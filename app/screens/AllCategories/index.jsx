"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
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

// Data transformation function
const transformSubCategories = (subCategories) => {
  return subCategories.map((sub) => ({
    categories_id: sub.categories_id || sub.id || `${Math.random()}`,
    title: sub.title || sub.name || "Unnamed Subcategory",
    category_image: sub.category_image || null,
  }));
};

// SubcategoryItem component
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
  const { mainCategoryId, MainCategorieName } = useLocalSearchParams();
  const { fetchSubcategories } = useProductStore();
  const navigation = useNavigation();

  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: MainCategorieName,
      headerTitleStyle: {
        fontWeight: "700",
      },
    });
  }, [navigation, MainCategorieName]);

  useEffect(() => {
    const loadSubCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const limit = 50;
        const data = await fetchSubcategories(mainCategoryId, limit);
        const transformedData = transformSubCategories(data);
        setSubCategories(transformedData);
      } catch (err) {
        console.error("Error loading subcategories:", err);
        setError("Failed to load subcategories");
      } finally {
        setLoading(false);
      }
    };

    if (mainCategoryId) {
      loadSubCategories();
    }
  }, [mainCategoryId, fetchSubcategories]);

  // Loading state
  if (loading) {
    return (
      <View
        style={[
          styles.loaderContainer,
          { backgroundColor: isDarkTheme ? "#121212" : "#f5f5f5" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 10,
            color: isDarkTheme ? "#fff" : "#000",
            fontWeight: "500",
          }}
        >
          Loading subcategories...
        </Text>
      </View>
    );
  }

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
          onPress={() => {
            if (mainCategoryId) {
              setLoading(true);
              fetchSubcategories(mainCategoryId, 50)
                .then((data) => {
                  setSubCategories(transformSubCategories(data));
                  setError(null);
                })
                .catch((err) => {
                  console.error("Error retrying:", err);
                  setError("Failed to load subcategories");
                })
                .finally(() => setLoading(false));
            }
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (!subCategories || subCategories.length === 0) {
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
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkTheme ? "#121212" : "#f5f5f5" },
      ]}
    >
      <FlatList
        data={subCategories}
        renderItem={({ item, index }) => (
          <SubcategoryItem
            item={item}
            index={index}
            isDarkTheme={isDarkTheme}
            theme={theme}
          />
        )}
        keyExtractor={(item) => item.categories_id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={10}
        windowSize={5}
      />
    </View>
  );
};

export default AllCategories;

// Styles
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
});
