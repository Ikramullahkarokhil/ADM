import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import { Link, useRouter } from "expo-router";
import useThemeStore from "../store/useThemeStore";

const CategoriesSectionList = ({ data }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 4 : 2;
  const router = useRouter();
  const { isDarkTheme } = useThemeStore();

  const handleShowMore = useCallback(
    (mainCategoryId) => {
      router.push({
        pathname: "/screens/Products",
        params: { mainCategoryId, showmore: 1 },
      });
    },
    [router]
  );

  const renderSubcategoryItem = useCallback(
    ({ item }) => (
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
            android_ripple={{ color: theme.colors.ripple }}
            style={[styles.product, { backgroundColor: theme.colors.primary }]}
            accessibilityLabel={`View products in ${item.title}`}
          >
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
            <View style={styles.details}>
              <Text
                style={[styles.name, { color: theme.colors.textColor }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>
          </Pressable>
        </Link>
      </View>
    ),
    [theme, isDarkTheme]
  );

  const renderCategory = useCallback(
    ({ item }) => {
      const displayedSubCategories = item.subCategories.slice(0, 8);

      return (
        <View style={styles.categoryContainer}>
          <Text style={[styles.header, { color: theme.colors.textColor }]}>
            {item.name}
          </Text>
          <FlatList
            data={displayedSubCategories}
            renderItem={renderSubcategoryItem}
            keyExtractor={(subItem) => subItem.categories_id.toString()}
            numColumns={numColumns}
            scrollEnabled={false}
          />
          <Pressable
            onPress={() => handleShowMore(item.main_category_id)}
            style={[
              styles.showMoreButton,
              { backgroundColor: theme.colors.primary },
            ]}
            accessibilityLabel={`Show more in ${item.name}`}
          >
            <Text
              style={[styles.showMoreText, { color: theme.colors.textColor }]}
            >
              Show More
            </Text>
          </Pressable>
        </View>
      );
    },
    [renderSubcategoryItem, handleShowMore, theme]
  );

  const footerComponent = useMemo(
    () => (
      <View style={styles.footer}>
        <Text style={[styles.listFooter, { color: theme.colors.textColor }]}>
          Footer
        </Text>
      </View>
    ),
    [theme]
  );

  if (!data || data.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderCategory}
      keyExtractor={(item) => item.main_category_id.toString()}
      contentContainerStyle={styles.container}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      initialNumToRender={5}
      windowSize={5}
    />
  );
};

export default CategoriesSectionList;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContainer: {
    marginBottom: 10,
    padding: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
  },
  itemContainer: {
    flex: 1,
    margin: 5,
  },
  product: {
    overflow: "hidden",
    borderRadius: 10,
    padding: 5,
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 8,
  },
  details: {
    padding: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: "500",
  },
  showMoreButton: {
    marginTop: 10,
    padding: 10,
    alignItems: "center",
    borderRadius: 8,
    elevation: 5,
    // Removed textDecorationLine, styled as a button
  },
  showMoreText: {
    fontWeight: "bold", // Bold text for emphasis
  },
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    marginVertical: 5,
  },
  footer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  listFooter: {
    fontSize: 16,
  },
});
