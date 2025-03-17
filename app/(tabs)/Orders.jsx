import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import useProductStore from "../../components/api/useProductStore";

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

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.primary }]}
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
          <Text style={[styles.orderNumber, { color: colors.textColor }]}>
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
        </View>
      </TouchableOpacity>
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
