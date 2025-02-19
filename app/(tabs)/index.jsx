import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View, Image } from "react-native";
import { useTheme, IconButton, Badge } from "react-native-paper";
import { Link, router, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useProductStore from "../../components/api/useProductStore";
import CategoriesSectionList from "../../components/ui/CategoriesList";
import CategoriesSkeleton from "../../components/skeleton/CategoriesSkeleton";
import AlertDialog from "../../components/ui/AlertDialog"; // import your AlertDialog

const Home = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoriesWithSubCategories, setCategoriesWithSubCategories] =
    useState([]);
  const [alertVisible, setAlertVisible] = useState(false);

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

  // Handler for the cart button press
  const handleCartPress = () => {
    if (!user?.consumer_id) {
      setAlertVisible(true);
    } else {
      router.navigate("/screens/Cart");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        {/* Show light logo in dark mode and dark logo in light mode */}
        <Image
          source={
            theme.dark
              ? require("../../assets/images/lightLogo.png")
              : require("../../assets/images/darkLogo.png")
          }
          style={styles.logo}
        />
        <View style={styles.iconsContainer}>
          <Link asChild href={{ pathname: "/Search" }}>
            <IconButton
              icon={() => (
                <Ionicons
                  name="search-outline"
                  size={24}
                  color={theme.colors.textColor}
                />
              )}
              iconColor={theme.colors.textColor}
              style={styles.searchBar}
            />
          </Link>
          <Pressable
            onPress={handleCartPress}
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

      {/* AlertDialog to prompt login when needed */}
      <AlertDialog
        visible={alertVisible}
        title="Login Required"
        message="Please log in to access your cart."
        onDismiss={() => setAlertVisible(false)}
        onConfirm={() => {
          setAlertVisible(false);
          navigation.navigate("Login"); // Navigate to login if needed
        }}
        confirmText="Login"
        cancelText="Cancel"
      />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchBar: {},
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
  logo: {
    height: 30,
    width: 120,
  },
});

export default Home;
