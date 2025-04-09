import { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import useThemeStore from "../../../components/store/useThemeStore";
import useProductStore from "../../../components/api/useProductStore";

// ProductItem component
const ProductItem = ({ item, isDarkTheme, colors }) => {
  const router = useRouter();

  const handleProductPress = () => {
    router.navigate({
      pathname: "/screens/ProductDetail",
      params: {
        idFromFavorite: item.products_id,
      },
    });
  };

  return (
    <View style={styles.itemContainer}>
      <Pressable
        style={styles.product}
        accessibilityLabel={`View product ${item.title}`}
        android_ripple={{ color: isDarkTheme ? "#444" : "#ddd" }}
        onPress={handleProductPress}
      >
        <View style={styles.imageContainer}>
          <Image
            source={
              item.product_images && item.product_images.length > 0
                ? { uri: item.product_images[0] }
                : isDarkTheme
                ? require("../../../assets/images/darkImagePlaceholder.jpg")
                : require("../../../assets/images/imageSkeleton.jpg")
            }
            style={styles.image}
            resizeMode="cover"
          />
          <View
            style={[
              styles.titleOverlay,
              {
                backgroundColor: isDarkTheme
                  ? "rgba(0, 0, 0, 0.7)"
                  : "rgba(255, 255, 255, 0.7)",
              },
            ]}
          >
            <Text
              style={[styles.name, { color: colors.textColor }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.price, { color: colors.button }]}>
              AF {item.spu}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const JustForYouScreen = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 3 : 2;
  const { isDarkTheme } = useThemeStore();
  const { fetchJustForYou } = useProductStore();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colors = theme.colors;
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: "Just For You",
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textColor,
    });
  }, [navigation]);

  const loadProducts = async (pageNum = 1, shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const response = await fetchJustForYou(pageNum);

      if (pageNum === 1 || shouldRefresh) {
        setProducts(response.data);
      } else {
        setProducts((prev) => [...prev, ...response.data]);
      }

      setPage(pageNum);
      setHasMore(response.current_page < response.total_pages);
    } catch (error) {
      console.error("Error fetching just for you products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch products on component mount
  useEffect(() => {
    loadProducts(1);
  }, [fetchJustForYou]);

  // Create a unique key extractor combining products_id and spu
  const keyExtractor = useCallback((item, index) => {
    return `justforyou-${item.products_id}-${item.spu}-${index}`;
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadProducts(page + 1);
    }
  }, [hasMore, loading, page]);

  const handleRefresh = useCallback(() => {
    loadProducts(1, true);
  }, []);

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.button} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.primary }]}
      >
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.button} />
          <Text
            style={{
              marginTop: 10,
              color: colors.textColor,
              fontWeight: "500",
            }}
          >
            Loading recommendations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.primary }]}
    >
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductItem item={item} isDarkTheme={isDarkTheme} colors={colors} />
        )}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.productsContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textColor }]}>
              No recommendations found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    padding: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  placeholder: {
    width: 40,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  productsContainer: {
    padding: 10,
    paddingBottom: 20,
  },
  itemContainer: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
  },
  product: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 16,
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  price: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "800",
  },
  footerLoader: {
    padding: 20,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default JustForYouScreen;
