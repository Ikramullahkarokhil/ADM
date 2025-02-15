import { FlatList, Pressable, StyleSheet, View } from "react-native";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTheme, IconButton, Badge, Button } from "react-native-paper";
import { Link, useNavigation } from "expo-router";
import useCartStore from "../../components/store/useCartStore";
import useProductStore from "../../components/api/useProductStore";
import CategoriesSectionList from "../../components/ui/CategoriesList";
import CategoriesSkeleton from "../../components/skeleton/CategoriesSkeleton";
import Fontisto from "@expo/vector-icons/Fontisto";

const Home = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [categoriesWithSubCategories, setCategoriesWithSubCategories] =
    useState([]);
  const navigation = useNavigation();

  const {
    user,
    cartItem,
    fetchFavProducts,
    fetchMainCategories,
    fetchSubcategories,
  } = useProductStore();

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const response = await fetchMainCategories();
        const categories = response?.data ?? [];

        if (categories.length > 0) {
          const categoriesData = await Promise.all(
            categories.map(async (category) => {
              const subCategoriesResponse = await fetchSubcategories(
                category.main_category_id
              );
              return {
                ...category,
                subCategories: subCategoriesResponse?.data ?? [],
              };
            })
          );
          setCategoriesWithSubCategories(categoriesData);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
        if (user?.consumer_id) {
          fetchFavProducts(user.consumer_id);
        }
      }
    };
    initialize();
  }, [
    fetchMainCategories,
    fetchSubcategories,
    fetchFavProducts,
    user?.consumer_id,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const groupedCartItems = useMemo(() => {
    return cartItem.reduce((acc, item) => {
      const existingItem = acc.find((i) => i.products_id === item.products_id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        acc.push({ ...item, quantity: 1 });
      }
      return acc;
    }, []);
  }, [cartItem]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.searchContainer}>
          <Link asChild href={{ pathname: "/Search" }}>
            <Button
              icon="magnify"
              mode="contained"
              buttonColor={theme.colors.background}
              style={styles.searchBar}
              textColor={theme.colors.textColor}
            >
              Search Products...
            </Button>
          </Link>
          <View style={styles.iconsContainer}>
            <Link href={{ pathname: "/screens/Cart" }} asChild>
              <Pressable
                android_ripple={{ color: theme.colors.ripple }}
                style={styles.iconButton}
              >
                <IconButton
                  icon="cart"
                  size={24}
                  iconColor={theme.colors.textColor}
                />
                {groupedCartItems.length > 0 && (
                  <Badge style={styles.badge}>{groupedCartItems.length}</Badge>
                )}
              </Pressable>
            </Link>
            <Link href={{ pathname: "/screens/Favorite" }} asChild>
              <IconButton
                icon={() => (
                  <Fontisto
                    name="favorite"
                    size={24}
                    color={theme.colors.textColor}
                  />
                )}
                size={24}
                iconColor={theme.colors.textColor}
              />
            </Link>
          </View>
        </View>
      </View>

      <View style={styles.productsList}>
        {loading ? (
          <FlatList
            data={Array(6).fill(null)}
            renderItem={CategoriesSkeleton}
            keyExtractor={(_, index) => index.toString()}
            numColumns={2}
            contentContainerStyle={styles.productsListContent}
          />
        ) : (
          <CategoriesSectionList data={categoriesWithSubCategories} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingVertical: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchBar: {
    flex: 1,
    borderRadius: 40,
  },
  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 5,
    left: 25,
    backgroundColor: "red",
    color: "white",
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    marginTop: 40,
  },
});

export default Home;
