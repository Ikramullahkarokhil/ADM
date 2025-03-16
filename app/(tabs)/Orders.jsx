import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import useProductStore from "../../components/api/useProductStore";

const getOrderStatus = (status) => {
  // Ensure status is a string and provide a default if undefined
  const statusStr =
    typeof status === "string" ? status.toLowerCase() : "unknown";
  return statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
};

const Orders = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const { colors } = useTheme();
  const { orders } = useProductStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Your Orders",
      headerStyle: {
        backgroundColor: colors.primary,
      },
      headerTintColor: colors.textColor,
    });
  }, [navigation, colors]);

  const handleCancel = (orderId) => {
    console.log("Canceling order:", orderId);
  };

  const getStatusColor = (status) => {
    // Ensure status is a string and handle undefined/null cases
    const statusStr =
      typeof status === "string" ? status.toLowerCase() : "unknown";
    switch (statusStr) {
      case "pending":
        return colors.progressColor; // Blue
      case "in-process":
        return colors.primary; // Primary color
      case "on-way":
        return colors.inactiveColor; // Dark
      case "delivered":
        return colors.button; // Green
      case "cancelled":
      case "rejected":
        return colors.deleteButton; // Red
      case "packing":
        return "#FFA500"; // Orange
      default:
        return colors.textColor; // Fallback
    }
  };

  const renderItem = ({ item }) => {
    const statusText = getOrderStatus(item.status);
    const statusColor = getStatusColor(item.status);

    return (
      <Pressable style={[styles.card, { backgroundColor: colors.primary }]}>
        <View
          style={[
            styles.cardHeader,
            { borderBottomColor: colors.activeIndicatorStyle },
          ]}
        >
          <Text style={[styles.orderNumber, { color: colors.textColor }]}>
            Order #{item.order_no}
          </Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {statusText}
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
              Payment type: {item.payment_type}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="calendar-today"
              size={20}
              color={colors.inactiveColor}
            />
            <Text style={[styles.infoText, { color: colors.textColor }]}>
              Ordered on: {item.date}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.detailButton, { backgroundColor: colors.button }]}
            onPress={() =>
              router.navigate({
                pathname: "/screens/OrderDetails",
                params: { orderId: item.consumer_orders_id },
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.detailButtonText}>View Details</Text>
          </TouchableOpacity>
          {statusText === "Pending" && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: colors.deleteButton },
              ]}
              onPress={() => handleCancel(item.consumer_orders_id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.deleteButton },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.consumer_orders_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="remove-shopping-cart"
            size={80}
            color={colors.subInactiveColor}
          />
          <Text style={[styles.emptyTitle, { color: colors.textColor }]}>
            No Orders Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.inactiveColor }]}>
            Your placed orders will appear here
          </Text>
        </View>
      )}
    </View>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
  },
  cardFooter: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  detailButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    elevation: 2,
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.8,
  },
});
