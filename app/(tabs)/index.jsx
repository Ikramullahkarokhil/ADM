import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { FlatList, Pressable, StyleSheet, View, Image } from "react-native";
import { useTheme, IconButton, Badge } from "react-native-paper";
import { Link, router, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useProductStore from "../../components/api/useProductStore";
import CategoriesSectionList from "../../components/ui/CategoriesList";
import CategoriesSkeleton from "../../components/skeleton/CategoriesSkeleton";
import AlertDialog from "../../components/ui/AlertDialog";
import * as NavigationBar from "expo-navigation-bar";
import NetInfo from "@react-native-community/netinfo";

const Home = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoriesWithSubCategories, setCategoriesWithSubCategories] =
    useState([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const {
    user,
    cartItem,
    fetchFavProducts,
    fetchMainCategories,
    fetchSubcategories,
  } = useProductStore();

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [theme]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const categories = await fetchMainCategories();
      if (categories.length > 0) {
        const categoriesData = await Promise.all(
          categories.map(async (category) => {
            const subCategoriesResponse = await fetchSubcategories(
              category.main_category_id
            );
            return {
              ...category,
              subCategories: subCategoriesResponse,
            };
          })
        );
        setCategoriesWithSubCategories(categoriesData);
      } else {
        setCategoriesWithSubCategories([]);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setCategoriesWithSubCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (user?.consumer_id) {
        // fetchFavProducts(user.consumer_id);
      }
    }
  }, [
    fetchMainCategories,
    fetchSubcategories,
    // fetchFavProducts,
    user?.consumer_id,
  ]);

  // Monitor internet connectivity within Home
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);

      // If internet reconnects, fetch data
      if (state.isConnected) {
        fetchCategories();
      }
    });

    // Initial connectivity check
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        fetchCategories();
      }
    });

    return () => unsubscribe();
  }, [fetchCategories]);

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

      <FlatList
        data={loading ? Array(6).fill(null) : categoriesWithSubCategories}
        renderItem={({ item }) =>
          loading ? (
            <CategoriesSkeleton />
          ) : (
            <CategoriesSectionList data={[item]} />
          )
        }
        keyExtractor={(item, index) => index.toString()}
        numColumns={loading ? 2 : 1}
        key={loading ? "skeleton" : "data"}
        contentContainerStyle={
          loading ? styles.skeletonContainer : styles.dataContainer
        }
        refreshing={refreshing}
        onRefresh={fetchCategories}
      />

      <AlertDialog
        visible={alertVisible}
        title="Login Required"
        message="Please log in to access your cart."
        onDismiss={() => setAlertVisible(false)}
        onConfirm={() => {
          setAlertVisible(false);
          navigation.navigate("Login");
        }}
        confirmText="Login"
        cancelText="Cancel"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingVertical: 4,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconsContainer: { flexDirection: "row", alignItems: "center" },
  iconButton: { position: "relative" },
  badge: {
    position: "absolute",
    top: 5,
    left: 25,
    backgroundColor: "red",
    color: "white",
  },
  productsListContent: { marginTop: 5 },
  logo: { height: 30, width: 120 },
  skeletonContainer: {
    marginTop: 50,
    marginHorizontal: 10,
  },
  dataContainer: {},
});

export default Home;
