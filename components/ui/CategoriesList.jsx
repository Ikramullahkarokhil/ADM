import React from "react";
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

const CategoriesSectionList = ({ data }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 4 : 2;
  const router = useRouter();

  if (!data || data.length === 0) {
    return <ActivityIndicator />;
  }

  // Render subcategory item
  const renderSubcategoryItem = ({ item }) => (
    <View style={{ flex: 1, margin: 5 }}>
      <Link
        href={{
          pathname: `/screens/Products`,
          params: { id: item.categories_id },
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
              item.image
                ? { uri: item.image }
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
      params: { id: mainCategoryId },
    });
  };

  const footerComponent = () => {
    return (
      <View>
        <Text style={styles.listFooter}>Footer</Text>
      </View>
    );
  };

  const renderCategory = ({ item }) => {
    const displayedSubCategories = item.subCategories.slice(0, 4);

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
            See More
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
      ItemSeparatorComponent={() => {
        return (
          <View
            style={{
              borderBlockColor: theme.colors.inactiveColor,
              borderWidth: 0.5,
            }}
          />
        );
      }}
      ListFooterComponentStyle={footerComponent}
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
  listFooter: {},
});
