import React, { useState } from "react";
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
import useProductStore from "../api/useProductStore";
import useThemeStore from "../store/useThemeStore";

const CategoriesSectionList = ({ data }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 4 : 2;
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { user, fetchProfile, fetchFavProducts } = useProductStore();
  const { isDarkTheme } = useThemeStore();

  if (!data || data.length === 0) {
    return <ActivityIndicator />;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    await fetchFavProducts(user.consumer_id);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const renderSubcategoryItem = ({ item }) => (
    <View style={{ flex: 1, margin: 5 }}>
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
          style={[
            styles.product,
            {
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.textColor,
              borderRadius: 10,
            },
          ]}
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
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
          </View>
        </Pressable>
      </Link>
    </View>
  );

  const handleShowMore = (mainCategoryId) => {
    router.navigate({
      pathname: "/screens/Products",
      params: { mainCategoryId: mainCategoryId, showmore: 1 },
    });
  };

  const footerComponent = () => {
    return (
      <View style={styles.footer}>
        <Text style={[styles.listFooter, { color: theme.colors.textColor }]}>
          Footer
        </Text>
      </View>
    );
  };

  const renderCategory = ({ item }) => {
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
          nestedScrollEnabled={true}
        />
        <Pressable
          onPress={() => handleShowMore(item.main_category_id)}
          android_ripple={{ color: theme.colors.ripple }}
          style={[
            styles.showMoreButton,
            { backgroundColor: theme.colors.accent },
          ]}
        >
          <Text
            style={[styles.showMoreText, { color: theme.colors.textColor }]}
          >
            Show More
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderCategory}
      keyExtractor={(item) => item.main_category_id.toString()}
      contentContainerStyle={styles.container}
      ItemSeparatorComponent={() => (
        <View
          style={{
            borderBlockColor: theme.colors.inactiveColor,
            borderWidth: 0.5,
          }}
        />
      )}
      ListFooterComponent={footerComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};

export default CategoriesSectionList;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  categoryContainer: {
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  product: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 8,
  },
  details: {},
  name: {
    fontSize: 14,
    fontWeight: "500",
  },
  showMoreText: {
    marginHorizontal: 5,
    marginVertical: 5,
    textDecorationLine: "underline",
    color: "#4CAF50",
  },

  footer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
