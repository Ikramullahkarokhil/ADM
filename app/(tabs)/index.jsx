import React, {
  useEffect,
  useLayoutEffect,
  useReducer,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  Image,
  ScrollView,
} from "react-native";
import { useTheme, IconButton, Badge } from "react-native-paper";
import { Link, router, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useProductStore from "../../components/api/useProductStore";
import CategoriesSectionList from "../../components/ui/CategoriesList";
import CategoriesSkeleton from "../../components/skeleton/CategoriesSkeleton";
import AlertDialog from "../../components/ui/AlertDialog";
import * as NavigationBar from "expo-navigation-bar";
import NetInfo from "@react-native-community/netinfo";
import useThemeStore from "../../components/store/useThemeStore";
import NewArrivals from "../../components/ui/NewArrivals";

// 1. Create a reducer for state management
const initialState = {
  loading: false,
  refreshing: false,
  categoriesWithSubCategories: [],
  alertVisible: false,
  isConnected: true,
};

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return {
        ...state,
        loading: true,
        refreshing: true,
      };
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        refreshing: false,
        categoriesWithSubCategories: action.payload,
      };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        refreshing: false,
        categoriesWithSubCategories: [],
      };
    case "SET_CONNECTED":
      return {
        ...state,
        isConnected: action.payload,
      };
    case "SHOW_ALERT":
      return {
        ...state,
        alertVisible: true,
      };
    case "HIDE_ALERT":
      return {
        ...state,
        alertVisible: false,
      };
    default:
      return state;
  }
}

// 2. Create a memoized Header component
const Header = memo(({ theme, isDarkTheme, cartItemCount, onCartPress }) => {
  return (
    <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
      <Image
        source={
          !isDarkTheme
            ? require("../../assets/images/darkLogo.png")
            : require("../../assets/images/lightLogo.png")
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
          onPress={onCartPress}
          android_ripple={{ color: theme.colors.ripple }}
          style={styles.iconButton}
        >
          <IconButton
            icon="cart"
            size={24}
            iconColor={theme.colors.textColor}
          />
          {cartItemCount > 0 && (
            <Badge
              style={[styles.badge, { backgroundColor: theme.colors.button }]}
            >
              {cartItemCount}
            </Badge>
          )}
        </Pressable>
      </View>
    </View>
  );
});

// Main component
const Home = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isDarkTheme } = useThemeStore();
  const { user, fetchMainPageData, cartItem } = useProductStore();

  // Destructure state for readability
  const {
    loading,
    refreshing,
    categoriesWithSubCategories,
    alertVisible,
    isConnected,
  } = state;

  // Set navigation bar color
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [theme]);

  // Hide header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Fetch categories data
  const fetchCategories = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const data = await fetchMainPageData();
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      console.error("Failed to fetch data:", err);
      dispatch({ type: "FETCH_ERROR" });
    }
  }, [fetchMainPageData]);

  // Monitor internet connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnectedNow = state.isConnected;
      dispatch({ type: "SET_CONNECTED", payload: isConnectedNow });

      // If internet reconnects and we don't have data, fetch data
      if (isConnectedNow && categoriesWithSubCategories.length === 0) {
        fetchCategories();
      }
    });

    return () => unsubscribe();
  }, [fetchCategories, categoriesWithSubCategories.length]);

  // Handle cart press
  const handleCartPress = useCallback(() => {
    if (!user?.consumer_id) {
      dispatch({ type: "SHOW_ALERT" });
    } else {
      router.navigate("/screens/Cart");
    }
  }, [user, router]);

  // Handle alert dismiss
  const handleAlertDismiss = useCallback(() => {
    dispatch({ type: "HIDE_ALERT" });
  }, []);

  // Handle alert confirm
  const handleAlertConfirm = useCallback(() => {
    dispatch({ type: "HIDE_ALERT" });
    navigation.navigate("Login");
  }, [navigation]);

  // Memoize cart item count
  const cartItemCount = useMemo(() => cartItem.length, [cartItem]);

  // Optimize FlatList rendering
  const keyExtractor = useCallback(
    (item, index) => `category-${index}-${loading ? "skeleton" : "data"}`,
    [loading]
  );

  const renderItem = useCallback(
    ({ item }) =>
      loading ? (
        <CategoriesSkeleton />
      ) : (
        <CategoriesSectionList data={[item]} />
      ),
    [loading]
  );

  const getItemLayout = useCallback(
    (data, index) => ({
      length: loading ? 150 : 250, // Approximate height of each item
      offset: (loading ? 150 : 250) * index,
      index,
    }),
    [loading]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Header component */}
      <Header
        theme={theme}
        isDarkTheme={isDarkTheme}
        cartItemCount={cartItemCount}
        onCartPress={handleCartPress}
      />

      {/* Wrap everything in a ScrollView to allow scrolling through all content */}
      <ScrollView>
        {/* Categories list */}
        <FlatList
          data={
            loading
              ? Array(6).fill(null)
              : categoriesWithSubCategories.slice(0, 4)
          }
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={loading ? 2 : 1}
          key={loading ? "skeleton" : "data"}
          contentContainerStyle={
            loading ? styles.skeletonContainer : styles.dataContainer
          }
          refreshing={refreshing}
          onRefresh={fetchCategories}
          getItemLayout={getItemLayout}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          scrollEnabled={false} // Disable scrolling on FlatList since we're using ScrollView
        />

        <NewArrivals />
      </ScrollView>

      {/* Alert dialog */}
      <AlertDialog
        visible={alertVisible}
        title="Login Required"
        message="Please log in to access your cart."
        onDismiss={handleAlertDismiss}
        onConfirm={handleAlertConfirm}
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
    color: "white",
  },
  productsListContent: { marginTop: 5 },
  logo: { height: 30, width: 120 },
  skeletonContainer: {
    marginTop: 50,
    marginHorizontal: 10,
  },
  dataContainer: {},
  searchBar: {},
});

export default memo(Home);
