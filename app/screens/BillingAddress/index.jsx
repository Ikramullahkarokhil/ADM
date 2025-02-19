import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Button, useTheme } from "react-native-paper";
import useProductStore from "../../../components/api/useProductStore";
import * as Yup from "yup";
import { Formik } from "formik";

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

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Full Name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone: Yup.string().required("Phone is required"),
    address: Yup.string().required("Street Address is required"),
    district_name: Yup.string().required("City is required"),
    province_name: Yup.string().required("State is required"),
    postal_code: Yup.string().required("Postal Code is required"),
    country_name: Yup.string().required("Country is required"),
  });

  const handleSave = async (values) => {
    const billingData = {
      ...values,
      consumer_id: user.consumer_id,
    };
    console.log(
      mode === "add" ? "Adding new address:" : "Updating address:",
      billingData
    );
    try {
      const response = await addBillingAddress(billingData);
      console.log(response);
      setMode("view");
      setSelectedAddress(null);
    } catch (error) {
      console.log(
        "Error:",
        error.response ? error.response.data : error.message
      );
    }
  };

  const handleDelete = async (address) => {
    console.log("Deleting address:", address.consumer_billing_address_id);
    try {
      const response = await deleteBillingAddress({
        consumerID: user.consumer_id,
        billingAddressID: address.consumer_billing_address_id,
      });
      console.log(response);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Billing Addresses
        </Text>

        {mode === "view" ? (
          <>
            {consumerBillingAddress?.map((address) => (
              <View
                key={address.consumer_billing_address_id}
                style={[
                  styles.addressCard,
                  { borderColor: theme.colors.inactiveColor },
                ]}
              >
                <Text style={[styles.text, { color: theme.colors.text }]}>
                  Name: {address.name}
                </Text>
                <Text style={[styles.text, { color: theme.colors.text }]}>
                  Email: {address.email}
                </Text>
                <Text style={[styles.text, { color: theme.colors.text }]}>
                  Phone: {address.phone}
                </Text>
                <Text style={[styles.text, { color: theme.colors.text }]}>
                  Address: {address.address}
                </Text>

                <View style={styles.buttonGroup}>
                  <Button
                    style={[
                      styles.editButton,
                      { borderColor: theme.colors.button },
                    ]}
                    textColor={theme.colors.button}
                    mode="outlined"
                    onPress={() => {
                      setSelectedAddress(address);
                      setMode("edit");
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    textColor={theme.colors.primary}
                    style={[styles.deleteButton]}
                    onPress={() => handleDelete(address)}
                    buttonColor={theme.colors.button}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={styles.button}
              onPress={() => setMode("add")}
            >
              <Text
                style={[styles.buttonText, { color: theme.colors.textColor }]}
              >
                Add New Address
              </Text>
            </TouchableOpacity>
          </>
        ) : (
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
                {Object.keys(values).map((field) => (
                  <View style={styles.inputContainer} key={field}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      {field.replace("_", " ").toUpperCase()}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder={field.replace("_", " ")}
                      placeholderTextColor={theme.colors.placeholder}
                      onChangeText={handleChange(field)}
                      onBlur={handleBlur(field)}
                      value={values[field]}
                      keyboardType={
                        field === "phone" || field === "postal_code"
                          ? "phone-pad"
                          : "default"
                      }
                    />
                    {touched[field] && errors[field] && (
                      <Text style={styles.errorText}>{errors[field]}</Text>
                    )}
                  </View>
                ))}
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setMode("view");
                      setSelectedAddress(null);
                    }}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Formik>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  addressCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 5, padding: 10 },
  errorText: { color: "red", fontSize: 12, marginTop: 5 },
  text: { fontSize: 14, marginBottom: 5 },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 5,
  },
  buttonText: { color: "white", fontSize: 16 },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
    buttonText: { color: "white", fontSize: 16 },
    marginTop: 10,
  },
  editButton: { flex: 1 },
  deleteButton: { flex: 1 },
  saveButton: { backgroundColor: "green", flex: 1, marginRight: 5 },
  cancelButton: { backgroundColor: "gray", flex: 1, marginLeft: 5 },
});

export default BillingAddress;
