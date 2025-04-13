import React, {
  useState,
  useEffect,
  useLayoutEffect,
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
  RefreshControl,
  Platform,
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
import JustForYou from "../../components/ui/JustForYou";
import TopSellers from "../../components/ui/TopSellers";

// Pre-load images to prevent loading delays
const DARK_LOGO = require("../../assets/images/darkLogo.png");
const LIGHT_LOGO = require("../../assets/images/lightLogo.png");

// Cart icon as a separate component to prevent re-renders
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

const Header = memo(({ theme, isDarkTheme, cartItemCount, onCartPress }) => {
  const logoSource = useMemo(
    () => (!isDarkTheme ? DARK_LOGO : LIGHT_LOGO),
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

// Optimize each content section component
const NewArrivalsSection = memo(({ data }) => {
  if (!data || data.total <= 10) return null;
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

// Separate the content sections to allow for better performance optimization
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

// Optimize category item rendering
const CategoryItem = memo(({ item, loading }) => {
  if (loading) return <CategoriesSkeleton />;
  return <CategoriesSectionList data={[item]} />;
});

// Separate the categories section for better performance
const CategoriesSection = memo(({ loading, categories, keyExtractor }) => {
  const renderItem = useCallback(
    ({ item }) => <CategoryItem item={item} loading={loading} />,
    [loading]
  );

  return (
    <FlatList
      data={loading ? Array(6).fill(null) : categories}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={loading ? 2 : 1}
      key={loading ? "skeleton" : "data"}
      contentContainerStyle={
        loading ? styles.skeletonContainer : styles.dataContainer
      }
      scrollEnabled={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={3}
      windowSize={3}
      initialNumToRender={2}
      updateCellsBatchingPeriod={50}
      getItemLayout={(data, index) => ({
        length: loading ? 150 : 200,
        offset: (loading ? 150 : 200) * index,
        index,
      })}
    />
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
  } = useProductStore();

  // Set navigation bar color only when theme changes
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(theme.colors.primary);
    }
  }, [theme.colors.primary]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Optimize data fetching with Promise.all for parallel requests
  const fetchData = useCallback(async () => {
    if (!isConnected) return;

    setLoading(true);
    setRefreshing(true);

    try {
      // Fetch categories first as it's critical
      const categoriesData = await fetchMainPageData();
      setCategories(categoriesData);

      // Fetch other data in parallel
      Promise.all([fetchNewArrivals(1), fetchJustForYou(), fetchTopSellers()])
        .then(([newArrivalsData, justForYouData, topSellersData]) => {
          setNewArrivals(newArrivalsData || { total: 0, data: [] });
          setJustForYou(justForYouData || { total_rows: 0, data: [] });
          setTopSellers(topSellersData || { total: 0, data: [] });
        })
        .catch((err) => {
          console.error("Error fetching content sections:", err);
        });
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    fetchMainPageData,
    fetchNewArrivals,
    fetchJustForYou,
    fetchTopSellers,
    isConnected,
  ]);

  // Network connectivity monitoring with debounce
  useEffect(() => {
    let timeoutId;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected;

      // Debounce connectivity changes to prevent rapid toggling
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsConnected(connected);
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

  // Initial data fetch
  useEffect(() => {
    if (categories.length === 0 && isConnected && !loading) {
      fetchData();
    }
  }, [categories.length, isConnected, fetchData, loading]);

  const handleCartPress = useCallback(() => {
    if (!user?.consumer_id) {
      setAlertVisible(true);
    } else {
      router.navigate("/screens/Cart");
    }
  }, [user]);

  const cartItemCount = useMemo(() => cartItem.length, [cartItem]);

  const keyExtractor = useCallback(
    (item, index) =>
      `category-${item?.id || index}-${loading ? "skeleton" : "data"}`,
    [loading]
  );

  // Memoize the refresh control to prevent unnecessary re-renders
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

  // Memoize the alert dialog to prevent unnecessary re-renders
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

      <ScrollView
        refreshControl={refreshControl}
        removeClippedSubviews={true}
        contentInsetAdjustmentBehavior="automatic"
      >
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
      </ScrollView>

      {alertDialog}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
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
  logo: { height: 30, width: 120, resizeMode: "contain" },
  skeletonContainer: {
    marginTop: 50,
    marginHorizontal: 10,
  },
  dataContainer: {},
  searchBar: {
    margin: 0,
  },
  sectionContainer: {
    marginBottom: 10,
  },
});

export default memo(Home);
