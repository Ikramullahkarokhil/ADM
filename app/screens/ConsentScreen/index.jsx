import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React from "react";

const TermsModal = ({ onAccept, onDecline }) => {
  return (
    <View style={styles.container}>
      <View style={styles.modal}>
        <Text style={styles.title}>Welcome to Our App!</Text>

        <ScrollView style={styles.content}>
          <Text style={styles.paragraph}>
            Before continuing, please read and agree to our Terms of Service and
            Privacy Policy.
          </Text>

          <Text style={styles.paragraph}>
            By using this app, you agree to our collection and use of your
            information as described in these documents. Our Terms outline your
            rights and responsibilities when using our services, and our Privacy
            Policy explains how we protect and handle your personal data.
          </Text>

          <Text style={styles.paragraph}>
            Please take a moment to review these important documents:
          </Text>

          <TouchableOpacity>
            <Text style={styles.link}>View Terms of Service</Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={styles.link}>View Privacy Policy</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TermsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 25,
    width: "100%",
    maxHeight: "80%",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  content: {
    marginVertical: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666",
    marginBottom: 15,
  },
  link: {
    color: "#007AFF",
    fontSize: 16,
    marginVertical: 8,
    textDecorationLine: "underline",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  acceptButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  acceptText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  declineButton: {
    borderColor: "#007AFF",
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  declineText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
