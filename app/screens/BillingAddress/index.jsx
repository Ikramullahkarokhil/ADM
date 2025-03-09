"use client";

import { useLayoutEffect, useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Button, useTheme, Divider, IconButton } from "react-native-paper";
import useProductStore from "../../../components/api/useProductStore";
import * as Yup from "yup";
import { Formik } from "formik";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "expo-router";

const BillingAddress = () => {
  const theme = useTheme();
  const {
    consumerBillingAddress,
    deleteBillingAddress,
    addBillingAddress,
    user,
    setBillingAddressStatus,
  } = useProductStore();
  const [mode, setMode] = useState("view"); // 'view', 'add', 'edit'
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedAddressId, setExpandedAddressId] = useState(null);
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Billing Addresses",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  // Update fade animation when expanded address changes
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: expandedAddressId ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expandedAddressId, fadeAnim]);

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Full name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone: Yup.string().required("Phone number is required"),
    address: Yup.string().required("Street address is required"),
    district_name: Yup.string().required("City is required"),
    province_name: Yup.string().required("State/Province is required"),
    postal_code: Yup.string().required("Postal code is required"),
    country_name: Yup.string().required("Country is required"),
  });

  const handleSave = async (values) => {
    setIsLoading(true);
    const billingData = {
      ...values,
      consumer_id: user.consumer_id,
    };

    try {
      const response = await addBillingAddress(billingData);
      console.log(response);
      setMode("view");
      setSelectedAddress(null);
      Alert.alert(
        "Success",
        mode === "add"
          ? "Address added successfully"
          : "Address updated successfully"
      );
    } catch (error) {
      console.log(
        "Error:",
        error.response ? error.response.data : error.message
      );
      Alert.alert("Error", "Failed to save address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (address) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this address?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              const response = await deleteBillingAddress({
                consumerID: user.consumer_id,
                billingAddressID: address.consumer_billing_address_id,
              });
              console.log(response);
              Alert.alert("Success", "Address deleted successfully");
            } catch (error) {
              console.log(error);
              Alert.alert(
                "Error",
                "Failed to delete address. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (address, event) => {
    if (event) {
      event.stopPropagation(); // Prevent card expansion when clicking set default
    }

    if (address.is_default) {
      return; // Already default, no need to do anything
    }

    setIsLoading(true);
    try {
      const response = await setBillingAddressStatus({
        consumerId: user.consumer_id,
        billingId: address.consumer_billing_address_id,
      });
      console.log(response);

      // Show success message
      Alert.alert(
        "Default Address",
        "This address has been set as your default billing address."
      );
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to set default address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCardExpansion = (addressId) => {
    // Toggle expansion state
    setExpandedAddressId(expandedAddressId === addressId ? null : addressId);
  };

  const renderFormField = (
    field,
    label,
    placeholder,
    handleChange,
    handleBlur,
    values,
    errors,
    touched,
    keyboardType = "default"
  ) => (
    <View style={styles.inputContainer} key={field}>
      <Text style={[styles.label, { color: theme.colors.textColor }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.primary,
            color: theme.colors.textColor,
            borderColor:
              touched[field] && errors[field]
                ? "red"
                : theme.colors.subInactiveColor,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.subInactiveColor}
        onChangeText={handleChange(field)}
        onBlur={handleBlur(field)}
        value={values[field]}
        keyboardType={keyboardType}
      />
      {touched[field] && errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderAddressCard = (address) => {
    const isExpanded =
      expandedAddressId === address.consumer_billing_address_id;

    return (
      <View
        key={address.consumer_billing_address_id}
        style={[
          styles.addressCard,
          {
            backgroundColor: theme.colors.primary,
            borderColor: address.is_default
              ? theme.colors.button
              : theme.colors.subInactiveColor,
            borderWidth: address.is_default ? 2 : 1,
            shadowColor: address.is_default ? theme.colors.button : "#000",
            shadowOpacity: address.is_default ? 0.3 : 0.1,
          },
          isExpanded && styles.expandedCard,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            toggleCardExpansion(address.consumer_billing_address_id)
          }
          style={styles.cardTouchable}
        >
          <View style={styles.addressHeader}>
            <View style={styles.nameContainer}>
              <Text
                style={[styles.addressName, { color: theme.colors.textColor }]}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {address.name}
              </Text>
              {address.is_default && (
                <View
                  style={[
                    styles.defaultBadge,
                    { backgroundColor: theme.colors.button },
                  ]}
                >
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
            <View style={styles.actionButtons}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedAddress(address);
                  setMode("edit");
                }}
                iconColor={theme.colors.button}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor={theme.colors.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(address);
                }}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Basic info always visible */}
          <View style={styles.addressBasicInfo}>
            <View style={styles.addressRow}>
              <MaterialIcons
                name="location-on"
                size={16}
                color={theme.colors.button}
              />
              <Text
                style={[styles.addressText, { color: theme.colors.textColor }]}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {address.address}, {address.district_name}
              </Text>
            </View>
          </View>

          {/* Expanded details */}
          {isExpanded && (
            <Animated.View
              style={[styles.expandedDetails, { opacity: fadeAnim }]}
            >
              <View style={styles.addressDetails}>
                <View style={styles.addressRow}>
                  <MaterialIcons
                    name="email"
                    size={16}
                    color={theme.colors.button}
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

                <View style={styles.addressRow}>
                  <MaterialIcons
                    name="phone"
                    size={16}
                    color={theme.colors.button}
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

                <View style={styles.addressRow}>
                  <MaterialIcons
                    name="location-on"
                    size={16}
                    color={theme.colors.button}
                  />
                  <Text
                    style={[
                      styles.addressText,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    {address.address}, {address.district_name},{" "}
                    {address.province_name}, {address.postal_code},{" "}
                    {address.country_name}
                  </Text>
                </View>
              </View>

              <View style={styles.expandedActions}>
                {!address.is_default && (
                  <Button
                    mode="contained"
                    onPress={(e) => handleSetDefault(address, e)}
                    buttonColor={theme.colors.button}
                    textColor="white"
                    style={styles.setDefaultButton}
                    icon="check-circle"
                  >
                    Set as Default
                  </Button>
                )}
              </View>
            </Animated.View>
          )}

          {/* Set as default button for non-expanded cards */}
          {!isExpanded && !address.is_default && (
            <Button
              mode="text"
              onPress={(e) => handleSetDefault(address, e)}
              textColor={theme.colors.button}
              style={styles.setDefaultButton}
            >
              Set as Default
            </Button>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.button} />
              <Text
                style={[styles.loadingText, { color: theme.colors.textColor }]}
              >
                Processing...
              </Text>
            </View>
          </View>
        )}

        {mode === "view" ? (
          <>
            {consumerBillingAddress?.length > 0 ? (
              <View style={styles.addressList}>
                {consumerBillingAddress.map((address) =>
                  renderAddressCard(address)
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="location-off"
                  size={64}
                  color={theme.colors.button}
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: theme.colors.textColor },
                  ]}
                >
                  No billing addresses found
                </Text>
                <Text
                  style={[
                    styles.emptyStateSubtext,
                    { color: theme.colors.subInactiveColor },
                  ]}
                >
                  Add a new billing address to get started
                </Text>
                <Button
                  mode="contained"
                  onPress={() => setMode("add")}
                  icon="plus"
                  buttonColor={theme.colors.button}
                  textColor="white"
                  style={[styles.addButton, { marginTop: 20 }]}
                >
                  Add New Address
                </Button>
              </View>
            )}
          </>
        ) : (
          <View
            style={[
              styles.formContainer,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={[styles.formTitle, { color: theme.colors.textColor }]}>
              {mode === "add" ? "Add New Address" : "Edit Address"}
            </Text>

            <Formik
              initialValues={{
                name: selectedAddress?.name || "",
                email: selectedAddress?.email || "",
                phone: selectedAddress?.phone || "",
                address: selectedAddress?.address || "",
                district_name: selectedAddress?.district_name || "",
                province_name: selectedAddress?.province_name || "",
                postal_code: selectedAddress?.postal_code || "",
                country_name: selectedAddress?.country_name || "",
              }}
              validationSchema={validationSchema}
              onSubmit={handleSave}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <>
                  {renderFormField(
                    "name",
                    "FULL NAME",
                    "Enter your full name",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched
                  )}
                  {renderFormField(
                    "email",
                    "EMAIL",
                    "Enter your email address",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched,
                    "email-address"
                  )}
                  {renderFormField(
                    "phone",
                    "PHONE",
                    "Enter your phone number",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched,
                    "phone-pad"
                  )}
                  {renderFormField(
                    "address",
                    "STREET ADDRESS",
                    "Enter your street address",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched
                  )}
                  {renderFormField(
                    "district_name",
                    "CITY",
                    "Enter your city",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched
                  )}
                  {renderFormField(
                    "province_name",
                    "STATE/PROVINCE",
                    "Enter your state or province",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched
                  )}
                  {renderFormField(
                    "postal_code",
                    "POSTAL CODE",
                    "Enter your postal code",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched
                  )}
                  {renderFormField(
                    "country_name",
                    "COUNTRY",
                    "Enter your country",
                    handleChange,
                    handleBlur,
                    values,
                    errors,
                    touched
                  )}

                  <View style={styles.formButtons}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setMode("view");
                        setSelectedAddress(null);
                      }}
                      style={[
                        styles.cancelButton,
                        { borderColor: theme.colors.button },
                      ]}
                      textColor={theme.colors.button}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleSubmit}
                      style={styles.saveButton}
                      buttonColor={theme.colors.button}
                      textColor="white"
                    >
                      Save Address
                    </Button>
                  </View>
                </>
              )}
            </Formik>
          </View>
        )}
      </ScrollView>

      {mode === "view" && consumerBillingAddress?.length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.colors.button }]}
            onPress={() => setMode("add")}
          >
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  addressList: {
    gap: 16,
  },
  cardTouchable: {
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 999,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButton: {
    borderRadius: 8,
  },
  addressCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expandedCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  addressName: {
    fontSize: 18,
    fontWeight: "600",
  },
  defaultBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
  },
  divider: {
    marginVertical: 12,
  },
  addressBasicInfo: {
    marginBottom: 8,
  },
  expandedDetails: {
    marginTop: 8,
  },
  addressDetails: {
    gap: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    flex: 1,
  },
  expandedActions: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    flex: 1,
    minHeight: 400,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  setDefaultButton: {
    marginTop: 8,
    alignSelf: "flex-end",
  },
});

export default BillingAddress;
