import AlertDialog from "../../../components/ui/AlertDialog";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
} from "react-native";
import { Button, useTheme, Checkbox } from "react-native-paper";
import { useNavigation, useRouter } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CART_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

const Cart = () => {
  const {
    user,
    deleteFromCart,
    cartItem,
    isLoading,
    listCart,
    deleteAllFromCart,
  } = useProductStore();

  const navigation = useNavigation();
  const router = useRouter();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { isDarkTheme } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);

  const handleClearCart = async () => {
    try {
      if (!user?.consumer_id) return;

      await deleteAllFromCart(user.consumer_id);
      setSelectedIds(new Set());

      ToastAndroid.show("Cart cleared successfully", ToastAndroid.SHORT);
    } catch (error) {
      console.error("Failed to clear cart:", error);
      ToastAndroid.show("Failed to clear cart", ToastAndroid.SHORT);
    }
  };

  const parseCartItemDate = (dateString) => {
    if (!dateString) return null;

    try {
      const [datePart, timePart] = dateString.split(" ");
      if (!datePart || !timePart) return null;

      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute, second] = timePart.split(":").map(Number);

      const date = new Date(year, month - 1, day, hour, minute, second);
      return date.getTime();
    } catch (error) {
      console.error("Error parsing date:", error, dateString);
      return null;
    }
  };

  // Filter out expired items (items added more than 24 hours ago)
  const validCartItems = useMemo(() => {
    if (!cartItem || cartItem.length === 0) return [];

    const currentTime = Date.now();
    return cartItem.filter((item) => {
      const timeAdded = parseCartItemDate(item.date);
      if (!timeAdded) return true; // Keep items with no date

      return currentTime - timeAdded < CART_TIMEOUT;
    });
  }, [cartItem]);

  // Auto-remove expired items from cart
  useEffect(() => {
    const autoRemoveExpiredItems = async () => {
      if (!user?.consumer_id || !cartItem || cartItem.length === 0) return;

      const currentTime = Date.now();
      const expiredItems = cartItem.filter((item) => {
        const timeAdded = parseCartItemDate(item.date);
        if (!timeAdded) return false;
        return currentTime - timeAdded >= CART_TIMEOUT;
      });

      // Remove expired items from cart
      for (const item of expiredItems) {
        try {
          await deleteFromCart({
            productID: item.consumer_cart_items_id,
            consumerID: user.consumer_id,
          });
        } catch (error) {
          console.error("Failed to auto-remove expired item:", error);
        }
      }

      if (expiredItems.length > 0) {
        console.log(
          `Automatically removed ${expiredItems.length} expired items from cart`
        );
      }
    };

    autoRemoveExpiredItems();
  }, [cartItem, user?.consumer_id, deleteFromCart]);

  const handleRemoveFromCart = useCallback(
    async (item) => {
      try {
        await deleteFromCart({
          productID: item.consumer_cart_items_id,
          consumerID: user?.consumer_id,
        });

        ToastAndroid.show("Product removed from cart", ToastAndroid.SHORT);
      } catch (error) {
        console.error("Failed to remove item:", error);
        ToastAndroid.show("Failed to remove product", ToastAndroid.SHORT);
      }
    },
    [deleteFromCart, user?.consumer_id]
  );

  const toggleSelection = useCallback((consumerCartItemsId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(consumerCartItemsId)) next.delete(consumerCartItemsId);
      else next.add(consumerCartItemsId);
      return next;
    });
  }, []);

  // Update to use validCartItems
  const selectedItems = validCartItems.filter((item) =>
    selectedIds.has(item.consumer_cart_items_id)
  );

  const totalPrice =
    selectedItems && selectedItems.length > 0
      ? selectedItems.reduce(
          (sum, item) =>
            sum + Number(item.discount.discounted_price || item.spu || 0),
          0
        )
      : 0;

  const formatTimeRemaining = (timeAdded) => {
    if (!timeAdded) return { text: "Unknown", isExpiringSoon: false };

    const currentTime = Date.now();
    const timeElapsed = currentTime - timeAdded;
    const timeRemaining = Math.max(0, CART_TIMEOUT - timeElapsed);

    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor(
      (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
    );

    return {
      text: hours > 0 || minutes > 0 ? `${hours}h ${minutes}m` : "Expiring",
      isExpiringSoon: hours < 3,
    };
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.consumer_id) {
        await listCart(user.consumer_id);
      }
    } catch (error) {
      console.error("Error refreshing cart:", error);
    } finally {
      setRefreshing(false);
    }
  }, [listCart, user?.consumer_id]);

  const showActionSheet = (item) => {
    const options = ["Remove from cart", "Cancel"];
    const destructiveButtonIndex = 0;
    const cancelButtonIndex = 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      },
      (index) => {
        if (index === destructiveButtonIndex) {
          setAlertConfig({
            title: "Remove Item",
            message: `Are you sure you want to remove "${item.title}" from your cart?`,
            onConfirm: () => {
              handleRemoveFromCart(item);
              setAlertConfig(null);
            },
            onCancel: () => setAlertConfig(null),
            confirmText: "Remove",
            cancelText: "Cancel",
          });
        }
      }
    );
  };

  // Custom Header Component
  const CustomHeader = () => (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.colors.primary,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textColor}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.textColor }]}>
          Shopping Cart
        </Text>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            if (validCartItems.length > 0) {
              setAlertConfig({
                title: "Clear Cart",
                message:
                  "Are you sure you want to remove all items from your cart?",
                onConfirm: () => {
                  handleClearCart();
                  setAlertConfig(null);
                },
                onCancel: () => setAlertConfig(null),
                confirmText: "Clear All",
                cancelText: "Cancel",
              });
            }
          }}
          disabled={validCartItems.length === 0}
        >
          <MaterialCommunityIcons
            name="cart-remove"
            size={24}
            color={
              validCartItems.length > 0
                ? theme.colors.textColor
                : theme.colors.inactiveColor
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const timeAdded = parseCartItemDate(item.date);
    const timeInfo = formatTimeRemaining(timeAdded);
    const hasDiscount =
      item.discount && item.discount.value && item.discount.value !== "null";
    const originalPrice = parseFloat(item.spu);
    const discountedPrice = hasDiscount
      ? parseFloat(item.discount.discounted_price)
      : originalPrice;
    const discountPercentage = hasDiscount ? item.discount.value : 0;

    return (
      <View
        style={[styles.itemWrapper, { backgroundColor: theme.colors.primary }]}
      >
        <TouchableOpacity
          style={[
            styles.itemContainer,
            { backgroundColor: theme.colors.surface },
            selectedIds.has(item.consumer_cart_items_id) && styles.selectedItem,
            { borderColor: theme.colors.button },
          ]}
          onPress={() => toggleSelection(item.consumer_cart_items_id)}
          onLongPress={() => showActionSheet(item)}
          activeOpacity={0.7}
        >
          <View>
            <Image
              source={
                isDarkTheme
                  ? require("../../../assets/images/darkImagePlaceholder.jpg")
                  : require("../../../assets/images/imageSkeleton.jpg")
              }
              style={styles.itemImage}
            />

            {hasDiscount && (
              <View
                style={[
                  styles.discountBadge,
                  { backgroundColor: theme.colors.deleteButton },
                ]}
              >
                <Text style={styles.discountBadgeText}>
                  {discountPercentage}% OFF
                </Text>
              </View>
            )}
          </View>

          <View style={styles.itemDetails}>
            <Text
              style={[styles.itemName, { color: theme.colors.textColor }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            {/* Price and Discount Section */}
            <View style={styles.priceContainer}>
              {hasDiscount ? (
                <>
                  <View style={styles.priceRow}>
                    <Text
                      style={[
                        styles.discountedPrice,
                        { color: theme.colors.button },
                      ]}
                    >
                      AF {discountedPrice.toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.originalPrice,
                        { color: theme.colors.deleteButton },
                      ]}
                    >
                      AF {originalPrice}
                    </Text>
                  </View>
                </>
              ) : (
                <Text
                  style={[styles.itemPrice, { color: theme.colors.button }]}
                >
                  AF {originalPrice.toFixed(2)}
                </Text>
              )}
            </View>

            <View style={styles.timerContainer}>
              <Ionicons
                name="time-outline"
                size={14}
                color={
                  timeInfo.isExpiringSoon
                    ? theme.colors.error
                    : theme.colors.inactiveColor
                }
              />
              <Text
                style={[
                  styles.timerText,
                  {
                    color: timeInfo.isExpiringSoon
                      ? theme.colors.error
                      : theme.colors.inactiveColor,
                  },
                ]}
              >
                {timeInfo.text === "Unknown"
                  ? "Expiry: Unknown"
                  : `${timeInfo.text} left`}
              </Text>
            </View>
          </View>

          <View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                setAlertConfig({
                  title: "Remove Item",
                  message: `Are you sure you want to remove "${item.title}" from your cart?`,
                  onConfirm: () => {
                    handleRemoveFromCart(item);
                    setAlertConfig(null);
                  },
                  onCancel: () => setAlertConfig(null),
                  confirmText: "Remove",
                  cancelText: "Cancel",
                });
              }}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={22}
                color={theme.colors.deleteButton}
              />
            </TouchableOpacity>
            <Checkbox
              status={
                selectedIds.has(item.consumer_cart_items_id)
                  ? "checked"
                  : "unchecked"
              }
              onPress={() => toggleSelection(item.consumer_cart_items_id)}
              color={theme.colors.button}
              uncheckedColor={theme.colors.inactiveColor}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyCartContainer}>
      <MaterialCommunityIcons
        name="cart-outline"
        size={80}
        color={theme.colors.inactiveColor}
      />
      <Text style={[styles.emptyCartText, { color: theme.colors.textColor }]}>
        Your cart is empty
      </Text>

      <Button
        mode="contained"
        style={[styles.browseButton, { marginTop: 20 }]}
        buttonColor={theme.colors.button}
        textColor={theme.colors.primary}
        onPress={() => router.navigate("(tabs)")}
      >
        Browse Products
      </Button>
    </View>
  );

  const renderFooter = () => {
    if (selectedItems.length === 0) return null;

    return (
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.colors.primary,
            borderTopColor: theme.colors.inactiveColor,
          },
        ]}
      >
        <View style={styles.summaryContainer}>
          {selectedItems.length > 0 && (
            <View style={styles.summaryRow}>
              <Text
                style={[styles.summaryLabel, { color: theme.colors.textColor }]}
              >
                Total:
              </Text>
              <Text style={[styles.totalPrice, { color: theme.colors.button }]}>
                AF {totalPrice.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <Button
          mode="contained"
          style={styles.orderButton}
          buttonColor={theme.colors.button}
          textColor="white"
          disabled={selectedItems.length === 0}
          icon="cart-arrow-right"
          onPress={() =>
            router.navigate({
              pathname: "/screens/ProductVariantSelection",
              params: { item: JSON.stringify(selectedItems) },
            })
          }
        >
          Select and Continue
        </Button>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.primary }]}
      >
        <CustomHeader />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
            Loading your cart...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <CustomHeader />
      <FlatList
        data={validCartItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.consumer_cart_items_id}
        contentContainerStyle={[
          styles.list,
          validCartItems.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyCart}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {validCartItems.length > 0 && renderFooter()}

      {alertConfig && (
        <AlertDialog
          visible={true}
          title={alertConfig.title}
          message={alertConfig.message}
          onDismiss={alertConfig.onCancel}
          onConfirm={alertConfig.onConfirm}
          confirmText={alertConfig.confirmText}
          cancelText={alertConfig.cancelText}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerContent: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  backButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  list: {
    paddingBottom: 120,
    paddingTop: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  itemWrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
  },
  itemContainer: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  selectedItem: {
    borderWidth: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    height: 80,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: "bold",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    fontSize: 14,
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyCartContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyCartText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  browseButton: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryContainer: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 16,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "bold",
  },
  orderButton: {
    borderRadius: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },

  priceContainer: {
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  discountBadge: {
    paddingVertical: 1,
    position: "absolute",
    top: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  discountBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  discountTitle: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: "italic",
  },
});

export default Cart;
