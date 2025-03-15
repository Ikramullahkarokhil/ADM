import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React from "react";
import { useTheme } from "react-native-paper";

const TermsModal = ({ onAccept, onDecline }) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={[styles.modal, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.title, { color: theme.colors.textColor }]}>
          Welcome to Our App!
        </Text>

        <ScrollView style={styles.content}>
          <Text style={[styles.paragraph, { color: theme.colors.textColor }]}>
            Before continuing, please read and agree to our Terms of Service and
            Privacy Policy.
          </Text>

          <Text style={[styles.paragraph, { color: theme.colors.textColor }]}>
            By using this app, you agree to our collection and use of your
            information as described in these documents. Our Terms outline your
            rights and responsibilities when using our services, and our Privacy
            Policy explains how we protect and handle your personal data.
          </Text>

          <Text style={[styles.paragraph, { color: theme.colors.textColor }]}>
            Please take a moment to review these important documents:
          </Text>

          <TouchableOpacity>
            <Text style={[styles.link, { color: theme.colors.button }]}>
              View Terms of Service
            </Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={[styles.link, { color: theme.colors.button }]}>
              View Privacy Policy
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.declineButton,
              {
                borderColor: theme.colors.button,
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={onDecline}
          >
            <Text style={[styles.declineText, { color: theme.colors.button }]}>
              Decline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptButton,
              { backgroundColor: theme.colors.button },
            ]}
            onPress={onAccept}
          >
            <Text style={[styles.acceptText, { color: "white" }]}>Accept</Text>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 25,
    width: "100%",
    maxHeight: "80%",
    elevation: 20,
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
