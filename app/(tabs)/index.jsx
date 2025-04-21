import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Image,
  ScrollView,
  RefreshControl,
  Platform,
  Text,
} from "react-native";
import { useTheme, IconButton, Badge } from "react-native-paper";
import { Link, router, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useProductStore from "../../components/api/useProductStore";
import CategoriesSection from "../../components/ui/CategoriesSection"; // Import the new component
import AlertDialog from "../../components/ui/AlertDialog";
import NetInfo from "@react-native-community/netinfo";
import useThemeStore from "../../components/store/useThemeStore";
import NewArrivals from "../../components/ui/NewArrivals";
import JustForYou from "../../components/ui/JustForYou";
import TopSellers from "../../components/ui/TopSellers";
import SaleProductsList from "../../components/ui/SaleProductsList";
import HotDealsSkeleton from "../../components/skeleton/HotDealsSkeleton";

// Pre-load images once so they aren't reloaded on each render.
const DARK_LOGO = require("../../assets/images/darkLogo.png");
const LIGHT_LOGO = require("../../assets/images/lightLogo.png");

// Cart icon wrapped in memo to prevent unnecessary re-renders.
const CartIcon = memo(({ count, onPress, color }) => (
  <Pressable onPress={onPress} style={styles.iconButton}>
    <IconButton icon="cart" size={24} iconColor={color.textColor} />
    {count > 0 && (
      <Badge style={[styles.badge, { backgroundColor: color.button }]}>
        {count}
      </Badge>
    )}
  </Pressable>
));

// Header component is also memoized and uses useMemo to compute its logo.
const Header = memo(({ theme, isDarkTheme, cartItemCount, onCartPress }) => {
  const logoSource = useMemo(
    () => (isDarkTheme ? LIGHT_LOGO : DARK_LOGO),
    [isDarkTheme]
  );

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
      <Image source={logoSource} style={styles.logo} />
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
        <CartIcon
          count={cartItemCount}
          onPress={onCartPress}
          color={theme.colors}
        />
      </View>
    </View>
  );
});

// Sale Products Section with skeleton loading
const SaleProductsSection = memo(({ data, loading }) => {
  if (!data || data.total <= 0) return;
  return <SaleProductsList data={data} load={loading} />;
});

const NewArrivalsSection = memo(({ data }) => {
  if (!data || data.total <= 0) return null;
  return <NewArrivals data={data} />;
});

const JustForYouSection = memo(({ data }) => {
  if (!data || data.total_rows <= 0) return null;
  return <JustForYou data={data} />;
});

const TopSellersSection = memo(({ data }) => {
  if (!data || data.total <= 0) return null;
  return <TopSellers data={data} />;
});

// Grouping content sections together
const ContentSections = memo(
  ({ newArrivals, justForYou, topSellers, isConnected }) => {
    if (!isConnected) return null;
    return (
      <View>
        <NewArrivalsSection data={newArrivals} />
        <JustForYouSection data={justForYou} />
        <TopSellersSection data={topSellers} />
      </View>
    );
  }
);

// Network status indicator
const NetworkStatusIndicator = memo(({ isConnected, theme }) => {
  if (isConnected) return null;

  return (
    <View
      style={[styles.networkIndicator, { backgroundColor: theme.colors.error }]}
    >
      <Text style={styles.networkIndicatorText}>
        No internet connection. Please check your network.
      </Text>
    </View>
  );
});

const Home = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [justForYou, setJustForYou] = useState({ total_rows: 0, data: [] });
  const [newArrivals, setNewArrivals] = useState({ total: 0, data: [] });
  const [topSellers, setTopSellers] = useState({ total: 0, data: [] });
  const [saleProducts, setSaleProducts] = useState({ total: 0, data: [] });
  const [alertVisible, setAlertVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const { isDarkTheme } = useThemeStore();
  const {
    user,
    fetchMainPageData,
    cartItem,
    fetchJustForYou,
    fetchNewArrivals,
    fetchTopSellers,
    fetchSaleProducts,
  } = useProductStore();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Consolidated data fetching with Promise.all to get data in parallel.
  const fetchData = useCallback(async () => {
    if (!isConnected) return;

    setLoading(true);
    setRefreshing(true);

    try {
      const [saleProductsData, categoriesData] = await Promise.all([
        fetchSaleProducts(1),
        fetchMainPageData(),
      ]);

      // Update state immediately for faster UI response
      setSaleProducts(saleProductsData || { total: 0, data: [] });
      setCategories(categoriesData || []);

      // Then fetch additional content sections concurrently
      const [newArrivalsData, justForYouData, topSellersData] =
        await Promise.all([
          fetchNewArrivals(1),
          fetchJustForYou(),
          fetchTopSellers(),
        ]);

      setNewArrivals(newArrivalsData || { total: 0, data: [] });
      setJustForYou(justForYouData || { total_rows: 0, data: [] });
      setTopSellers(topSellersData || { total: 0, data: [] });
    } catch (err) {
      console.error("Error fetching data:", err);
      // Don't clear categories if there's an error to avoid flickering
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    fetchMainPageData,
    fetchNewArrivals,
    fetchJustForYou,
    fetchTopSellers,
    fetchSaleProducts,
    isConnected,
  ]);

  // Network connectivity monitoring with debouncing.
  useEffect(() => {
    let timeoutId;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsConnected(connected);
        // Fetch data if connection is restored.
        if (connected && categories.length === 0) {
          fetchData();
        }
      }, 300);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [fetchData, categories.length]);

  // Initial data fetch when component mounts.
  useEffect(() => {
    if (categories.length === 0 && isConnected && !loading) {
      fetchData();
    }
  }, [categories.length, isConnected, fetchData, loading]);

  // Handle cart icon press: if user is not logged in, show alert.
  const handleCartPress = useCallback(() => {
    if (!user?.consumer_id) {
      setAlertVisible(true);
    } else {
      router.navigate("/screens/Cart");
    }
  }, [user]);

  // Compute cart items count to prevent unnecessary computations.
  const cartItemCount = useMemo(() => cartItem.length, [cartItem]);

  const keyExtractor = useCallback(
    (item, index) =>
      `category-${item?.id || index}-${loading ? "skeleton" : "data"}`,
    [loading]
  );

  // Memoize the RefreshControl to prevent re-renders.
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={fetchData}
        colors={[theme.colors.button]}
        tintColor={theme.colors.button}
      />
    ),
    [refreshing, fetchData, theme.colors.button]
  );

  // Memoize the AlertDialog to avoid rendering it unnecessarily.
  const alertDialog = useMemo(
    () => (
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
    ),
    [alertVisible, navigation]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Header
        theme={theme}
        isDarkTheme={isDarkTheme}
        cartItemCount={cartItemCount}
        onCartPress={handleCartPress}
      />

      <NetworkStatusIndicator isConnected={isConnected} theme={theme} />

      <ScrollView
        refreshControl={refreshControl}
        removeClippedSubviews={true}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <SaleProductsSection data={saleProducts} loading={loading} />

        {/* Using the new CategoriesSection component */}
        <CategoriesSection
          loading={loading}
          categories={categories}
          keyExtractor={keyExtractor}
        />

        <ContentSections
          newArrivals={newArrivals}
          justForYou={justForYou}
          topSellers={topSellers}
          isConnected={isConnected}
        />

        {/* Add some bottom padding for better scrolling experience */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {alertDialog}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingVertical: 4,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  saleProductsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  skeletonRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  skeletonCard: {
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
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
    color: "white",
  },
  logo: {
    height: 30,
    width: 120,
    resizeMode: "contain",
  },
  searchBar: {
    margin: 0,
  },
  sectionContainer: {
    marginBottom: 10,
  },
  networkIndicator: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  networkIndicatorText: {
    color: "white",
    fontWeight: "500",
    fontSize: 12,
  },
  bottomPadding: {
    height: 20,
  },
});

export default memo(Home);
