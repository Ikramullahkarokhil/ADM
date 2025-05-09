import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import useThemeStore from "../store/useThemeStore";
import { Feather, FontAwesome5 } from "@expo/vector-icons";

// Create a reusable image component with proper placeholder handling
const ProductImage = memo(({ source, isDarkTheme, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine which placeholder to use
  const placeholderImage = isDarkTheme
    ? require("../../assets/images/darkImagePlaceholder.jpg")
    : require("../../assets/images/imageSkeleton.jpg");

  return (
    <View style={[style, styles.imageWrapper]}>
      {(isLoading || hasError) && (
        <Image
          source={placeholderImage}
          style={styles.placeholderImage}
          resizeMode="cover"
        />
      )}
      {source && source.uri && (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </View>
  );
});

const getBadgeIcon = (index) => {
  if (index === 0 || index === 1 || index === 2) {
    return {
      icon: <FontAwesome5 name="crown" size={16} color="#FFFFFF" />,
      backgroundColor: "#FFD700",
    };
  }
  return null;
};

const ViewAllCard = memo(({ onPress, colors }) => {
  return (
    <Pressable
      style={[
        styles.productCard,
        styles.viewAllCard,
        {
          backgroundColor: colors.primary,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.viewAllContent}>
        <Text style={[styles.viewAllCardText, { color: colors.button }]}>
          View All
        </Text>
        <Feather name="arrow-right" size={24} color={colors.button} />
      </View>
    </Pressable>
  );
});

const SellerItem = memo(({ item, index, onPress, isDarkTheme }) => {
  const { colors } = useTheme();
  const badgeInfo = getBadgeIcon(index);

  return (
    <Pressable style={styles.productCard} onPress={() => onPress(item)}>
      <View style={styles.imageContainer}>
        <ProductImage
          source={
            item.image || item.profile_image
              ? { uri: item.image || item.profile_image }
              : null
          }
          isDarkTheme={isDarkTheme}
          style={styles.productImage}
        />

        {/* Rank Badge */}

        {badgeInfo && (
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeInfo.backgroundColor },
            ]}
          >
            {badgeInfo.icon}
          </View>
        )}

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
          >
            {item.seller_title}
          </Text>
          <Text style={[styles.productPrice, { color: colors.textColor }]}>
            {item.business_firm_title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const TopSellers = ({ data }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();
  const { width } = useWindowDimensions();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const itemWidth = width > 550 ? width / 3 - 24 : width / 2 - 24;

  const handleSellerPress = useCallback(
    (seller) => {
      router.navigate({
        pathname: "/screens/SellerProfile",
        params: {
          sellerId: seller.accounts_id,
          sellerTitle: seller.seller_title,
        },
      });
    },
    [router]
  );

  const handleViewAllPress = useCallback(() => {
    router.navigate({
      pathname: "/screens/AllTopSellers",
    });
  }, [router]);

  useEffect(() => {
    try {
      if (data && data.data) {
        setSellers(data.data);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching top sellers:", err);
      setError("Failed to load top sellers");
    }
  }, [data]);

  const renderItem = useCallback(
    ({ item, index }) => {
      // Check if this is the last item (View All card)
      if (item === "viewAll") {
        return <ViewAllCard onPress={handleViewAllPress} colors={colors} />;
      }

      // Regular seller item
      return (
        <SellerItem
          key={`seller-${item.accounts_id}`}
          item={item}
          index={index}
          onPress={handleSellerPress}
          isDarkTheme={isDarkTheme}
        />
      );
    },
    [handleSellerPress, handleViewAllPress, isDarkTheme, colors]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textColor }]}>
          No top sellers found
        </Text>
      </View>
    ),
    [colors.textColor]
  );

  // Prepare data with View All card at the end
  const dataWithViewAll = useMemo(() => {
    if (sellers.length === 0) return [];
    return [...sellers, "viewAll"];
  }, [sellers]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContainer}>
          <View style={styles.titleContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
              Top Sellers
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.button} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerContainer}>
          <View style={styles.titleContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
              Top Sellers
            </Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.deleteButton }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadSellers()}
          >
            <Text style={[styles.retryText, { color: colors.background }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
            Top Sellers
          </Text>
        </View>
        {data.total > 5 && (
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
      <FlatList
        horizontal
        data={data.total > 5 ? dataWithViewAll : sellers}
        renderItem={renderItem}
        keyExtractor={(item) =>
          typeof item === "string" ? "view-all" : `seller-${item.accounts_id}`
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.productsList,
          sellers.length === 0 && styles.emptyList,
        ]}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={(index) => ({
          length: itemWidth + 12,
          offset: (itemWidth + 12) * index,
          index,
        })}
        ListEmptyComponent={renderEmptyComponent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIcon: {
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  productsList: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 24,
    paddingTop: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  productCard: {
    width: 160,
    height: 200,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  viewAllCard: {
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllCardText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
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
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  placeholderImage: {
    width: "100%",
    borderRadius: 16,
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
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
  productName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default TopSellers;
