import { useLayoutEffect, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
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
import useOrderStore from "../../../components/store/useOrderStore";
import useProductStore from "../../../components/api/useProductStore";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import useThemeStore from "../../../components/store/useThemeStore";

const ProductVariantSelection = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useTheme();
  const { isDarkTheme } = useThemeStore();
  const { item } = useLocalSearchParams();
  const { deleteFromCart } = useProductStore();
  const { addOrder } = useOrderStore();
  const { user, consumerBillingAddress } = useProductStore();

  const [selectedItems, setSelectedItems] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [expandedItem, setExpandedItem] = useState(null);

  // Billing address state
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Customize Order",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  // Parse items and initialize selections
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

      // Set first item as expanded by default
      if (parsedItems.length > 0) {
        setExpandedItem(parsedItems[0].consumer_cart_items_id);
      }

      // Animate in the content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      setIsLoading(false);
    } catch (error) {
      console.error("Error parsing items:", error);
      Alert.alert(
        "Error",
        "There was a problem loading your selected items. Please try again."
      );
      router.back();
    }
  }, [item, router, fadeAnim, slideAnim]);

  // Calculate total price whenever selections change
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

  // Handle variant selection
  const handleVariantSelect = (itemId, variantTitle, value) => {
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
  };

  // Handle quantity change
  const handleQuantityChange = (itemId, delta) => {
    setSelections((prev) =>
      prev.map((sel) =>
        sel.id === itemId
          ? { ...sel, quantity: Math.max(1, sel.quantity + delta) }
          : sel
      )
    );
  };

  // Toggle expanded item
  const toggleExpandItem = (itemId) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  // Check if all variants are selected for an item
  const isItemComplete = (itemId) => {
    const currentItem = selectedItems.find(
      (i) => i.consumer_cart_items_id === itemId
    );
    const selection = selections.find((sel) => sel.id === itemId);

    if (!currentItem || !selection) return false;

    // Check if variants array doesn't exist or is empty
    if (!currentItem.variants || currentItem.variants.length === 0) return true;

    // Check if variants array has a single entry with null values
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
  };

  // Get completion percentage for an item
  const getCompletionPercentage = (itemId) => {
    const currentItem = selectedItems.find(
      (i) => i.consumer_cart_items_id === itemId
    );
    const selection = selections.find((sel) => sel.id === itemId);

    if (!currentItem || !selection) return 0;

    // Check if variants array doesn't exist or is empty
    if (!currentItem.variants || currentItem.variants.length === 0) return 100;

    // Check if variants array has a single entry with null values
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
  };

  // Check for billing addresses and show modal if needed
  const checkBillingAddresses = () => {
    if (!consumerBillingAddress || consumerBillingAddress.length === 0) {
      // No billing addresses, redirect to add one
      Alert.alert(
        "Billing Address Required",
        "You need to add a billing address before placing an order.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Address",
            onPress: () => router.push("/screens/BillingAddress"),
          },
        ]
      );
      return false;
    } else if (consumerBillingAddress.length === 1) {
      // Only one address, use it automatically
      setSelectedBillingAddress(consumerBillingAddress[0]);
      return true;
    } else {
      // Multiple addresses, show selection modal
      setShowBillingModal(true);
      return false;
    }
  };

  // Handle order confirmation
  const handleConfirm = async () => {
    const incompleteItems = selections.filter((sel) => {
      const currentItem = selectedItems.find(
        (i) => i.consumer_cart_items_id === sel.id
      );

      // Skip validation for items without variants
      if (!currentItem.variants || currentItem.variants.length === 0)
        return false;

      // Skip validation for items with a single null variant entry
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
      Alert.alert(
        "Incomplete Selection",
        "Please select all variants for each item before placing your order.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check for billing addresses before proceeding
    if (!checkBillingAddresses()) {
      return;
    }

    // If we have a selected billing address, proceed with order
    if (selectedBillingAddress) {
      processOrder();
    }
  };

  // Process the order after billing address is selected
  const processOrder = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        selections.map((sel) => {
          const currentItem = selectedItems.find(
            (i) => i.consumer_cart_items_id === sel.id
          );

          // Handle the case with null variant values
          const hasRealVariants =
            currentItem.variants &&
            currentItem.variants.length > 0 &&
            !(
              currentItem.variants.length === 1 &&
              (currentItem.variants[0].variants_id === null ||
                currentItem.variants[0].variant_values === null ||
                currentItem.variants[0].variant_title === null)
            );

          const orderItem = {
            ...currentItem,
            select_variant_values: hasRealVariants
              ? Object.values(sel.selectedVariants)
              : [],
            select_variant_ids: hasRealVariants
              ? currentItem.variants.map((v) => v.variants_id)
              : [],
            qty: sel.quantity,
            billing_address_id:
              selectedBillingAddress.consumer_billing_address_id,
          };
          return addOrder(orderItem);
        })
      );

      await Promise.all(
        selectedItems.map((item) =>
          deleteFromCart({
            productID: item.consumer_cart_items_id,
            consumerID: user?.consumer_id,
          })
        )
      );

      Alert.alert(
        "Order Placed Successfully",
        "Your order has been placed and items removed from cart.",
        [
          {
            text: "View Orders",
            onPress: () => router.push("/screens/Orders"),
          },
          {
            text: "Continue Shopping",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Failed to place orders:", error);
      Alert.alert(
        "Order Failed",
        "An error occurred while placing your order. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Billing Address Selection Modal
  const BillingAddressModal = () => (
    <Modal
      visible={showBillingModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowBillingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View
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
              <Feather name="x" size={24} color={theme.colors.textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.addressList}>
            <RadioButton.Group
              onValueChange={(value) => {
                const address = consumerBillingAddress.find(
                  (addr) => addr.consumer_billing_address_id === value
                );
                setSelectedBillingAddress(address);
              }}
              value={selectedBillingAddress?.consumer_billing_address_id || ""}
            >
              {consumerBillingAddress.map((address) => (
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
                  <View style={styles.addressRadioRow}>
                    <RadioButton
                      value={address.consumer_billing_address_id}
                      color={theme.colors.button}
                    />
                    <View style={styles.addressDetails}>
                      <Text
                        style={[
                          styles.addressName,
                          { color: theme.colors.textColor },
                        ]}
                      >
                        {address.name}
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
                          {address.district_name}, {address.province_name}{" "}
                          {address.postal_code}
                        </Text>
                      </View>
                      <View style={styles.addressIconRow}>
                        <Feather
                          name="globe"
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
                          {address.country_name}
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
                  </View>
                </Surface>
              ))}
            </RadioButton.Group>
          </ScrollView>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowBillingModal(false);
                setSelectedBillingAddress(null);
              }}
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
                  Alert.alert("Please select a billing address");
                }
              }}
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.button },
              ]}
              disabled={!selectedBillingAddress}
            >
              Confirm
            </Button>
          </View>

          <Button
            mode="text"
            onPress={() => {
              setShowBillingModal(false);
              router.push("/screens/BillingAddress");
            }}
            textColor={theme.colors.button}
            icon={({ size, color }) => (
              <Feather name="plus" size={size} color={color} />
            )}
          >
            Add New Address
          </Button>
        </View>
      </View>
    </Modal>
  );

  // Selected Billing Address Component
  const SelectedBillingAddress = () => {
    if (!selectedBillingAddress) return null;

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
              {selectedBillingAddress.district_name},{" "}
              {selectedBillingAddress.province_name}{" "}
              {selectedBillingAddress.postal_code}
            </Text>
          </View>
          <View style={styles.addressIconRow}>
            <Feather
              name="globe"
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
              {selectedBillingAddress.country_name}
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
  };

  // Payment Method Component
  const PaymentMethodSection = () => {
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
  };

  // Quantity Selector Component
  const QuantitySelector = ({ quantity, onDecrease, onIncrease }) => (
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
  );

  // Render each product item
  const renderItem = ({ item, index }) => {
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

            {item.variants &&
            item.variants.length > 0 &&
            !(
              item.variants.length === 1 &&
              (item.variants[0].variants_id === null ||
                item.variants[0].variant_values === null ||
                item.variants[0].variant_title === null)
            ) ? (
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
            ) : (
              <View style={styles.noVariantsContainer}>
                <Text
                  style={[
                    styles.noVariantsText,
                    { color: theme.colors.textColor },
                  ]}
                >
                  This product has no variants to select.
                </Text>
              </View>
            )}
          </View>
        )}
      </Surface>
    );
  };

  const OrderSummary = () => {
    const allComplete = selectedItems.every((item) =>
      isItemComplete(item.consumer_cart_items_id)
    );

    const completedCount = selectedItems.filter((item) =>
      isItemComplete(item.consumer_cart_items_id)
    ).length;

    const completionPercentage = (completedCount / selectedItems.length) * 100;

    return (
      <View style={styles.orderSummaryWrapper}>
        {/* Billing Address Section */}
        {selectedBillingAddress && <SelectedBillingAddress />}

        {/* Payment Method Section */}
        <PaymentMethodSection />

        {/* Order Summary Section */}
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

            {/* Product quantity summary section */}
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
              labelStyle={[styles.buttonLabel, { color: theme.colors.primary }]}
              loading={isSubmitting}
              disabled={isSubmitting || !allComplete}
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
  };

  // Empty state component
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
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
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
        />
      </Animated.View>

      {/* Billing Address Selection Modal */}
      <BillingAddressModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  animatedContainer: {
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
    marginVertical: 16,
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
  // Modal styles
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
    padding: 20,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  addressList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  addressItem: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
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
  addressRadioRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressDetails: {
    flex: 1,
    marginLeft: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    marginBottom: 2,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  // Add these styles to the StyleSheet object
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
  // New styles for the modernized components
  selectedAddressItem: {
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
