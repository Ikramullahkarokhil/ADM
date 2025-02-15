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
import { useTheme } from "react-native-paper";
import useProductStore from "../../../components/api/useProductStore";

const BillingAddress = () => {
  const theme = useTheme();
  const [address, setAddress] = useState({
    fullName: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const { profileData } = useProductStore();
  const handleSave = () => {
    // Handle saving the billing address
    console.log("Billing Address Saved:", address);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Billing Address
        </Text>

        {/* Full Name Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Full Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
            placeholder="John Doe"
            placeholderTextColor={theme.colors.placeholder}
            value={address.fullName}
            onChangeText={(text) => setAddress({ ...address, fullName: text })}
          />
        </View>

        {/* Street Address Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Street Address
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
            placeholder="123 Main St"
            placeholderTextColor={theme.colors.placeholder}
            value={address.streetAddress}
            onChangeText={(text) =>
              setAddress({ ...address, streetAddress: text })
            }
          />
        </View>

        {/* City Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>City</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
            placeholder="New York"
            placeholderTextColor={theme.colors.placeholder}
            value={address.city}
            onChangeText={(text) => setAddress({ ...address, city: text })}
          />
        </View>

        {/* State Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            State
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
            placeholder="NY"
            placeholderTextColor={theme.colors.placeholder}
            value={address.state}
            onChangeText={(text) => setAddress({ ...address, state: text })}
          />
        </View>

        {/* Postal Code Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Postal Code
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
            placeholder="10001"
            placeholderTextColor={theme.colors.placeholder}
            value={address.postalCode}
            onChangeText={(text) =>
              setAddress({ ...address, postalCode: text })
            }
          />
        </View>

        {/* Country Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Country
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
            placeholder="United States"
            placeholderTextColor={theme.colors.placeholder}
            value={address.country}
            onChangeText={(text) => setAddress({ ...address, country: text })}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BillingAddress;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    elevation: 2, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});
