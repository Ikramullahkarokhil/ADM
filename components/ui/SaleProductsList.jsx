import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  useWindowDimensions,
  Platform,
  InteractionManager,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import useThemeStore from "../store/useThemeStore";
import { Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import HotDealsSkeleton from "../skeleton/HotDealsSkeleton";

const DealTimer = memo(({ endDate, colors }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!endDate) return;

    const updateTime = () => {
      const difference = new Date(endDate) - new Date();
      if (difference <= 0)
        return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft.days >= 99) return null;

  return (
    <View style={[styles.timerContainer, { backgroundColor: colors.primary }]}>
      <View
        style={[styles.timerSegment, { backgroundColor: colors.deleteButton }]}
      >
        <Text style={[styles.timerValue, { color: colors.buttonText }]}>
          {String(timeLeft.days).padStart(2, "0")}
        </Text>
        <Text style={[styles.timerLabel, { color: colors.buttonText }]}>
          Days
        </Text>
      </View>
      <Text> </Text>
      <View
        style={[styles.timerSegment, { backgroundColor: colors.deleteButton }]}
      >
        <Text style={[styles.timerValue, { color: colors.buttonText }]}>
          {String(timeLeft.hours).padStart(2, "0")}
        </Text>
        <Text style={[styles.timerLabel, { color: colors.buttonText }]}>
          Hours
        </Text>
      </View>
      <Text> </Text>
      <View
        style={[styles.timerSegment, { backgroundColor: colors.deleteButton }]}
      >
        <Text style={[styles.timerValue, { color: colors.buttonText }]}>
          {String(timeLeft.minutes).padStart(2, "0")}
        </Text>
        <Text style={[styles.timerLabel, { color: colors.buttonText }]}>
          Mins
        </Text>
      </View>
      <Text> </Text>
      <View
        style={[styles.timerSegment, { backgroundColor: colors.deleteButton }]}
      >
        <Text style={[styles.timerValue, { color: colors.buttonText }]}>
          {String(timeLeft.seconds).padStart(2, "0")}
        </Text>
        <Text style={[styles.timerLabel, { color: colors.buttonText }]}>
          Sec
        </Text>
      </View>
    </View>
  );
});

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

const ViewAllCard = memo(({ onPress, colors }) => (
  <View style={[styles.cardWrapper, { backgroundColor: colors.primary }]}>
    <TouchableOpacity
      style={[
        styles.productCard,
        styles.viewAllCard,
        { backgroundColor: colors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.viewAllContent}>
        <Text style={[styles.viewAllCardText, { color: colors.button }]}>
          View All
        </Text>
        <Feather name="arrow-right" size={24} color={colors.button} />
      </View>
    </TouchableOpacity>
  </View>
));

const ProductItem = memo(({ item, onPress, colors, isDarkTheme }) => {
  const handlePress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => onPress(item.id));
  }, [onPress, item.id]);

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.primary }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <ProductImage
            source={item.image ? { uri: item.image } : null}
            style={styles.productImage}
            isDarkTheme={isDarkTheme}
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
              style={[styles.productName, { color: colors.textColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <View>
              <Text style={[styles.productPrice, { color: colors.button }]}>
                AF {item.discountedPrice || item.price}
              </Text>
              {item.originalPrice && item.discountedPrice && (
                <Text
                  style={[styles.originalPrice, { color: colors.deleteButton }]}
                >
                  AF {item.originalPrice}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const SaleProductsList = ({ data, load }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [saleProducts, setSaleProducts] = useState([]);
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();

  const itemWidth = width > 550 ? width / 3 - 24 : width / 2 - 24;

  const handleProductPress = useCallback(
    (id) => {
      router.navigate({ pathname: "/screens/ProductDetail", params: { id } });
    },
    [router]
  );

  const handleViewAllPress = useCallback(() => {
    router.navigate({ pathname: "/screens/AllSaleProducts" });
  }, [router]);

  useEffect(() => {
    if (!data?.products?.data) return;

    setSaleProducts(
      data.products.data.map((product) => ({
        id: String(product.products_id),
        name: product.title,
        price: product.original_price,
        discountedPrice: product.discounted_price,
        originalPrice: product.original_price,
        image: product.product_images?.[0] || null,
      }))
    );
  }, [data]);

  const listData = useMemo(() => {
    if (!saleProducts.length) return [];
    return data?.products?.total > 10
      ? [...saleProducts, "viewAll"]
      : saleProducts;
  }, [saleProducts, data?.products?.total]);

  const renderItem = useCallback(
    ({ item }) =>
      item === "viewAll" ? (
        <ViewAllCard onPress={handleViewAllPress} colors={colors} />
      ) : (
        <ProductItem
          item={item}
          onPress={handleProductPress}
          colors={colors}
          isDarkTheme={isDarkTheme}
        />
      ),
    [handleViewAllPress, handleProductPress, colors, isDarkTheme]
  );

  if (!saleProducts || data?.products?.total < 3 || !data.products) return null;
  if (load) return <HotDealsSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            Hot Deals
          </Text>
          <Text
            style={[styles.sectionSubTitle, { color: colors.deleteButton }]}
          >
            Upto {data.discount_value}% OFF
          </Text>
        </View>
        {data.discount_end_at && (
          <DealTimer endDate={data.discount_end_at} colors={colors} />
        )}
      </View>

      <FlashList
        horizontal
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          typeof item === "string" ? `view-all-${index}` : `product-${item.id}`
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
        estimatedItemSize={itemWidth + 12}
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        extraData={[colors, load, listData]}
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
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
    width: 160,
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

  productPrice: { fontSize: 16, fontWeight: "700" },
  originalPrice: {
    fontSize: 12,
    fontWeight: "400",
    textDecorationLine: "line-through",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
  },
  timerSegment: {
    alignItems: "center",
    minWidth: 32,
    borderRadius: 4,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});

export default memo(SaleProductsList);
