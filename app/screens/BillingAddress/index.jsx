"use client";

import { useLayoutEffect, useState, useRef, useCallback } from "react";
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
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  ToastAndroid,
  RefreshControl,
  Modal,
} from "react-native";
import { Button, useTheme, Divider } from "react-native-paper";
import useProductStore from "../../../components/api/useProductStore";
import * as Yup from "yup";
import { Formik } from "formik";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "expo-router";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
// import MapLocationPicker from "../../../components/ui/MapLocationPicker";

const BillingAddress = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    consumerBillingAddress,
    deleteBillingAddress,
    addBillingAddress,
    user,
    setBillingAddressStatus,
    fetchBillingAddresses,
    editBillingAddress,
  } = useProductStore();
  const [mode, setMode] = useState("view"); // 'view', 'add', 'edit'
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
  const [localAddresses, setLocalAddresses] = useState(
    consumerBillingAddress || []
  );
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const scrollViewRef = useRef(null);

  // Update local addresses when store changes
  if (consumerBillingAddress && consumerBillingAddress !== localAddresses) {
    setLocalAddresses(consumerBillingAddress);
  }

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBillingAddresses(user.consumer_id);
      showToast("Addresses refreshed");
    } catch (error) {
      console.log("Error refreshing addresses:", error);
      showToast("Failed to refresh addresses");
    } finally {
      setRefreshing(false);
    }
  }, [user.consumer_id, fetchBillingAddresses]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Billing Addresses",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Full name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone: Yup.string().required("Phone number is required"),
    address: Yup.string().required("Street address is required"),
    // Pin location is not required but will be validated if present
    pin_location: Yup.object().nullable(),
  });

  // Show toast message (Android) or fallback to Alert (iOS)
  const showToast = (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("", message, [{ text: "OK" }], { cancelable: true });
    }
  };

  const handleSave = async (values) => {
    setIsLoading(true);

    try {
      if (mode === "edit" && selectedAddress) {
        // For editing an existing address
        const billingData = {
          consumer_id: user.consumer_id,
          billing_address_id: selectedAddress.consumer_billing_address_id,
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          pin_location: values.pin_location || null,
        };

        await editBillingAddress(billingData);
      } else {
        // For adding a new address
        const billingData = {
          ...values,
          consumer_id: user.consumer_id,
        };

        await addBillingAddress(billingData);
      }

      // Refresh the billing addresses list
      await fetchBillingAddresses(user.consumer_id);

      setMode("view");
      setSelectedAddress(null);
      setPinLocation(null);
      showToast(
        mode === "add"
          ? "Address added successfully"
          : "Address updated successfully"
      );
    } catch (error) {
      console.log(
        "Error:",
        error.response ? error.response.data : error.message
      );
      showToast("Failed to save address. Please try again.");
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
              // Optimistically update UI
              const updatedAddresses = localAddresses.filter(
                (a) =>
                  a.consumer_billing_address_id !==
                  address.consumer_billing_address_id
              );
              setLocalAddresses(updatedAddresses);

              // Then perform the actual deletion
              await deleteBillingAddress({
                consumerID: user.consumer_id,
                billingAddressID: address.consumer_billing_address_id,
              });
              showToast("Address deleted successfully");
            } catch (error) {
              console.log(error);
              // Revert to original data on error
              setLocalAddresses(consumerBillingAddress);
              showToast("Failed to delete address. Please try again.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (address) => {
    if (address.status === 1) {
      return; // Already default, no need to do anything
    }

    // IMPORTANT: Immediately update UI to show this address as default
    // This creates an optimistic UI update before the API call completes
    const updatedAddresses = localAddresses.map((addr) => ({
      ...addr,
      status:
        addr.consumer_billing_address_id === address.consumer_billing_address_id
          ? 1
          : 0,
    }));

    // Update local state immediately to reflect changes in UI
    setLocalAddresses(updatedAddresses);

    // Then perform the actual update
    setIsLoading(true);
    try {
      await setBillingAddressStatus({
        consumerId: user.consumer_id,
        billingId: address.consumer_billing_address_id,
      });
      showToast("Default address updated successfully");
    } catch (error) {
      console.log(error);
      // Revert to original data on error
      setLocalAddresses(consumerBillingAddress);
      showToast("Failed to set default address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const showAddressOptions = (address) => {
    const options = ["Edit", "Delete"];
    const destructiveButtonIndex = 1;

    if (address.status !== 1) {
      options.push("Set as Default");
    }

    options.push("Cancel");
    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
        containerStyle: {
          backgroundColor: theme.colors.primary,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
        },
        textStyle: {
          color: theme.colors.textColor,
          fontSize: 16,
        },
        titleTextStyle: {
          color: theme.colors.textColor,
          fontWeight: "bold",
          fontSize: 18,
        },
        messageTextStyle: {
          color: theme.colors.subInactiveColor,
          marginBottom: 10,
        },
        separatorStyle: {
          backgroundColor: theme.colors.subInactiveColor,
          opacity: 0.2,
        },
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          // Edit
          setSelectedAddress(address);
          setMode("edit");
        } else if (buttonIndex === 1) {
          // Delete
          handleDelete(address);
        } else if (buttonIndex === 2 && address.status !== 1) {
          // Set as Default (only if not already default)
          handleSetDefault(address);
        }
      }
    );
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
    keyboardType = "default",
    icon
  ) => (
    <View style={styles.inputContainer} key={field}>
      <Text style={[styles.label, { color: theme.colors.textColor }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor:
              touched[field] && errors[field]
                ? "red"
                : theme.colors.subInactiveColor,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={theme.colors.button}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.textColor,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.subInactiveColor}
          onChangeText={handleChange(field)}
          onBlur={handleBlur(field)}
          value={values[field]}
          keyboardType={keyboardType}
        />
      </View>
      {touched[field] && errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderAddressCard = (address) => {
    const isDefault = address.status == 1;

    return (
      <View
        key={address.consumer_billing_address_id}
        style={[
          styles.addressCard,
          {
            backgroundColor: theme.colors.primary,
            borderColor: isDefault
              ? theme.colors.button
              : theme.colors.subInactiveColor,
            borderWidth: isDefault ? 2 : 1,
            shadowColor: isDefault ? theme.colors.button : "#000",
            shadowOpacity: isDefault ? 0.3 : 0.1,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.cardTouchable}
          onLongPress={() => showAddressOptions(address)}
          delayLongPress={200}
          onPress={() => showAddressOptions(address)}
        >
          <View style={styles.addressHeader}>
            <View style={styles.nameContainer}>
              <Text
                style={[styles.addressName, { color: theme.colors.textColor }]}
                numberOfLines={1}
              >
                {address.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => showAddressOptions(address)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="more-vert"
                size={24}
                color={theme.colors.textColor}
              />
            </TouchableOpacity>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.addressDetails}>
            <View style={styles.addressRow}>
              <MaterialIcons
                name="email"
                size={16}
                color={theme.colors.button}
              />
              <Text
                style={[styles.addressText, { color: theme.colors.textColor }]}
                numberOfLines={1}
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
                style={[styles.addressText, { color: theme.colors.textColor }]}
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
                style={[styles.addressText, { color: theme.colors.textColor }]}
                numberOfLines={2}
              >
                {address.address}
              </Text>
            </View>

            {address.pin_location && (
              <View style={styles.addressRow}>
                <MaterialIcons
                  name="map"
                  size={16}
                  color={theme.colors.button}
                />
                <Text
                  style={[
                    styles.addressText,
                    { color: theme.colors.textColor },
                  ]}
                  numberOfLines={1}
                >
                  Pin location available
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {isDefault && (
          <View
            style={[
              styles.defaultBadge,
              { backgroundColor: theme.colors.button },
            ]}
          >
            <MaterialCommunityIcons name="check" size={16} color="white" />
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name="location-off"
        size={64}
        color={theme.colors.button}
      />
      <Text style={[styles.emptyStateText, { color: theme.colors.textColor }]}>
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
        icon={({ size, color }) => (
          <MaterialIcons name="add" size={size} color={color} />
        )}
        buttonColor={theme.colors.button}
        textColor="white"
        style={[styles.addButton, { marginTop: 20 }]}
        contentStyle={{ height: 48 }}
        labelStyle={{ fontSize: 16, fontWeight: "600" }}
      >
        Add New Address
      </Button>
    </View>
  );

  const handleOpenMap = (currentLocation) => {
    setPinLocation(currentLocation);
    setMapModalVisible(true);
  };

  const handleLocationSelect = (location) => {
    setPinLocation(location);
    setMapModalVisible(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.primary}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.button]}
              tintColor={theme.colors.button}
              title="Pull to refresh"
              titleColor={theme.colors.textColor}
            />
          }
        >
          {mode === "view" ? (
            <>
              {localAddresses?.length > 0 ? (
                <View style={styles.addressList}>
                  {localAddresses.map((address) => renderAddressCard(address))}
                </View>
              ) : (
                renderEmptyState()
              )}
            </>
          ) : (
            <View
              style={[
                styles.formContainer,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <View style={styles.formHeader}>
                <Text
                  style={[styles.formTitle, { color: theme.colors.textColor }]}
                >
                  {mode === "add" ? "Add New Address" : "Edit Address"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMode("view");
                    setSelectedAddress(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={theme.colors.textColor}
                  />
                </TouchableOpacity>
              </View>

              <Formik
                initialValues={{
                  name: selectedAddress?.name || "",
                  email: selectedAddress?.email || "",
                  phone: selectedAddress?.phone || "",
                  address: selectedAddress?.address || "",
                  pin_location:
                    selectedAddress?.pin_location || pinLocation || null,
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
                  isValid,
                  dirty,
                  setFieldValue,
                }) => {
                  // Store formikBag in ref for access from modal
                  if (scrollViewRef.current) {
                    scrollViewRef.current.formikBag = { setFieldValue };
                  }

                  return (
                    <>
                      {renderFormField(
                        "name",
                        "FULL NAME",
                        "Enter your full name",
                        handleChange,
                        handleBlur,
                        values,
                        errors,
                        touched,
                        "default",
                        "person"
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
                        "email-address",
                        "email"
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
                        "phone-pad",
                        "phone"
                      )}
                      {renderFormField(
                        "address",
                        "STREET ADDRESS",
                        "Enter your street address",
                        handleChange,
                        handleBlur,
                        values,
                        errors,
                        touched,
                        "default",
                        "location-on"
                      )}

                      <View style={styles.mapButtonContainer}>
                        <Text
                          style={[
                            styles.label,
                            { color: theme.colors.textColor },
                          ]}
                        >
                          PIN LOCATION
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.mapButton,
                            {
                              backgroundColor: theme.colors.primary,
                              borderColor: theme.colors.button,
                            },
                          ]}
                          onPress={() => handleOpenMap(values.pin_location)}
                        >
                          <MaterialIcons
                            name="map"
                            size={20}
                            color={theme.colors.button}
                          />
                          <Text
                            style={[
                              styles.mapButtonText,
                              { color: theme.colors.textColor },
                            ]}
                          >
                            {values.pin_location
                              ? "Change Location on Map"
                              : "Select Location on Map"}
                          </Text>
                        </TouchableOpacity>
                        {values.pin_location && (
                          <Text
                            style={[
                              styles.locationText,
                              { color: theme.colors.subInactiveColor },
                            ]}
                          >
                            Location selected at{" "}
                            {values.pin_location.latitude.toFixed(6)},{" "}
                            {values.pin_location.longitude.toFixed(6)}
                          </Text>
                        )}
                      </View>

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
                          contentStyle={{ height: 48 }}
                          labelStyle={{ fontSize: 16 }}
                        >
                          Cancel
                        </Button>
                        <Button
                          mode="contained"
                          onPress={handleSubmit}
                          style={styles.saveButton}
                          buttonColor={theme.colors.button}
                          textColor="white"
                          disabled={!(isValid && dirty)}
                          contentStyle={{ height: 48 }}
                        >
                          Save Address
                        </Button>
                      </View>
                    </>
                  );
                }}
              </Formik>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {mode === "view" && localAddresses?.length > 0 && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.colors.button }]}
            onPress={() => {
              setMode("add");
              // Scroll to top when adding new address
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: 0, animated: true });
              }
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View
            style={[
              styles.loadingContainer,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <ActivityIndicator size="large" color={theme.colors.button} />
            <Text
              style={[styles.loadingText, { color: theme.colors.textColor }]}
            >
              Processing...
            </Text>
          </View>
        </View>
      )}
      {/* Map Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        {/* <MapLocationPicker
          initialLocation={pinLocation}
          onLocationSelect={(location) => {
            handleLocationSelect(location);
            // Update the Formik values
            if (mode === "add" || mode === "edit") {
              const formikBag = scrollViewRef.current?.formikBag;
              if (formikBag) {
                formikBag.setFieldValue("pin_location", location);
              }
            }
          }}
          onCancel={() => setMapModalVisible(false)}
          theme={theme}
        /> */}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  headerButton: {
    marginLeft: 8,
    padding: 8,
  },
  addressList: {
    gap: 16,
  },
  cardTouchable: {
    width: "100%",
    padding: 8,
  },
  fabContainer: {
    position: "absolute",
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  addButton: {
    borderRadius: 12,
    elevation: 2,
  },
  addressCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    marginBottom: 16,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  addressName: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    position: "absolute",
    left: 25,
    top: -12,
  },
  moreButton: {
    padding: 4,
  },

  addressDetails: {
    gap: 12,
    marginTop: 4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  addressText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    flex: 1,
    minHeight: 400,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  formContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    marginTop: 20,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 12,
    elevation: 2,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  mapButtonContainer: {
    marginBottom: 20,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
  },
  mapButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  locationText: {
    fontSize: 12,
    marginTop: 8,
  },
});

export default BillingAddress;
