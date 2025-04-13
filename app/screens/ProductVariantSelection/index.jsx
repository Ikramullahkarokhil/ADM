import {
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import {
  Button,
  useTheme,
  Divider,
  Chip,
  Surface,
  RadioButton,
} from "react-native-paper";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { MaterialCommunityIcons, Feather, Entypo } from "@expo/vector-icons";
import useThemeStore from "../../../components/store/useThemeStore";
import AlertDialog from "../../../components/ui/AlertDialog";

const ProductVariantSelection = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useTheme();
  const { isDarkTheme } = useThemeStore();
  const { item } = useLocalSearchParams();
  const { user, consumerBillingAddress, proceedOrder, listCart } =
    useProductStore();

  const [selectedItems, setSelectedItems] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [expandedItem, setExpandedItem] = useState(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState(null);
  const [expandedAddressId, setExpandedAddressId] = useState(null);

  // Alert dialog state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertConfirmAction, setAlertConfirmAction] = useState(() => () => {});

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Customize Order",
    });
  }, [navigation]);

  useEffect(() => {
    try {
      const parsedItems = JSON.parse(item);
      setSelectedItems(parsedItems);

      setSelections(
        parsedItems.map((item) => ({
          id: item.consumer_cart_items_id,
          selectedVariants: {},
          quantity: Number.parseInt(item.qty) || 1,
        }))
      );

      if (parsedItems.length > 0) {
        setExpandedItem(parsedItems[0].consumer_cart_items_id);
      }

      setIsLoading(false);

      // Auto-select default billing address (status = 1)
      if (consumerBillingAddress && consumerBillingAddress.length > 0) {
        const defaultAddress = consumerBillingAddress.find(
          (addr) => addr.status === 1
        );
        if (defaultAddress) {
          setSelectedBillingAddress(defaultAddress);
        } else {
          // If no address with status 1, select the first one
          setSelectedBillingAddress(consumerBillingAddress[0]);
        }
      }
    } catch (error) {
      console.error("Error parsing items:", error);
      showAlert(
        "Error",
        "There was a problem loading your selected items. Please try again.",
        () => router.back()
      );
    }
  }, [item, router, consumerBillingAddress]);

  useEffect(() => {
    if (selectedItems.length > 0 && selections.length > 0) {
      const total = selectedItems.reduce((sum, item) => {
        const selection = selections.find(
          (sel) => sel.id === item.consumer_cart_items_id
        );
        if (selection) {
          return sum + Number.parseFloat(item.spu) * selection.quantity;
        }
        return sum;
      }, 0);
      setTotalPrice(total);
    }
  }, [selectedItems, selections]);

  // Helper function to show alerts
  const showAlert = (title, message, confirmAction = () => {}) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertConfirmAction(() => confirmAction);
    setAlertVisible(true);
  };

  const handleVariantSelect = useCallback((itemId, variantTitle, value) => {
    setSelections((prev) =>
      prev.map((sel) =>
        sel.id === itemId
          ? {
              ...sel,
              selectedVariants: {
                ...sel.selectedVariants,
                [variantTitle]: value,
              },
            }
          : sel
      )
    );
  }, []);

  const handleQuantityChange = useCallback((itemId, delta) => {
    setSelections((prev) =>
      prev.map((sel) =>
        sel.id === itemId
          ? { ...sel, quantity: Math.max(1, sel.quantity + delta) }
          : sel
      )
    );
  }, []);

  const toggleExpandItem = useCallback((itemId) => {
    setExpandedItem((prevExpandedItem) =>
      prevExpandedItem === itemId ? null : itemId
    );
  }, []);

  const isItemComplete = useCallback(
    (itemId) => {
      const currentItem = selectedItems.find(
        (i) => i.consumer_cart_items_id === itemId
      );
      const selection = selections.find((sel) => sel.id === itemId);

      if (!currentItem || !selection) return false;

      if (!currentItem.variants || currentItem.variants.length === 0)
        return true;

      if (
        currentItem.variants.length === 1 &&
        (currentItem.variants[0].variants_id === null ||
          currentItem.variants[0].variant_values === null ||
          currentItem.variants[0].variant_title === null)
      ) {
        return true;
      }

      return (
        currentItem.variants.length ===
        Object.keys(selection.selectedVariants).length
      );
    },
    [selectedItems, selections]
  );

  const getCompletionPercentage = useCallback(
    (itemId) => {
      const currentItem = selectedItems.find(
        (i) => i.consumer_cart_items_id === itemId
      );
      const selection = selections.find((sel) => sel.id === itemId);

      if (!currentItem || !selection) return 0;

      if (!currentItem.variants || currentItem.variants.length === 0)
        return 100;

      if (
        currentItem.variants.length === 1 &&
        (currentItem.variants[0].variants_id === null ||
          currentItem.variants[0].variant_values === null ||
          currentItem.variants[0].variant_title === null)
      ) {
        return 100;
      }

      const totalVariants = currentItem.variants.length;
      const selectedVariants = Object.keys(selection.selectedVariants).length;

      return (selectedVariants / totalVariants) * 100;
    },
    [selectedItems, selections]
  );

  const checkBillingAddresses = () => {
    if (!consumerBillingAddress || consumerBillingAddress.length === 0) {
      showAlert(
        "Billing Address Required",
        "You need to add a billing address before placing an order.",
        () => router.push("/screens/BillingAddress")
      );
      return false;
    } else {
      // If no address is selected yet, try to select the default one (status = 1)
      if (!selectedBillingAddress) {
        const defaultAddress = consumerBillingAddress.find(
          (addr) => addr.status === 1
        );
        if (defaultAddress) {
          setSelectedBillingAddress(defaultAddress);
        } else {
          // If no default address, select the first one
          setSelectedBillingAddress(consumerBillingAddress[0]);
        }
      }
      return true;
    }
  };

  const handleConfirm = async () => {
    const incompleteItems = selections.filter((sel) => {
      const currentItem = selectedItems.find(
        (i) => i.consumer_cart_items_id === sel.id
      );

      if (!currentItem.variants || currentItem.variants.length === 0)
        return false;

      if (
        currentItem.variants.length === 1 &&
        (currentItem.variants[0].variants_id === null ||
          currentItem.variants[0].variant_values === null ||
          currentItem.variants[0].variant_title === null)
      ) {
        return false;
      }

      return (
        currentItem.variants.length !== Object.keys(sel.selectedVariants).length
      );
    });

    if (incompleteItems.length > 0) {
      showAlert(
        "Incomplete Selection",
        "Please select all variants for each item before placing your order."
      );
      return;
    }

    if (!checkBillingAddresses()) {
      return;
    }

    if (selectedBillingAddress) {
      processOrder();
    }
  };

  const processOrder = async () => {
    setIsSubmitting(true);
    try {
      // Format items for the API
      const formattedItems = selections.map((sel) => {
        const currentItem = selectedItems.find(
          (i) => i.consumer_cart_items_id === sel.id
        );

        // Check if item has valid variants
        const hasRealVariants =
          currentItem.variants &&
          currentItem.variants.length > 0 &&
          !(
            currentItem.variants.length === 1 &&
            (currentItem.variants[0].variants_id === null ||
              currentItem.variants[0].variant_values === null ||
              currentItem.variants[0].variant_title === null)
          );

        // Format variants for API
        const formattedVariants = hasRealVariants
          ? Object.entries(sel.selectedVariants).map(([title, value]) => {
              // Find the variant_id that matches this title
              const variantObj = currentItem.variants.find(
                (v) => v.variant_title === title
              );
              return {
                variant_id: variantObj?.variants_id,
                variant_value: value,
              };
            })
          : [];

        return {
          product_id: currentItem.products_id || currentItem.id,
          qty: sel.quantity,
          variants: formattedVariants,
        };
      });
      // Create the order payload
      const orderPayload = {
        items: formattedItems,
        payment_type: "cash",
        consumer_id: user.consumer_id,
        billing_address_id: selectedBillingAddress.consumer_billing_address_id,
      };

      // Process the order using the API
      const response = await proceedOrder(orderPayload);
      await listCart(user.consumer_id);

      showAlert(
        "Order Placed Successfully",
        `Your order no is ${response.order_no}`,
        () => router.replace("/Orders")
      );
    } catch (error) {
      console.error("Failed to place order:", error);
      showAlert(
        "Order Failed",
        "An error occurred while placing your order. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimized to handle address selection without closing modal
  const handleAddressSelection = (addressId) => {
    const address = consumerBillingAddress.find(
      (addr) => addr.consumer_billing_address_id === addressId
    );
    setSelectedBillingAddress(address);
  };

  const BillingAddressModal = memo(() => (
    <Modal
      visible={showBillingModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowBillingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Surface
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[styles.modalTitle, { color: theme.colors.textColor }]}
            >
              Select Billing Address
            </Text>
            <TouchableOpacity onPress={() => setShowBillingModal(false)}>
              <Feather
                name="x"
                size={24}
                color={theme.colors.textColor}
                style={{ padding: 10 }}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.addressList}>
            <RadioButton.Group
              onValueChange={handleAddressSelection}
              value={selectedBillingAddress?.consumer_billing_address_id || ""}
            >
              {consumerBillingAddress.map((address) => {
                const isExpanded =
                  expandedAddressId === address.consumer_billing_address_id;
                const hasPinLocation = !!address.pin_location;

                return (
                  <Surface
                    key={address.consumer_billing_address_id}
                    style={[
                      styles.addressItem,
                      selectedBillingAddress?.consumer_billing_address_id ===
                      address.consumer_billing_address_id
                        ? styles.selectedAddressItem
                        : {},
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.addressHeader}
                      onPress={() =>
                        setExpandedAddressId(
                          isExpanded
                            ? null
                            : address.consumer_billing_address_id
                        )
                      }
                    >
                      <RadioButton
                        value={address.consumer_billing_address_id}
                        color={theme.colors.button}
                      />
                      <View style={styles.addressHeaderContent}>
                        <Text
                          style={[
                            styles.addressName,
                            { color: theme.colors.textColor },
                          ]}
                        >
                          {address.name}
                        </Text>
                      </View>
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.textColor}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.addressDetailsExpanded}>
                        <View style={styles.addressIconRow}>
                          <Feather
                            name="map-pin"
                            size={14}
                            color={theme.colors.textColor}
                            style={styles.addressIcon}
                          />
                          <Text
                            style={[
                              styles.addressText,
                              { color: theme.colors.textColor },
                            ]}
                          >
                            {address.address}
                          </Text>
                        </View>
                        <View style={styles.addressIconRow}>
                          <Feather
                            name="map"
                            size={14}
                            color={theme.colors.textColor}
                            style={styles.addressIcon}
                          />
                          <Text
                            style={[
                              styles.addressText,
                              { color: theme.colors.textColor },
                            ]}
                          >
                            {hasPinLocation
                              ? "Pin location available"
                              : "Pin location not available"}
                          </Text>
                        </View>
                        <View style={styles.addressIconRow}>
                          <Entypo
                            name="email"
                            size={14}
                            color={theme.colors.textColor}
                            style={styles.addressIcon}
                          />
                          <Text
                            style={[
                              styles.addressText,
                              { color: theme.colors.textColor },
                            ]}
                          >
                            {address.email}
                          </Text>
                        </View>
                        <View style={styles.addressIconRow}>
                          <Feather
                            name="phone"
                            size={14}
                            color={theme.colors.textColor}
                            style={styles.addressIcon}
                          />
                          <Text
                            style={[
                              styles.addressText,
                              { color: theme.colors.textColor },
                            ]}
                          >
                            {address.phone}
                          </Text>
                        </View>
                      </View>
                    )}
                  </Surface>
                );
              })}
            </RadioButton.Group>
          </ScrollView>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowBillingModal(false)}
              style={styles.modalButton}
              textColor={theme.colors.textColor}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                setShowBillingModal(false);
                if (selectedBillingAddress) {
                  processOrder();
                } else {
                  showAlert("Error", "Please select a billing address");
                }
              }}
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.button },
              ]}
              disabled={!selectedBillingAddress}
              textColor="white"
            >
              Confirm
            </Button>
          </View>

          <Button
            mode="contained"
            onPress={() => {
              setShowBillingModal(false);
              router.push("/screens/BillingAddress");
            }}
            textColor={theme.colors.button}
            icon={({ size, color }) => (
              <Feather name="plus" size={size} color={color} />
            )}
            style={{ marginHorizontal: 15 }}
          >
            Add New Address
          </Button>
        </Surface>
      </View>
    </Modal>
  ));

  const SelectedBillingAddress = memo(() => {
    if (!selectedBillingAddress) return null;

    const hasPinLocation = !!selectedBillingAddress.pin_location;

    return (
      <Surface
        style={[
          styles.selectedBillingAddressContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <View style={styles.billingAddressHeader}>
          <View style={styles.billingAddressHeaderLeft}>
            <Feather name="map-pin" size={20} color={theme.colors.button} />
            <Text
              style={[
                styles.billingAddressTitle,
                { color: theme.colors.textColor },
              ]}
            >
              Billing Address
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeBillingButton}
            onPress={() => setShowBillingModal(true)}
          >
            <Text
              style={[styles.changeBillingText, { color: theme.colors.button }]}
            >
              Change
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.billingAddressContent}>
          <Text
            style={[
              styles.billingAddressName,
              { color: theme.colors.textColor },
            ]}
          >
            {selectedBillingAddress.name}
          </Text>
          <View style={styles.addressIconRow}>
            <Feather
              name="map-pin"
              size={14}
              color={theme.colors.textColor}
              style={styles.addressIcon}
            />
            <Text
              style={[
                styles.billingAddressText,
                { color: theme.colors.textColor },
              ]}
            >
              {selectedBillingAddress.address}
            </Text>
          </View>
          <View style={styles.addressIconRow}>
            <Feather
              name="map"
              size={14}
              color={theme.colors.textColor}
              style={styles.addressIcon}
            />
            <Text
              style={[
                styles.billingAddressText,
                { color: theme.colors.textColor },
              ]}
            >
              {hasPinLocation
                ? "Pin location available"
                : "Pin location not available"}
            </Text>
          </View>
          <View style={styles.addressIconRow}>
            <Entypo
              name="email"
              size={14}
              color={theme.colors.textColor}
              style={styles.addressIcon}
            />
            <Text
              style={[
                styles.billingAddressText,
                { color: theme.colors.textColor },
              ]}
            >
              {selectedBillingAddress.email}
            </Text>
          </View>
          <View style={styles.addressIconRow}>
            <Feather
              name="phone"
              size={14}
              color={theme.colors.textColor}
              style={styles.addressIcon}
            />
            <Text
              style={[
                styles.billingAddressText,
                { color: theme.colors.textColor },
              ]}
            >
              {selectedBillingAddress.phone}
            </Text>
          </View>
        </View>
      </Surface>
    );
  });

  const PaymentMethodSection = memo(() => {
    return (
      <Surface
        style={[
          styles.paymentMethodContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <View style={styles.paymentMethodHeader}>
          <Feather name="credit-card" size={20} color={theme.colors.button} />
          <Text
            style={[
              styles.paymentMethodTitle,
              { color: theme.colors.textColor },
            ]}
          >
            Payment Method
          </Text>
        </View>

        <View style={styles.paymentMethodContent}>
          <View
            style={[
              styles.paymentOption,
              {
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.03)",
              },
            ]}
          >
            <View style={styles.paymentOptionLeft}>
              <View
                style={[
                  styles.paymentIconContainer,
                  { backgroundColor: theme.colors.button + "20" },
                ]}
              >
                <Feather name="truck" size={20} color={theme.colors.button} />
              </View>
              <View style={styles.paymentDetails}>
                <Text
                  style={[
                    styles.paymentOptionTitle,
                    { color: theme.colors.textColor },
                  ]}
                >
                  Cash on Delivery
                </Text>
                <Text
                  style={[
                    styles.paymentOptionDescription,
                    { color: theme.colors.textColor + "99" },
                  ]}
                >
                  Pay when your order arrives
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.selectedPaymentIndicator,
                { backgroundColor: theme.colors.button },
              ]}
            >
              <Feather name="check" size={14} color="#fff" />
            </View>
          </View>
        </View>
      </Surface>
    );
  });

  const QuantitySelector = memo(({ quantity, onDecrease, onIncrease }) => (
    <View style={styles.quantityContainer}>
      <TouchableOpacity
        style={[
          styles.quantityButton,
          { backgroundColor: isDarkTheme ? "#333" : "#f0f0f0" },
        ]}
        onPress={onDecrease}
        accessibilityLabel="Decrease quantity"
      >
        <Feather name="minus" size={16} color={isDarkTheme ? "#fff" : "#333"} />
      </TouchableOpacity>
      <Text style={[styles.quantityText, { color: theme.colors.textColor }]}>
        {quantity}
      </Text>
      <TouchableOpacity
        style={[
          styles.quantityButton,
          { backgroundColor: isDarkTheme ? "#333" : "#f0f0f0" },
        ]}
        onPress={onIncrease}
        accessibilityLabel="Increase quantity"
      >
        <Feather name="plus" size={16} color={isDarkTheme ? "#fff" : "#333"} />
      </TouchableOpacity>
    </View>
  ));

  const hasValidVariants = useMemo(
    () => (item) => {
      return (
        item.variants &&
        item.variants.length > 0 &&
        !(
          item.variants.length === 1 &&
          (item.variants[0].variants_id === null ||
            item.variants[0].variant_values === null ||
            item.variants[0].variant_title === null)
        )
      );
    },
    []
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const selection = selections.find(
        (sel) => sel.id === item.consumer_cart_items_id
      );

      if (!selection) return null;

      const isComplete = isItemComplete(item.consumer_cart_items_id);
      const completionPercentage = getCompletionPercentage(
        item.consumer_cart_items_id
      );
      const isExpanded = expandedItem === item.consumer_cart_items_id;
      const itemSubtotal = Number.parseFloat(item.spu) * selection.quantity;
      const itemHasValidVariants = hasValidVariants(item);

      return (
        <Surface
          style={[
            styles.itemContainer,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <TouchableOpacity
            style={styles.itemHeaderContainer}
            onPress={() => toggleExpandItem(item.consumer_cart_items_id)}
            activeOpacity={0.7}
          >
            <View style={styles.itemHeaderLeft}>
              <View style={styles.itemNumberContainer}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
              </View>
              <View style={styles.itemTitleContainer}>
                <Text
                  style={[styles.itemTitle, { color: theme.colors.textColor }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${completionPercentage}%`,
                        backgroundColor: isComplete
                          ? theme.colors.button
                          : theme.colors.inactiveColor,
                      },
                    ]}
                  />
                  <Text style={styles.progressText}>
                    {isComplete
                      ? "Complete"
                      : `${Math.round(completionPercentage)}% complete`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.itemHeaderRight}>
              <Text style={[styles.itemPrice, { color: theme.colors.button }]}>
                AF {item.spu}
              </Text>
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.colors.textColor}
              />
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.productDetailsRow}>
                <Image
                  source={
                    isDarkTheme
                      ? require("../../../assets/images/darkImagePlaceholder.jpg")
                      : require("../../../assets/images/imageSkeleton.jpg")
                  }
                  style={styles.itemImage}
                />

                <View style={styles.productDetails}>
                  <View style={styles.detailRow}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textColor },
                      ]}
                    >
                      Quantity:
                    </Text>
                    <QuantitySelector
                      quantity={selection.quantity}
                      onDecrease={() =>
                        handleQuantityChange(item.consumer_cart_items_id, -1)
                      }
                      onIncrease={() =>
                        handleQuantityChange(item.consumer_cart_items_id, 1)
                      }
                    />
                  </View>

                  <View style={styles.detailRow}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textColor },
                      ]}
                    >
                      Subtotal:
                    </Text>
                    <Text
                      style={[
                        styles.subtotalValue,
                        { color: theme.colors.button },
                      ]}
                    >
                      AF {itemSubtotal}
                    </Text>
                  </View>
                </View>
              </View>

              <Divider style={styles.divider} />

              {itemHasValidVariants && (
                <View style={styles.variantsContainer}>
                  {item.variants.map((variant) => {
                    const isVariantSelected =
                      !!selection.selectedVariants[variant.variant_title];

                    return (
                      <View
                        key={variant.variants_id}
                        style={styles.variantSection}
                      >
                        <View style={styles.variantHeader}>
                          <Text
                            style={[
                              styles.variantTitle,
                              { color: theme.colors.textColor },
                            ]}
                          >
                            {variant.variant_title}
                          </Text>
                          {isVariantSelected ? (
                            <Chip
                              icon={() => (
                                <Feather name="check" size={14} color="#fff" />
                              )}
                              style={[
                                styles.selectedChip,
                                { backgroundColor: theme.colors.button },
                              ]}
                              textStyle={{ color: "white", fontSize: 12 }}
                            >
                              Selected
                            </Chip>
                          ) : (
                            <Chip
                              icon={() => (
                                <Feather
                                  name="alert-circle"
                                  size={14}
                                  color="#fff"
                                />
                              )}
                              style={styles.requiredChip}
                              textStyle={{ color: "white", fontSize: 12 }}
                            >
                              Required
                            </Chip>
                          )}
                        </View>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.optionsContainer}
                        >
                          {(variant.variant_values
                            ? variant.variant_values.split(",")
                            : []
                          ).map((value) => {
                            const isSelected =
                              selection.selectedVariants[
                                variant.variant_title
                              ] === value;

                            return (
                              <TouchableOpacity
                                key={value}
                                style={[
                                  styles.optionItem,
                                  isSelected && styles.selectedOptionItem,
                                  {
                                    backgroundColor: isDarkTheme
                                      ? "#333"
                                      : "#f0f0f0",
                                  },
                                ]}
                                onPress={() =>
                                  handleVariantSelect(
                                    item.consumer_cart_items_id,
                                    variant.variant_title,
                                    value
                                  )
                                }
                                activeOpacity={0.7}
                              >
                                {isSelected && (
                                  <View style={styles.selectedIndicator}>
                                    <Feather
                                      name="check"
                                      size={12}
                                      color="#fff"
                                    />
                                  </View>
                                )}
                                <Text
                                  style={[
                                    styles.optionText,
                                    { color: theme.colors.textColor },
                                    isSelected && styles.selectedOptionText,
                                  ]}
                                >
                                  {value}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </Surface>
      );
    },
    [
      selections,
      expandedItem,
      theme.colors,
      isDarkTheme,
      isItemComplete,
      getCompletionPercentage,
      hasValidVariants,
      handleQuantityChange,
      handleVariantSelect,
      toggleExpandItem,
    ]
  );

  const OrderSummary = memo(() => {
    const allComplete = selectedItems.every((item) =>
      isItemComplete(item.consumer_cart_items_id)
    );

    const completedCount = selectedItems.filter((item) =>
      isItemComplete(item.consumer_cart_items_id)
    ).length;

    const completionPercentage = (completedCount / selectedItems.length) * 100;

    return (
      <View style={styles.orderSummaryWrapper}>
        {selectedBillingAddress && <SelectedBillingAddress />}
        <PaymentMethodSection />
        <Surface
          style={[
            styles.orderSummaryContainer,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <View style={styles.orderSummaryContent}>
            <View style={styles.summaryHeader}>
              <Text
                style={[styles.summaryTitle, { color: theme.colors.textColor }]}
              >
                Order Summary
              </Text>
              <Text
                style={[
                  styles.summarySubtitle,
                  { color: theme.colors.textColor },
                ]}
              >
                {completedCount} of {selectedItems.length} items complete
              </Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFull,
                  {
                    width: `${completionPercentage}%`,
                    backgroundColor: allComplete
                      ? theme.colors.button
                      : "#FF9800",
                  },
                ]}
              />
            </View>

            <View style={styles.productQuantitySummary}>
              <Text
                style={[
                  styles.quantitySummaryTitle,
                  { color: theme.colors.textColor },
                ]}
              >
                Products
              </Text>
              <Divider style={styles.quantitySummaryDivider} />
              {selectedItems.map((item) => {
                const selection = selections.find(
                  (sel) => sel.id === item.consumer_cart_items_id
                );
                if (!selection) return null;

                return (
                  <View
                    key={item.consumer_cart_items_id}
                    style={styles.quantitySummaryItem}
                  >
                    <Text
                      style={[
                        styles.quantitySummaryName,
                        { color: theme.colors.textColor },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.quantitySummaryDetails}>
                      <Text
                        style={[
                          styles.quantitySummaryQty,
                          { color: theme.colors.textColor },
                        ]}
                      >
                        x{selection.quantity}
                      </Text>
                      <Text
                        style={[
                          styles.quantitySummaryPrice,
                          { color: theme.colors.button },
                        ]}
                      >
                        AF {Number.parseFloat(item.spu) * selection.quantity}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.totalContainer}>
              <Text
                style={[styles.totalLabel, { color: theme.colors.textColor }]}
              >
                Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.button }]}>
                AF {totalPrice}
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleConfirm}
              style={[
                styles.confirmButton,
                allComplete ? styles.completeButton : styles.incompleteButton,
              ]}
              contentStyle={styles.buttonContent}
              labelStyle={[
                styles.buttonLabel,
                {
                  color: "white",
                },
              ]}
              loading={isSubmitting}
              disabled={isSubmitting || !allComplete}
              textColor="white"
              icon={({ size, color }) => (
                <Feather
                  name={allComplete ? "check-circle" : "alert-circle"}
                  size={18}
                  color={color}
                />
              )}
            >
              {isSubmitting
                ? "Processing..."
                : allComplete
                ? "Place Order"
                : "Complete All Selections"}
            </Button>
          </View>
        </Surface>
      </View>
    );
  });

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="cart-off"
        size={80}
        color={theme.colors.inactiveColor}
      />
      <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
        No items selected
      </Text>
      <Button
        mode="contained"
        onPress={() => router.back()}
        style={styles.backButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Return to Cart
      </Button>
    </View>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: isDarkTheme ? "#121212" : "#f8f8f8" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.button} />
        <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
          Loading your selections...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.mainContainer}>
        <FlatList
          data={selectedItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.consumer_cart_items_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={
            selectedItems.length > 0 ? <OrderSummary /> : null
          }
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </View>
      <BillingAddressModal />

      {/* Add the AlertDialog component */}
      <AlertDialog
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onDismiss={() => {
          setAlertVisible(false);
          alertConfirmAction();
        }}
        onConfirm={() => {
          setAlertVisible(false);
          alertConfirmAction();
        }}
        confirmText="OK"
        cancelText=""
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  mainContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  list: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemContainer: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  itemHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  itemHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemNumber: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  progressContainer: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    width: "100%",
    marginTop: 4,
    position: "relative",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressText: {
    fontSize: 10,
    color: "#757575",
    marginTop: 4,
  },
  itemHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
  },
  productDetailsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  productDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    // marginVertical: 16,
  },
  variantsContainer: {
    marginTop: 8,
  },
  variantSection: {
    marginBottom: 20,
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  variantTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectedChip: {
    backgroundColor: "#4CAF50",
  },
  requiredChip: {
    backgroundColor: "#FF9800",
  },
  optionsContainer: {
    paddingBottom: 8,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  selectedOptionItem: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  selectedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
  },
  selectedOptionText: {
    fontWeight: "600",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 16,
    width: 30,
    textAlign: "center",
    fontWeight: "500",
  },
  orderSummaryContainer: {
    borderRadius: 16,
    marginTop: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  orderSummaryContent: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  summarySubtitle: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 16,
  },
  progressBarFull: {
    height: 6,
    borderRadius: 3,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  confirmButton: {
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  completeButton: {
    backgroundColor: "#4CAF50",
  },
  incompleteButton: {
    backgroundColor: "#FF9800",
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  noVariantsContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  noVariantsText: {
    fontSize: 14,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    paddingTop: 15,
  },
  addressList: {
    maxHeight: 400,
    marginBottom: 16,
    paddingTop: 10,
  },
  addressItem: {
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 15,

    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  addressHeaderContent: {
    flex: 1,
    marginLeft: 8,
  },
  addressDetailsExpanded: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    paddingBottom: 8,
    paddingLeft: 15,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "600",
  },
  addressText: {
    fontSize: 14,
    marginBottom: 2,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginHorizontal: 10,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  productQuantitySummary: {
    marginBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 8,
    padding: 12,
  },
  quantitySummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  quantitySummaryDivider: {
    marginBottom: 12,
  },
  quantitySummaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  quantitySummaryName: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  quantitySummaryDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantitySummaryQty: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: "500",
  },
  quantitySummaryPrice: {
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 70,
    textAlign: "right",
  },
  selectedAddressItem: {
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  addressIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  addressIcon: {
    marginRight: 6,
  },
  selectedBillingAddressContainer: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  billingAddressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billingAddressHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  billingAddressTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  changeBillingButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeBillingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  billingAddressContent: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 8,
    padding: 12,
  },
  billingAddressName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  billingAddressText: {
    fontSize: 14,
    flex: 1,
  },
  paymentMethodContainer: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  paymentMethodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  paymentMethodContent: {
    marginTop: 4,
  },
  paymentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  paymentOptionDescription: {
    fontSize: 14,
  },
  selectedPaymentIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  orderSummaryWrapper: {
    marginTop: 16,
  },
});

export default ProductVariantSelection;
