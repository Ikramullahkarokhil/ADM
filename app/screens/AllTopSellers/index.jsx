"use client";

import { useEffect, useState, useCallback, memo, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import useProductStore from "../../../components/api/useProductStore";
import useThemeStore from "../../../components/store/useThemeStore";

// Create a reusable image component with proper placeholder handling
const ProductImage = memo(({ source, isDarkTheme, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine which placeholder to use
  const placeholderImage = isDarkTheme
    ? require("../../../assets/images/darkImagePlaceholder.jpg")
    : require("../../../assets/images/imageSkeleton.jpg");

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

const SellerItem = memo(({ item, index, onPress, isDarkTheme }) => {
  const { colors } = useTheme();
  const badgeInfo = getBadgeIcon(index);

  return (
    <Pressable style={styles.sellerCard} onPress={() => onPress(item)}>
      <View style={styles.imageContainer}>
        <ProductImage
          source={
            item.image || item.profile_image
              ? { uri: item.image || item.profile_image }
              : null
          }
          isDarkTheme={isDarkTheme}
          style={styles.sellerImage}
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
            style={[styles.sellerName, { color: colors.textColor }]}
            numberOfLines={1}
          >
            {item.seller_title}
          </Text>
          <Text style={[styles.businessName, { color: colors.textColor }]}>
            {item.business_firm_title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const TopSellersScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDarkTheme } = useThemeStore();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { fetchTopSellers } = useProductStore();

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Top Sellers",
    });
  }, [navigation]);

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

  const loadSellers = useCallback(
    async (isRefreshing = false) => {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchTopSellers();
        if (response && response.data) {
          setSellers(response.data);
        }
      } catch (err) {
        console.error("Error fetching top sellers:", err);
        setError("Failed to load top sellers");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchTopSellers]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSellers(true);
  }, [loadSellers]);

  useEffect(() => {
    const fetchData = async () => {
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        loadSellers();
      } else {
        setError("No internet connection");
        setLoading(false);
      }
    };
    fetchData();
  }, [loadSellers]);

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

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.button} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
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
    <View
      style={[styles.fullScreenContainer, { backgroundColor: colors.primary }]}
    >
      <View style={styles.allSellersSection}>
        <FlatList
          data={sellers}
          renderItem={({ item, index }) => (
            <SellerItem
              key={`seller-${item.accounts_id}`}
              item={item}
              index={index}
              onPress={handleSellerPress}
              isDarkTheme={isDarkTheme}
            />
          )}
          keyExtractor={(item) => `seller-${item.accounts_id}`}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridList}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyComponent}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  allSellersSection: {
    flex: 1,
    paddingTop: 8,
  },
  gridList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  sellerCard: {
    flex: 1,
    height: 210,
    margin: 8,
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    height: "100%",
  },
  imageWrapper: {
    overflow: "hidden",
    borderRadius: 16,
    height: "100%",
  },
  sellerImage: {
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
  sellerName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
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
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default TopSellersScreen;
