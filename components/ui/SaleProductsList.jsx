import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
  useWindowDimensions,
  Platform,
  InteractionManager,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import useThemeStore from "../store/useThemeStore";
import { Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

// Countdown Timer component (no animations)
const CountdownTimer = memo(({ endTime }) => {
  const { colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState("");

  const calculateTimeLeft = useCallback((end) => {
    if (!end) return;
    const now = Date.now();
    const diff = new Date(end).getTime() - now;
    if (diff <= 0) {
      setTimeLeft("Ended");
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let str =
      days > 0
        ? `${days}d ${hours}h ${minutes}m`
        : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;
    setTimeLeft(str);
  }, []);

  useEffect(() => {
    if (!endTime) return;
    calculateTimeLeft(endTime);
    const id = setInterval(() => calculateTimeLeft(endTime), 60000);
    return () => clearInterval(id);
  }, [endTime, calculateTimeLeft]);

  if (!timeLeft) return null;
  return (
    <View style={[styles.timerBadge, { backgroundColor: colors.warning }]}>
      <Feather name="clock" size={10} color={colors.buttonText} />
      <Text style={[styles.timerText, { color: colors.buttonText }]}>
        {timeLeft}
      </Text>
    </View>
  );
});

// ProductImage component
const ProductImage = memo(({ source, isDarkTheme, style }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const placeholder = isDarkTheme
    ? require("../../assets/images/darkImagePlaceholder.jpg")
    : require("../../assets/images/imageSkeleton.jpg");

  return (
    <View style={[style, styles.imageWrapper]}>
      {(loading || error) && (
        <Image
          source={placeholder}
          style={styles.placeholderImage}
          resizeMode="cover"
        />
      )}
      {source?.uri && (
        <Image
          source={{ uri: source.uri, cache: "force-cache" }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
    </View>
  );
});

// ViewAllCard component
const ViewAllCard = memo(({ onPress, colors }) => {
  return (
    <View style={[styles.cardWrapper, { backgroundColor: colors.primary }]}>
      <Pressable
        style={[
          styles.productCard,
          styles.viewAllCard,
          { backgroundColor: colors.primary },
        ]}
        onPress={onPress}
        android_ripple={{ color: colors.ripple, borderless: false }}
      >
        <View style={styles.viewAllContent}>
          <Text style={[styles.viewAllCardText, { color: colors.button }]}>
            View All
          </Text>
          <Feather name="arrow-right" size={24} color={colors.button} />
        </View>
      </Pressable>
    </View>
  );
});

// ProductItem component
const ProductItem = memo(
  ({ item, onPress, colors, isDarkTheme }) => {
    const handlePress = useCallback(() => {
      InteractionManager.runAfterInteractions(() => onPress(item.id));
    }, [onPress, item.id]);

    const discountPercentage = item.discountValue
      ? `${item.discountValue}% OFF`
      : null;

    return (
      <View style={styles.cardWrapper}>
        <Pressable
          style={[styles.productCard, { backgroundColor: colors.primary }]}
          onPress={handlePress}
          android_ripple={{ color: colors.ripple, borderless: false }}
        >
          <View style={styles.imageContainer}>
            <ProductImage
              source={item.image ? { uri: item.image } : null}
              style={styles.productImage}
              isDarkTheme={isDarkTheme}
            />
            <View style={styles.badgesContainer}>
              {item.discountEndAt && (
                <CountdownTimer endTime={item.discountEndAt} />
              )}
              {discountPercentage && (
                <View
                  style={[
                    styles.discountBadge,
                    { backgroundColor: colors.deleteButton },
                  ]}
                >
                  <Text
                    style={[styles.discountText, { color: colors.buttonText }]}
                  >
                    {discountPercentage}
                  </Text>
                </View>
              )}
            </View>
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
                style={[styles.productName, { color: colors.textColor }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={[styles.productPrice, { color: colors.button }]}>
                  AF {item.discountedPrice || item.price}
                </Text>
                {item.originalPrice && item.discountedPrice && (
                  <Text
                    style={[
                      styles.originalPrice,
                      { color: colors.deleteButton },
                    ]}
                  >
                    AF {item.originalPrice}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.image === next.item.image &&
    prev.item.name === next.item.name &&
    prev.item.price === next.item.price &&
    prev.item.discountedPrice === next.item.discountedPrice &&
    prev.item.originalPrice === next.item.originalPrice &&
    prev.item.discountEndAt === next.item.discountEndAt &&
    prev.item.discountValue === next.item.discountValue &&
    prev.colors === next.colors &&
    prev.isDarkTheme === next.isDarkTheme
);

// Main List component
const SaleProductsList = ({ data }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [saleProducts, setSaleProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();

  const itemWidth = useMemo(
    () => (width > 550 ? width / 3 - 24 : width / 2 - 24),
    [width]
  );

  const handleProductPress = useCallback(
    (id) => {
      router.navigate({
        pathname: "/screens/ProductDetail",
        params: { id },
      });
    },
    [router]
  );

  const handleViewAllPress = useCallback(() => {
    router.navigate({ pathname: "/screens/AllSaleProducts" });
  }, [router]);

  useEffect(() => {
    if (!data?.data) {
      setError("No data available");
      setLoading(false);
      return;
    }
    const formatted = data.data.map((product) => ({
      id: String(product.products_id),
      name: product.title,
      price: product.original_price,
      discountedPrice: product.discounted_price,
      originalPrice: product.original_price,
      discountValue: product.value,
      discountEndAt: product.discount_end_at,
      image: product.product_images?.[0] || null,
    }));
    setSaleProducts(formatted);
    setLoading(false);
  }, [data]);

  if (loading) {
    return;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <Text
          style={[styles.sectionTitle, { color: colors.textColor, margin: 16 }]}
        >
          Hot Deals
        </Text>
        <Text
          style={[
            styles.errorText,
            { color: colors.deleteButton, textAlign: "center", margin: 16 },
          ]}
        >
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.button }]}
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
        >
          <Text style={[styles.retryText, { color: colors.buttonText }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: colors.deleteButton }]}>
          Hot Deals
        </Text>
        {data.total > 10 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAllPress}
          >
            <Text style={[styles.viewAllText, { color: colors.button }]}>
              View All
            </Text>
            <Feather name="chevron-right" size={16} color={colors.button} />
          </TouchableOpacity>
        )}
      </View>

      <FlashList
        horizontal
        data={data.total > 10 ? [...saleProducts, "viewAll"] : saleProducts}
        renderItem={({ item }) =>
          item === "viewAll" ? (
            <ViewAllCard
              onPress={handleViewAllPress}
              colors={colors}
              isDarkTheme={isDarkTheme}
            />
          ) : (
            <ProductItem
              item={item}
              onPress={handleProductPress}
              colors={colors}
              isDarkTheme={isDarkTheme}
            />
          )
        }
        key={`flashlist-${isDarkTheme ? "dark" : "light"}`}
        keyExtractor={(item, index) =>
          typeof item === "string" ? `view-all-${index}` : `product-${item.id}`
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
        estimatedItemSize={itemWidth + 12}
        removeClippedSubviews
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 22, fontWeight: "700", letterSpacing: 0.5 },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
  },
  viewAllText: { fontSize: 14, fontWeight: "600", marginRight: 4 },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 15,
    paddingTop: 10,
  },
  cardWrapper: { marginRight: 12, paddingBottom: 10 },
  productCard: {
    width: 170,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    elevation: Platform.OS === "android" ? 4 : 0,
  },
  viewAllCard: { justifyContent: "center", alignItems: "center" },
  viewAllContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewAllCardText: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    height: "100%",
  },
  imageWrapper: {
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: "100%",
  },
  productImage: { width: "100%", height: "100%", borderRadius: 16 },
  placeholderImage: { width: "100%", height: "100%", borderRadius: 16 },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  productName: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  priceContainer: { flexDirection: "row", alignItems: "center" },
  productPrice: { fontSize: 16, fontWeight: "700" },
  originalPrice: {
    fontSize: 12,
    fontWeight: "400",
    textDecorationLine: "line-through",
    marginLeft: 6,
  },
  badgesContainer: {
    position: "absolute",
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 5,
    width: "100%",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: { fontSize: 10, fontWeight: "600", marginLeft: 3 },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    position: "absolute",
    right: 5,
  },
  discountText: { fontSize: 10, fontWeight: "700" },
  errorText: { fontSize: 16, marginBottom: 16 },
  retryButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: "600" },
});

export default memo(SaleProductsList);
