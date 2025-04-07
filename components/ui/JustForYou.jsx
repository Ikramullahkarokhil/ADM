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
} from "react-native";
import { useTheme } from "react-native-paper";
import { Link, useRouter } from "expo-router";
import useThemeStore from "../store/useThemeStore";
import useProductStore from "../api/useProductStore";
import { Feather } from "@expo/vector-icons";

// ProductItem component
const ProductItem = ({ item, isDarkTheme, colors }) => {
  return (
    <View style={styles.itemContainer}>
      <Link
        href={{
          pathname: `/screens/ProductDetail`,
          params: {
            idFromFavorite: item.products_id,
          },
        }}
        asChild
      >
        <Pressable
          style={styles.product}
          accessibilityLabel={`View product ${item.title}`}
          android_ripple={{ color: isDarkTheme ? "#444" : "#ddd" }}
        >
          <View style={styles.imageContainer}>
            <Image
              source={
                item.product_images && item.product_images.length > 0
                  ? { uri: item.product_images[0] }
                  : isDarkTheme
                  ? require("../../assets/images/darkImagePlaceholder.jpg")
                  : require("../../assets/images/imageSkeleton.jpg")
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
      </Link>
    </View>
  );
};

const JustForYou = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width > 550 ? 3 : 2;
  const { isDarkTheme } = useThemeStore();
  const { fetchJustForYou } = useProductStore();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const colors = theme.colors;
  const router = useRouter();

  // Fetch products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const page = 1;
        setLoading(true);
        const response = await fetchJustForYou();
        setProducts(response.data);
        setHasMore(response.current_page < response.total_pages);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching just for you products:", error);
        setLoading(false);
      }
    };

    loadProducts();
  }, [fetchJustForYou]);

  // Create a unique key extractor combining products_id and spu
  const keyExtractor = useCallback((item, index) => {
    return `justforyou-${item.products_id}-${item.spu}-${index}`;
  }, []);

  const handleViewAll = useCallback(() => {
    router.navigate({
      pathname: "/screens/JustForYou",
    });
  }, [router]);

  if (loading) {
    return (
      <View
        style={[styles.loaderContainer, { backgroundColor: colors.primary }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{ marginTop: 10, color: colors.textColor, fontWeight: "500" }}
        >
          Loading recommendations...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.colors.textColor }]}>
          Just For You
        </Text>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={[styles.viewAllText, { color: theme.colors.button }]}>
            View All
          </Text>
          <Feather name="chevron-right" size={16} color={theme.colors.button} />
        </Pressable>
      </View>

      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductItem item={item} isDarkTheme={isDarkTheme} colors={colors} />
        )}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.productsContainer}
        onEndReachedThreshold={0.5}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  loaderContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  productsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    paddingBottom: 16,
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
});

export default JustForYou;
