import { useState, useCallback } from "react";
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

// Remove the "In-process" tab
const statusTypes = [
  { key: "all", title: "All Orders" },
  { key: "Delivered", title: "Delivered" },
  { key: "Cancelled", title: "Canceled" },
];

const Orders = () => {
  const [index, setIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { orders, listOrders, user } = useProductStore();
  const { colors } = useTheme();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await listOrders(user.consumer_id);
    } catch (error) {
      console.error("Error refreshing orders:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user, listOrders]);

  const getFilteredOrders = () => {
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
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name="remove-shopping-cart"
        size={80}
        color={colors.subInactiveColor}
      />
      <Text style={[styles.emptyTitle, { color: colors.textColor }]}>
        No {index === 0 ? "Orders" : statusTypes[index].title}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.inactiveColor }]}>
        {index === 0
          ? "Your placed orders will appear here"
          : `Orders with ${statusTypes[
              index
            ].title.toLowerCase()} status will appear here`}
      </Text>
    </View>
  );

  const getStatusColor = (status) => {
    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
      case "in-process":
        return "#FF9800"; // Orange
      case "delivered":
        return "#4CAF50"; // Green
      case "cancelled":
      case "rejected": // Add color for rejected status (same as cancelled)
        return "#F44336"; // Red
      default:
        return colors.inactiveColor;
    }
  };

  const getTabTitleColor = (tabIndex) => {
    if (tabIndex === index) {
      // Active tab
      if (statusTypes[tabIndex].key === "Cancelled") {
        return "#F44336"; // Red for Canceled tab
      }
      return colors.button; // Default active color for other tabs
    }
    return colors.inactiveColor; // Inactive tab color
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.primary,
            borderWidth: 2,
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
              Payment Type: {item.payment_type}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="calendar-today"
              size={20}
              color={colors.inactiveColor}
            />
            <Text style={[styles.infoText, { color: colors.textColor }]}>
              Ordered On: {item.date}
            </Text>
          </View>

          {item.status !== "Cancelled" &&
            item.status !== "Rejected" &&
            item.status !== "Delivered" &&
            item.product_statuses && (
              <View style={styles.productsContainer}>
                {item.product_statuses.map((product) => (
                  <View
                    key={`${product.product_id}_${product.status}`}
                    style={styles.productRow}
                  >
                    <Text
                      style={[styles.productName, { color: colors.textColor }]}
                    >
                      {product.product_name}
                    </Text>
                    <View
                      style={[
                        styles.productStatusBadge,
                        { backgroundColor: getStatusColor(product.status) },
                      ]}
                    >
                      <Text style={styles.productStatusText}>
                        {product.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <Tab
          value={index}
          onChange={setIndex}
          indicatorStyle={{
            backgroundColor:
              statusTypes[index].key === "Cancelled"
                ? colors.deleteButton
                : colors.button,
          }}
          variant="default"
          scrollable={true}
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
        data={getFilteredOrders()}
        renderItem={renderItem}
        keyExtractor={(item) => item.consumer_orders_id.toString()}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.button]}
            tintColor={colors.button}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  tabContainer: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    margin: 10,
    borderRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  item: {
    fontSize: 18,
    fontWeight: "bold",
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
  },
  date: {
    fontSize: 14,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
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
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  productsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: 12,
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
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
