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

const Home = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const { isDarkTheme } = useThemeStore();
  const { user, fetchMainPageData, cartItem } = useProductStore();

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(theme.colors.primary);
  }, [theme]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const data = await fetchMainPageData();
      setCategories(data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchMainPageData]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected;
      setIsConnected(connected);
      if (connected && categories.length === 0) {
        fetchCategories();
      }
    });

    return () => unsubscribe();
  }, [fetchCategories, categories.length]);

  const handleCartPress = useCallback(() => {
    if (!user?.consumer_id) {
      setAlertVisible(true);
    } else {
      router.navigate("/screens/Cart");
    }
  }, [user]);

  const cartItemCount = useMemo(() => cartItem.length, [cartItem]);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Header
        theme={theme}
        isDarkTheme={isDarkTheme}
        cartItemCount={cartItemCount}
        onCartPress={handleCartPress}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchCategories}
            colors={[theme.colors.button]}
          />
        }
      >
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
        />

        {isConnected && (
          <View>
            <NewArrivals />
            <JustForYou />
            <TopSellers />
          </View>
        )}
      </ScrollView>

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
    color: "white",
  },
  logo: { height: 30, width: 120 },
  skeletonContainer: {
    marginTop: 50,
    marginHorizontal: 10,
  },
  dataContainer: {},
});

export default memo(Home);
