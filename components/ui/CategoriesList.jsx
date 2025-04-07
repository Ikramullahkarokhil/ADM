import { useState, useCallback, useMemo } from "react";
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
import { Link, useRouter } from "expo-router";
import useThemeStore from "../store/useThemeStore";
import { MaterialIcons, Feather } from "@expo/vector-icons";

// Data transformation function (no worklet needed here)
const transformData = (rawData) => {
  return rawData.map((category) => ({
    main_category_id: category.main_category.main_category_id,
    name: category.main_category.name,
    subCategories: category.sub_categories.data.map((sub) => ({
      categories_id:
        sub.categories_id ||
        sub.id ||
        `${category.main_category.main_category_id}-${Math.random()}`,
      title: sub.title || sub.name || "Unnamed Subcategory",
      category_image: sub.category_image || null,
    })),
    totalSubCategories: category.sub_categories.total,
  }));
};

// SubcategoryItem component (unchanged)
const SubcategoryItem = ({ item, index, isDarkTheme }) => {
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
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            <Image
              source={
                item.category_image
                  ? { uri: item.category_image }
                  : isDarkTheme
                  ? require("../../assets/images/darkImagePlaceholder.jpg")
                  : require("../../assets/images/imageSkeleton.jpg")
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

// CategorySection component (unchanged)
const CategorySection = ({
  item,
  index,
  isDarkTheme,
  theme,
  numColumns,
  expandedCategories,
  toggleCategoryExpansion,
  handleShowMore,
}) => {
  const isExpanded = expandedCategories[item.main_category_id] || false;
  const displaySubCategories = isExpanded
    ? item.subCategories
    : item.subCategories;

  return (
    <View style={styles.categoryContainer}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.colors.textColor }]}>
          {item.name}
        </Text>
        {item.totalSubCategories > 6 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() =>
              handleShowMore(
                item.main_category_id,
                item.name,
                item.totalSubCategories
              )
            }
            accessibilityLabel={`View all in ${item.name}`}
          >
            <Text style={[styles.viewAllText, { color: theme.colors.button }]}>
              View All
            </Text>
            <Feather
              name="chevron-right"
              size={16}
              color={theme.colors.button}
            />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displaySubCategories}
        renderItem={({ item, index }) => (
          <SubcategoryItem
            item={item}
            index={index}
            isDarkTheme={isDarkTheme}
          />
        )}
        keyExtractor={(subItem) => subItem.categories_id.toString()}
        numColumns={numColumns}
        scrollEnabled={false}
        contentContainerStyle={styles.subcategoriesContainer}
      />
    </View>
  );
};

const CategoriesSectionList = ({ data: rawData }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 3 : 2;
  const router = useRouter();
  const { isDarkTheme } = useThemeStore();
  const [expandedCategories, setExpandedCategories] = useState({});

  // Transform raw data using useMemo (no Reanimated needed)
  const data = useMemo(() => transformData(rawData), [rawData]);

  // Toggle category expansion
  const toggleCategoryExpansion = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // Handle "Show More" button click
  const handleShowMore = useCallback(
    (mainCategoryId, MainCategorieName, totalSubCategories) => {
      router.push({
        pathname: "/screens/AllCategories",
        params: { mainCategoryId, MainCategorieName, totalSubCategories },
      });
    },
    [router]
  );

  // Show loading indicator if data is not available
  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.loaderContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 10,
            color: theme.colors.textColor,
            fontWeight: "500",
          }}
        >
          Loading categories...
        </Text>
      </View>
    );
  }

  // Render the main FlatList
  return (
    <FlatList
      data={data}
      renderItem={({ item, index }) => (
        <CategorySection
          item={item}
          index={index}
          isDarkTheme={isDarkTheme}
          theme={theme}
          numColumns={numColumns}
          expandedCategories={expandedCategories}
          toggleCategoryExpansion={toggleCategoryExpansion}
          handleShowMore={handleShowMore}
        />
      )}
      keyExtractor={(item) => item.main_category_id.toString()}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.primary },
      ]}
      ItemSeparatorComponent={() => (
        <View
          style={[
            styles.separator,
            { borderBottomColor: theme.colors.subInactiveColor },
          ]}
        />
      )}
      initialNumToRender={6}
      windowSize={6}
    />
  );
};

export default CategoriesSectionList;

// Styles (unchanged)
const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  categoryContainer: {
    padding: 12,
    borderRadius: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0070f3",
    marginRight: 4,
  },
  subcategoriesContainer: {
    paddingVertical: 8,
  },
  itemContainer: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
  },
  product: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
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
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0070f3",
    marginRight: 4,
  },
  separator: {
    borderBottomWidth: 1,
    marginVertical: 8,
  },
});
