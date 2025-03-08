"use client";

import { useLayoutEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
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
  } = useProductStore();
  const [mode, setMode] = useState("view"); // 'view', 'add', 'edit'
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          {mode === "view" && (
            <Button
              mode="contained"
              onPress={() => setMode("add")}
              icon="plus"
              buttonColor={theme.colors.button}
              textColor="white"
              style={styles.addButton}
            >
              Add New
            </Button>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : mode === "view" ? (
          <>
            {consumerBillingAddress?.length > 0 ? (
              consumerBillingAddress.map((address) => (
                <View
                  key={address.consumer_billing_address_id}
                  style={[
                    styles.addressCard,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <View style={styles.addressHeader}>
                    <Text
                      style={[
                        styles.addressName,
                        { color: theme.colors.textColor },
                      ]}
                    >
                      {address.name}
                    </Text>
                    <View style={styles.actionButtons}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => {
                          setSelectedAddress(address);
                          setMode("edit");
                        }}
                        iconColor={theme.colors.button}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={theme.colors.deleteButton}
                        onPress={() => handleDelete(address)}
                      />
                    </View>
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
                </View>
              ))
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
                    { color: theme.colors.textColor },
                  ]}
                >
                  Add a new billing address to get started
                </Text>
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
  },
  header: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  addButton: {
    borderRadius: 8,
  },
  addressCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressName: {
    fontSize: 18,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
  },
  divider: {
    marginVertical: 12,
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
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
  },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default BillingAddress;
