import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useTheme } from "react-native-paper";
import { Card, Badge, Divider } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog";
import useThemeStore from "../../../components/store/useThemeStore";

// Move safeJsonParse outside the component to avoid recreating it on every render.
const safeJsonParse = (jsonString, defaultValue = []) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
};

const OrderDetails = () => {
  const { orderId } = useLocalSearchParams();
  const navigation = useNavigation();
  const { colors } = useTheme();
  // Destructure the orderDetails and changeOrderStatus function from useProductStore.
  const { orderDetails, changeOrderStatus } = useProductStore();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingProductId, setCancellingProductId] = useState(null);
  const { isDarkTheme } = useThemeStore();

  // Add state for the AlertDialog
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Yes",
    cancelText: "No",
  });

  // Fetch order details with a mounted flag to avoid memory leaks.
  useEffect(() => {
    let isMounted = true;
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const data = await orderDetails(orderId);
        if (isMounted) {
          setOrderData(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load order details");
          setLoading(false);
        }
      }
    };

    fetchOrderDetails();
    return () => {
      isMounted = false;
    };
  }, [orderId, orderDetails]);

  // Memoize total calculation.
  const total = useMemo(() => {
    if (!orderData) return 0;
    return orderData.cart_products
      .filter((product) => product.status !== "5" && product.status !== "7")
      .reduce((total, product) => {
        return (
          total +
          Number.parseFloat(product.spu || 0) * Number.parseInt(product.qty, 10)
        );
      }, 0);
  }, [orderData]);

  // Function that updates the product status using changeOrderStatus.
  const handleUpdateProductStatus = useCallback(
    (productId, currentStatus) => {
      let alertTitle;
      let alertMessage;
      let confirmText = "Yes";
      let cancelText = "No";

      if (currentStatus === "2") {
        // Cancel: change status from "2" to "5".
        alertTitle = "Cancel Product";
        alertMessage = "Are you sure you want to cancel this product?";
      } else if (currentStatus === "5") {
        // Revert cancellation: change status from "5" to "2".
        alertTitle = "Revert Cancellation";
        alertMessage =
          "Are you sure you want to revert cancellation of this product?";
      } else {
        // No action needed for other statuses.
        return;
      }

      // Configure and show the AlertDialog
      setAlertConfig({
        title: alertTitle,
        message: alertMessage,
        confirmText,
        cancelText,
        onConfirm: async () => {
          try {
            // Determine the new status.
            const newStatus = currentStatus === "2" ? "5" : "2";
            if (currentStatus === "2") {
              setCancellingProductId(productId);
            }
            // Call changeOrderStatus with the required parameters.
            await changeOrderStatus({
              consumer_id: orderData.order_details.consumer_id,
              cart_item_id: productId,
              status: currentStatus,
            });
            // Update local state to reflect the new product status.
            setOrderData((prevData) => {
              const updatedProducts = prevData.cart_products.map((product) =>
                product.consumer_cart_items_id === productId
                  ? { ...product, status: newStatus }
                  : product
              );
              return { ...prevData, cart_products: updatedProducts };
            });
          } catch (error) {
            // Show error alert
            setAlertConfig({
              title: "Error",
              message:
                currentStatus === "2"
                  ? "Failed to cancel product. Please try again."
                  : "Failed to revert product cancellation. Please try again.",
              confirmText: "OK",
              onConfirm: () => setAlertVisible(false),
            });
            setAlertVisible(true);
          } finally {
            if (currentStatus === "2") {
              setCancellingProductId(null);
            }
          }
        },
      });
      setAlertVisible(true);
    },
    [changeOrderStatus, orderData]
  );

  // Function to handle cancel order
  const handleCancelOrder = useCallback(() => {
    setAlertConfig({
      title: "Cancel Order",
      message: "Are you sure you want to cancel the entire order?",
      confirmText: "Yes, Cancel",
      cancelText: "No",
      onConfirm: async () => {
        // Implement order cancellation logic here
        // This would typically involve cancelling all products
        try {
          // Example implementation - you would need to adapt this to your API
          const cancelPromises = orderData.cart_products
            .filter((product) => product.status === "2")
            .map((product) =>
              changeOrderStatus({
                consumer_id: orderData.order_details.consumer_id,
                cart_item_id: product.consumer_cart_items_id,
                status: "2", // Current status
              })
            );

          await Promise.all(cancelPromises);

          // Update all products to cancelled status
          setOrderData((prevData) => ({
            ...prevData,
            cart_products: prevData.cart_products.map((product) =>
              product.status === "2" ? { ...product, status: "5" } : product
            ),
          }));

          // Show success message
          setAlertConfig({
            title: "Success",
            message: "Order has been cancelled successfully.",
            confirmText: "OK",
            onConfirm: () => setAlertVisible(false),
          });
          setAlertVisible(true);
        } catch (error) {
          // Show error message
          setAlertConfig({
            title: "Error",
            message: "Failed to cancel order. Please try again.",
            confirmText: "OK",
            onConfirm: () => setAlertVisible(false),
          });
          setAlertVisible(true);
        }
      },
    });
    setAlertVisible(true);
  }, [orderData, changeOrderStatus]);

  // Helper function to return status text, color, and icon.
  const orderStatus = (status) => {
    let statusText = "";
    let statusColor = "";
    let statusIcon = "";

    switch (status) {
      case "1":
      case "pending":
        statusText = "Pending";
        statusColor = "#3498db";
        statusIcon = "clock-outline";
        break;
      case "2":
      case "in-process":
        statusText = "In Process";
        statusColor = "#2563eb";
        statusIcon = "progress-clock";
        break;
      case "3":
      case "on-way":
        statusText = "On Way";
        statusColor = "#1e293b";
        statusIcon = "truck-delivery";
        break;
      case "4":
      case "delivered":
        statusText = "Delivered";
        statusColor = colors.button;
        statusIcon = "check-circle";
        break;
      case "5":
      case "cancelled":
        statusText = "Cancelled";
        statusColor = colors.deleteButton;
        statusIcon = "close-circle";
        break;
      case "6":
      case "packing":
        statusText = "Packing";
        statusColor = "#f59e0b";
        statusIcon = "package-variant-closed";
        break;
      case "7":
      case "rejected":
        statusText = "Rejected";
        statusColor = colors.deleteButton;
        statusIcon = "close-circle";
        break;
      default:
        statusText = "Unknown";
        statusColor = colors.inactiveColor;
        statusIcon = "help-circle";
    }

    return { text: statusText, color: statusColor, icon: statusIcon };
  };

  // Format a date string.
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Set navigation options.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Order Details",
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textColor,
    });
  }, [navigation, colors]);

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.primary }]}
      >
        <ActivityIndicator size="large" color={colors.button} />
        <Text style={[styles.loadingText, { color: colors.textColor }]}>
          Loading order details...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={colors.deleteButton}
        />
        <Text style={[styles.errorText, { color: colors.textColor }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.button }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!orderData) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.primary }]}
      >
        <MaterialCommunityIcons
          name="file-search"
          size={48}
          color={colors.inactiveColor}
        />
        <Text style={[styles.errorText, { color: colors.textColor }]}>
          Order not found
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.button }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    text: statusText,
    color: statusColor,
    icon: statusIcon,
  } = orderStatus(orderData.order_details.status);

  // Check if all products are cancelled.
  const allProductsCancelled = orderData.cart_products.every(
    (product) => product.status === "5" || product.status === "7"
  );

  // Check if all products are in process (status "2")
  const allProductsInProcess = orderData.cart_products.every(
    (product) => product.status === "2"
  );

  // Check if all products are delivered (status "4")
  const allProductsDelivered = orderData.cart_products.every(
    (product) => product.status === "4"
  );

  // Retrieve billing address from store state.
  const billingAddress = useProductStore
    .getState()
    .consumerBillingAddress?.find(
      (address) =>
        address.consumer_billing_address_id ===
        orderData.order_details.billing_address_id
    );

  // Parse coordinates if available.
  const coordinates =
    billingAddress && billingAddress.pin_location
      ? safeJsonParse(billingAddress.pin_location, null)
      : null;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.primary }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header */}
        <Card style={[styles.card, { backgroundColor: colors.primary }]}>
          <Card.Content>
            <View style={styles.orderHeader}>
              <View>
                <Text
                  style={[
                    styles.orderNumberLabel,
                    { color: colors.inactiveColor },
                  ]}
                >
                  ORDER NUMBER
                </Text>
                <Text style={[styles.orderNumber, { color: colors.textColor }]}>
                  {orderData.order_details.order_no}
                </Text>
              </View>
            </View>
            <View style={styles.orderMeta}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={16}
                  color={colors.inactiveColor}
                />
                <Text style={[styles.metaText, { color: colors.textColor }]}>
                  {formatDate(orderData.order_details.date)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="credit-card"
                  size={16}
                  color={colors.inactiveColor}
                />
                <Text style={[styles.metaText, { color: colors.textColor }]}>
                  {orderData.order_details.payment_type.toUpperCase()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Products Section */}
        <Card style={[styles.card, { backgroundColor: colors.primary }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
              Products
            </Text>
            {orderData.cart_products.map((product, index) => {
              const variantValues = safeJsonParse(product.variant_values, []);
              const variantText = Array.isArray(variantValues)
                ? variantValues.join(", ")
                : "";
              const { text: productStatusText, color: productStatusColor } =
                orderStatus(product.status);
              return (
                <View key={product.consumer_cart_items_id}>
                  <View style={styles.productItem}>
                    <View
                      style={[
                        styles.productImageContainer,
                        {
                          borderColor: colors.subInactiveColor,
                          opacity:
                            product.status === "5" || product.status === "7"
                              ? 0.5
                              : 1,
                        },
                      ]}
                    >
                      <Image
                        source={
                          product.image
                            ? { uri: product.image_url }
                            : isDarkTheme
                            ? require("../../../assets/images/darkImagePlaceholder.jpg")
                            : require("../../../assets/images/imageSkeleton.jpg")
                        }
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                      {(product.status === "5" || product.status === "7") && (
                        <View style={styles.cancelledOverlay}>
                          <MaterialCommunityIcons
                            name="close-circle"
                            size={24}
                            color={colors.deleteButton}
                          />
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.productDetails,
                        (product.status === "5" || product.status === "7") && {
                          opacity: 0.7,
                        },
                      ]}
                    >
                      <View>
                        <View style={styles.productTitleRow}>
                          <Text
                            style={[
                              styles.productTitle,
                              { color: colors.textColor },
                            ]}
                            numberOfLines={1}
                          >
                            {product.title}
                          </Text>
                          <Badge
                            style={{
                              backgroundColor: productStatusColor,
                              color: "white",
                              paddingHorizontal: 5,
                              borderRadius: 5,
                            }}
                          >
                            {productStatusText}
                          </Badge>
                        </View>
                        {variantText && (
                          <View style={styles.variantContainer}>
                            {variantValues.map((variant, i) => (
                              <View
                                key={i}
                                style={[
                                  styles.variantChip,
                                  { backgroundColor: colors.background },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.variantText,
                                    { color: colors.inactiveColor },
                                  ]}
                                >
                                  {variant}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      <View style={styles.productBottomRow}>
                        <View style={styles.productPriceRow}>
                          <Text
                            style={[
                              styles.productPrice,
                              {
                                color:
                                  product.status === "5" ||
                                  product.status === "7"
                                    ? colors.inactiveColor
                                    : colors.button,
                              },
                            ]}
                          >
                            AF {Number.parseFloat(product.spu || 0)}
                          </Text>
                          <View
                            style={[
                              styles.quantityBadge,
                              { backgroundColor: colors.background },
                            ]}
                          >
                            <Text
                              style={[
                                styles.productQuantity,
                                { color: colors.textColor },
                              ]}
                            >
                              x{product.qty}
                            </Text>
                          </View>
                        </View>
                        {product.status === "2" && (
                          <TouchableOpacity
                            style={[
                              styles.cancelProductButton,
                              { borderColor: colors.deleteButton },
                            ]}
                            onPress={() =>
                              handleUpdateProductStatus(
                                product.consumer_cart_items_id,
                                product.status
                              )
                            }
                            disabled={
                              cancellingProductId ===
                              product.consumer_cart_items_id
                            }
                          >
                            {cancellingProductId ===
                            product.consumer_cart_items_id ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.deleteButton}
                              />
                            ) : (
                              <>
                                <MaterialCommunityIcons
                                  name="close"
                                  size={14}
                                  color={colors.deleteButton}
                                />
                                <Text
                                  style={[
                                    styles.cancelProductText,
                                    { color: colors.deleteButton },
                                  ]}
                                >
                                  Cancel
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                        {product.status === "5" && (
                          <TouchableOpacity
                            style={[
                              styles.cancelProductButton,
                              { borderColor: colors.button },
                            ]}
                            onPress={() =>
                              handleUpdateProductStatus(
                                product.consumer_cart_items_id,
                                product.status
                              )
                            }
                          >
                            <MaterialCommunityIcons
                              name="undo"
                              size={14}
                              color={colors.button}
                            />
                            <Text
                              style={[
                                styles.cancelProductText,
                                { color: colors.button },
                              ]}
                            >
                              Revert
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                  {index < orderData.cart_products.length - 1 && (
                    <Divider
                      style={[
                        styles.divider,
                        { backgroundColor: colors.subInactiveColor },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {/* Order Summary */}
        <Card style={[styles.card, { backgroundColor: colors.primary }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
              Order Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text
                style={[styles.summaryLabel, { color: colors.inactiveColor }]}
              >
                Subtotal
              </Text>
              <Text style={[styles.summaryValue, { color: colors.textColor }]}>
                AF {total}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                style={[styles.summaryLabel, { color: colors.inactiveColor }]}
              >
                Shipping
              </Text>
              <Text style={[styles.summaryValue, { color: colors.textColor }]}>
                Free
              </Text>
            </View>
            <Divider
              style={[
                styles.divider,
                { backgroundColor: colors.subInactiveColor },
              ]}
            />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textColor }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: colors.button }]}>
                AF {total}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Shipping Address */}
        <Card style={[styles.card, { backgroundColor: colors.primary }]}>
          <Card.Content>
            <View style={styles.addressHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
                Shipping Address
              </Text>
              <TouchableOpacity
                style={[styles.editButton, !coordinates && { opacity: 0.5 }]}
                onPress={() => {
                  if (coordinates) {
                    const { latitude, longitude } = coordinates;
                    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    Linking.openURL(url);
                  }
                }}
                disabled={!coordinates}
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={18}
                  color={colors.button}
                />
                <Text style={[styles.editButtonText, { color: colors.button }]}>
                  Map
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.addressBox,
                { backgroundColor: colors.background },
              ]}
            >
              {orderData.order_details.billing_address_id && billingAddress ? (
                <>
                  <Text
                    style={[styles.addressName, { color: colors.textColor }]}
                  >
                    {billingAddress.name}
                  </Text>
                  <Text
                    style={[
                      styles.addressText,
                      { color: colors.inactiveColor },
                    ]}
                  >
                    {billingAddress.address}
                  </Text>
                  <Text
                    style={[styles.addressPhone, { color: colors.textColor }]}
                  >
                    {billingAddress.phone}
                  </Text>
                </>
              ) : (
                <Text style={[styles.addressName, { color: colors.textColor }]}>
                  No billing address found
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        {!allProductsCancelled && (
          <View style={styles.actionButtons}>
            {allProductsInProcess && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.cancelButton,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.deleteButton,
                  },
                ]}
                activeOpacity={0.8}
                onPress={handleCancelOrder}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.deleteButton}
                />
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.deleteButton },
                  ]}
                >
                  Cancel Order
                </Text>
              </TouchableOpacity>
            )}
            {allProductsDelivered && (
              <View
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.button,
                    borderColor: colors.button,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color="white"
                />
                <Text style={[styles.cancelButtonText, { color: "white" }]}>
                  Order Completed
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Alert Dialog */}
      <AlertDialog
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        onDismiss={() => setAlertVisible(false)}
        onConfirm={() => {
          setAlertVisible(false);
          alertConfig.onConfirm();
        }}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        animationIn="zoomIn"
        animationOut="zoomOut"
      />
    </>
  );
};

export default OrderDetails;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontWeight: "600" },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  orderNumberLabel: { fontSize: 12, marginBottom: 4, fontWeight: "500" },
  orderNumber: { fontSize: 16, fontWeight: "700" },
  orderMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  productItem: { flexDirection: "row", marginVertical: 8 },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
    position: "relative",
  },
  cancelledOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: { width: "100%", height: "100%" },
  productDetails: { flex: 1, justifyContent: "space-between" },
  productTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  productTitle: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 8 },
  variantContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  variantChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  variantText: { fontSize: 12 },
  productBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPriceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  productPrice: { fontSize: 16, fontWeight: "700" },
  quantityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  productQuantity: { fontSize: 14, fontWeight: "500" },
  cancelProductButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  cancelProductText: { fontSize: 12, fontWeight: "600" },
  divider: { marginVertical: 12, height: 1 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "500" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 20, fontWeight: "700" },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    paddingBottom: 12,
  },
  editButtonText: { fontSize: 14, fontWeight: "600" },
  addressBox: { padding: 16, borderRadius: 12 },
  addressName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  addressText: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  addressPhone: { fontSize: 14, fontWeight: "500" },
  actionButtons: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontWeight: "600", fontSize: 14 },
});
