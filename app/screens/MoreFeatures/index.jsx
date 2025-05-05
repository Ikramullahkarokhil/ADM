import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "react-native-paper";

const features = [
  {
    id: 2,
    title: "Personalized Recommendations",
    description: "Get recommendations based on your preferences",
    icon: "lightbulb-on-outline",
    iconType: "MaterialCommunityIcons",
  },
  {
    id: 3,
    title: "AR Product Preview",
    description: "View products in your space using augmented reality",
    icon: "cube",
    iconType: "FontAwesome5",
  },
  {
    id: 4,
    title: "Loyalty Program",
    description: "Earn points with every purchase",
    icon: "award",
    iconType: "Feather",
  },
  {
    id: 5,
    title: "One-Click Checkout",
    description: "Faster checkout with saved payment methods",
    icon: "flash",
    iconType: "Ionicons",
  },
  {
    id: 6,
    title: "Live Support",
    description: "24/7 customer support via chat",
    icon: "headset",
    iconType: "MaterialIcons",
  },
];

const FeatureCard = ({ feature, theme }) => {
  const getIconComponent = () => {
    switch (feature.iconType) {
      case "Ionicons":
        return (
          <Ionicons name={feature.icon} size={28} color={theme.colors.button} />
        );
      case "MaterialCommunityIcons":
        return (
          <MaterialCommunityIcons
            name={feature.icon}
            size={28}
            color={theme.colors.button}
          />
        );
      case "FontAwesome5":
        return (
          <FontAwesome5
            name={feature.icon}
            size={28}
            color={theme.colors.button}
          />
        );
      case "MaterialIcons":
        return (
          <MaterialIcons
            name={feature.icon}
            size={28}
            color={theme.colors.button}
          />
        );
      case "Feather":
        return (
          <Feather name={feature.icon} size={28} color={theme.colors.button} />
        );
      default:
        return (
          <Ionicons name={feature.icon} size={28} color={theme.colors.button} />
        );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.featureCard,
        {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.subInactiveColor,
        },
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>{getIconComponent()}</View>
      <View style={styles.textContainer}>
        <Text style={[styles.featureTitle, { color: theme.colors.textColor }]}>
          {feature.title}
        </Text>
        <Text
          style={[
            styles.featureDescription,
            { color: theme.colors.inactiveColor },
          ]}
        >
          {feature.description}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.inactiveColor}
      />
    </TouchableOpacity>
  );
};

const Index = () => {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
      contentContainerStyle={styles.scrollContainer}
    >
      <View style={styles.header}>
        <Ionicons
          name="time-outline"
          size={48}
          color={theme.colors.button}
          style={styles.headerIcon}
        />
        <Text style={[styles.headerText, { color: theme.colors.textColor }]}>
          Exciting Features Coming Soon!
        </Text>
        <Text
          style={[styles.subHeaderText, { color: theme.colors.inactiveColor }]}
        >
          We're working hard to bring you these amazing features
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} theme={theme} />
        ))}
      </View>

      <View style={styles.footer}>
        <Text
          style={[styles.footerText, { color: theme.colors.inactiveColor }]}
        >
          Stay tuned for updates!
        </Text>
      </View>
    </ScrollView>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  header: {
    alignItems: "center",
    padding: 24,
    paddingBottom: 16,
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  subHeaderText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  featuresContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    backgroundColor: "rgba(1, 190, 98, 0.1)", // button color with 10% opacity
  },
  textContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 14,
    textAlign: "center",
  },
});
