import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Tab } from "@rneui/themed";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useProductStore from "../../components/api/useProductStore";
import { useTheme } from "react-native-paper";

// Status types definition
const statusTypes = [
  { key: "all", title: "All Orders" },
  { key: "Delivered", title: "Delivered" },
  { key: "Cancelled", title: "Cancelled" },
];

const Orders = () => {
  const [index, setIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { orders, listOrders, user } = useProductStore();
  const { colors } = useTheme();

  // Memoize the onRefresh callback to prevent unnecessary re-renders
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await listOrders(user?.consumer_id);
    } catch (error) {
      console.error("Error refreshing orders:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.consumer_id, listOrders]);

  // Memoize filtered orders to prevent recalculation on every render
  const filteredOrders = useMemo(() => {
    if (index === 0) return orders; // All orders
    const statusKey = statusTypes[index].key;

    // For the Cancelled tab, include both cancelled and rejected orders
    if (statusKey === "Cancelled") {
      return orders.filter(
        (order) => order.status === "Cancelled" || order.status === "Rejected"
      );
    }

    // For other tabs, filter as usual
    return orders.filter((order) => order.status === statusKey);
  }, [orders, index]);

  // Memoize the empty state component
  const EmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <MaterialIcons
          name="remove-shopping-cart"
          size={80}
          color={colors.subInactiveColor}
        />
        <Text style={[styles.emptyTitle, { color: colors.textColor }]}>
          No {index === 0 ? "Orders" : statusTypes[index].title}
        </Text>
      </View>
    ),
    [index, colors.subInactiveColor, colors.textColor, colors.inactiveColor]
  );

  // Helper function to get status color
  const getStatusColor = useCallback(
    (status) => {
      const lowerStatus = (status || "").toLowerCase();
      switch (lowerStatus) {
        case "in-process":
          return "#2563eb"; // Blue
        case "delivered":
          return colors.button;
        case "cancelled":
        case "rejected":
          return colors.deleteButton;
        default:
          return colors.inactiveColor;
      }
    },
    [colors.button, colors.deleteButton, colors.inactiveColor]
  );

  // Helper function to get tab title color
  const getTabTitleColor = useCallback(
    (tabIndex) => {
      if (tabIndex === index) {
        // Active tab
        if (statusTypes[tabIndex].key === "Cancelled") {
          return colors.deleteButton; // Red for Canceled tab
        }
        return colors.button; // Default active color for other tabs
      }
      return colors.inactiveColor; // Inactive tab color
    },
    [index, colors.deleteButton, colors.button, colors.inactiveColor]
  );

  // Memoize the item renderer for better FlatList performance
  const renderItem = useCallback(
    ({ item }) => {
      return (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.primary,
              borderWidth: 1,
              borderColor:
                item.status === "Cancelled" || item.status === "Rejected"
                  ? colors.deleteButton
                  : item.status === "Delivered"
                  ? colors.button
                  : "transparent",
            },
          ]}
          onPress={() =>
            router.navigate({
              pathname: "/screens/OrderDetails",
              params: { orderId: item.consumer_orders_id },
            })
          }
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.cardHeader,
              { borderBottomColor: colors.activeIndicatorStyle },
            ]}
          >
            <Text
              style={[
                styles.orderNumber,
                {
                  color:
                    item.status === "Cancelled" || item.status === "Rejected"
                      ? colors.deleteButton
                      : item.status === "Delivered"
                      ? colors.button
                      : colors.textColor,
                },
              ]}
            >
              Order #{item.order_no}
            </Text>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <MaterialIcons
                name="payment"
                size={20}
                color={colors.inactiveColor}
              />
              <Text style={[styles.infoText, { color: colors.textColor }]}>
                Payment Type: {item.payment_type || "N/A"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons
                name="calendar-today"
                size={20}
                color={colors.inactiveColor}
              />
              <Text style={[styles.infoText, { color: colors.textColor }]}>
                Ordered On: {item.date || "N/A"}
              </Text>
            </View>

            {item.status !== "Cancelled" &&
              item.status !== "Rejected" &&
              item.status !== "Delivered" &&
              item.product_statuses &&
              item.product_statuses.length > 0 && (
                <View style={styles.productsContainer}>
                  {item.product_statuses.map((product, index) => (
                    <View
                      // Fix for duplicate keys - use index as fallback if product_id is undefined
                      key={`${product.product_id || `item-${index}`}_${
                        product.status || "unknown"
                      }`}
                      style={styles.productRow}
                    >
                      <Text
                        style={[
                          styles.productName,
                          { color: colors.textColor },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {product.product_name || "Unknown Product"}
                      </Text>
                      <View
                        style={[
                          styles.productStatusBadge,
                          { backgroundColor: getStatusColor(product.status) },
                        ]}
                      >
                        <Text style={styles.productStatusText}>
                          {product.status || "Unknown"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
          </View>
        </TouchableOpacity>
      );
    },
    [colors, router, getStatusColor]
  );

  // Optimize keyExtractor with useCallback
  const keyExtractor = useCallback(
    (item) => item.consumer_orders_id?.toString() || Math.random().toString(),
    []
  );

  // Memoize the tab indicator style
  const tabIndicatorStyle = useMemo(
    () => ({
      backgroundColor:
        statusTypes[index].key === "Cancelled"
          ? colors.deleteButton
          : colors.button,
    }),
    [index, colors.deleteButton, colors.button]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.tabContainer}>
        <Tab
          value={index}
          onChange={setIndex}
          indicatorStyle={tabIndicatorStyle}
          variant="default"
          scrollable={true}
          style={{ backgroundColor: colors.primary }}
        >
          {statusTypes.map((status, i) => (
            <Tab.Item
              key={status.key}
              title={status.title}
              titleStyle={{
                color: getTabTitleColor(i),
              }}
            />
          ))}
        </Tab>
      </View>
      <FlatList
        data={filteredOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.button]}
            tintColor={colors.button}
          />
        }
        contentContainerStyle={styles.listContentContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: 16,
  },
  listContentContainer: {
    paddingBottom: 30,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 5,
    textAlign: "center",
  },
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: "600",
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  productsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: 12,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  productName: {
    fontSize: 14,
    flex: 1,
  },
  productStatusBadge: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  productStatusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});

export default Orders;
