import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  useWindowDimensions,
  Platform,
  InteractionManager,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import useProductStore from "../../../components/api/useProductStore";
import useThemeStore from "../../../components/store/useThemeStore";

const ProductImage = memo(({ source, isDarkTheme, style }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const placeholder = isDarkTheme
    ? require("../../../assets/images/darkImagePlaceholder.jpg")
    : require("../../../assets/images/imageSkeleton.jpg");

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

const ProductItem = memo(({ item, onPress, colors, isDarkTheme }) => {
  const handlePress = useCallback(() => {
    InteractionManager.runAfterInteractions(() => onPress(item.id));
  }, [onPress, item.id]);

  const discountPercentage = useMemo(() => {
    if (item.originalPrice && item.discountedPrice) {
      return Math.round(
        ((parseFloat(item.originalPrice) - parseFloat(item.discountedPrice)) /
          parseFloat(item.originalPrice)) *
          100
      );
    }
    return 0;
  }, [item.originalPrice, item.discountedPrice]);

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.primary }]}
        onPress={handlePress}
        activeOpacity={0.8}
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
            <View style={styles.priceContainer}>
              <Text style={[styles.productPrice, { color: colors.button }]}>
                AF {item.discountedPrice}
              </Text>
              {item.originalPrice && item.discountedPrice && (
                <>
                  <Text
                    style={[
                      styles.originalPrice,
                      { color: colors.deleteButton },
                    ]}
                  >
                    AF {item.originalPrice}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const CountdownTimer = ({ endDate, colors }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!endDate) return;

    const calculateTimeLeft = () => {
      const end = new Date(endDate);
      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (!endDate) return null;

  const hasEnded =
    timeLeft.days <= 0 &&
    timeLeft.hours <= 0 &&
    timeLeft.minutes <= 0 &&
    timeLeft.seconds <= 0;

  if (hasEnded) {
    return (
      <View style={styles.timerContainer}>
        <View
          style={[
            styles.timerSegment,
            { backgroundColor: colors.deleteButton },
          ]}
        >
          <Text style={[styles.timerValue, { color: colors.buttonText }]}>
            00
          </Text>
          <Text style={[styles.timerLabel, { color: colors.buttonText }]}>
            Days
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.timerContainer, { backgroundColor: colors.primary }]}>
      {timeLeft.days > 0 && (
        <>
          <View
            style={[
              styles.timerSegment,
              { backgroundColor: colors.deleteButton },
            ]}
          >
            <Text style={[styles.timerValue, { color: colors.buttonText }]}>
              {String(timeLeft.days).padStart(2, "0")}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.buttonText }]}>
              Days
            </Text>
          </View>
          <Text> </Text>
        </>
      )}
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
};

const AllSaleProducts = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();

  const { fetchSaleProducts } = useProductStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saleData, setSaleData] = useState({
    discountInfo: null,
    products: [],
  });

  const itemWidth = width > 550 ? width / 3 - 24 : width / 2 - 24;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchSaleProducts();
      if (response) {
        setSaleData({
          discountInfo: {
            id: response.discount_id,
            title: response.discount_title,
            value: response.discount_value,
            type: response.discount_type,
            endDate: response.discount_end_at,
          },
          products: response.products?.data || [],
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch sale products:", error);
      setLoading(false);
    }
  }, [fetchSaleProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProductPress = useCallback(
    (id) => {
      router.navigate({ pathname: "/screens/ProductDetail", params: { id } });
    },
    [router]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formattedProducts = useMemo(() => {
    return saleData.products.map((product) => ({
      id: String(product.products_id),
      name: product.title,
      price: product.spu,
      discountedPrice: product.discounted_price,
      originalPrice: product.original_price,
      image: product.product_images?.[0] || null,
    }));
  }, [saleData.products]);

  const renderItem = useCallback(
    ({ item }) => (
      <ProductItem
        item={item}
        onPress={handleProductPress}
        colors={colors}
        isDarkTheme={isDarkTheme}
      />
    ),
    [handleProductPress, colors, isDarkTheme]
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.button} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.primary }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.button]}
          tintColor={colors.button}
          progressBackgroundColor={colors.primary}
        />
      }
    >
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          {saleData.discountInfo?.value && (
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.buttonText,
                  backgroundColor: colors.deleteButton,
                },
              ]}
            >
              {saleData.discountInfo.value}% OFF
            </Text>
          )}

          <CountdownTimer
            endDate={saleData.discountInfo?.endDate}
            colors={colors}
          />
        </View>
      </View>

      <FlashList
        data={formattedProducts}
        renderItem={renderItem}
        keyExtractor={(item) => `product-${item.id}`}
        numColumns={2}
        estimatedItemSize={itemWidth + 120}
        contentContainerStyle={styles.gridContentContainer}
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        extraData={[colors, isDarkTheme]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather
              name="shopping-bag"
              size={40}
              color={colors.textColor}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyText, { color: colors.textColor }]}>
              No sale products available
            </Text>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.button }]}
              onPress={handleRefresh}
            >
              <Text
                style={[styles.refreshButtonText, { color: colors.onPrimary }]}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    padding: 5,
    borderRadius: 6,
  },

  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: 8,
  },
  timerSegment: {
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    borderRadius: 6,
    minWidth: 45,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  gridContentContainer: {
    paddingHorizontal: 8,
    paddingBottom: 15,
    paddingTop: 10,
  },
  cardWrapper: {
    flex: 1,
    margin: 6,
    paddingBottom: 10,
  },
  productCard: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    elevation: Platform.OS === "android" ? 4 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
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
  priceContainer: {
    flexWrap: "wrap",
  },
  productPrice: { fontSize: 16, fontWeight: "700" },
  originalPrice: {
    fontSize: 12,
    fontWeight: "400",
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#FF3E3E",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 6,
  },
  discountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
  },
  refreshButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default memo(AllSaleProducts);
