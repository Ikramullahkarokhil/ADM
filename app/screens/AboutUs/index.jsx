import React, { useLayoutEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Image,
  Linking,
  TouchableOpacity,
} from "react-native";
import { Surface, Divider, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import useThemeStore from "../../../components/store/useThemeStore";

const AboutUs = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { isDarkTheme } = useThemeStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "About Us",
    });
  }, [navigation]);

  const openLink = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open link:", err)
    );
  };

  const stats = [
    { value: "10,000+", label: "Businesses" },
    { value: "1M+", label: "Customers" },
    { value: "98%", label: "Satisfaction" },
    { value: "24/7", label: "Support" },
  ];

  const features = [
    {
      icon: "shield-check-outline",
      title: "Secure Payments",
      description: "Encrypted transactions for your safety",
    },
    {
      icon: "truck-delivery-outline",
      title: "Nationwide Delivery",
      description: "Fast shipping across Afghanistan",
    },
    {
      icon: "store-outline",
      title: "Local Business Support",
      description: "Empowering Afghan entrepreneurs",
    },
    {
      icon: "headset",
      title: "24/7 Support",
      description: "Dedicated customer service team",
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.primary }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View
          style={[styles.header, { backgroundColor: theme.colors.primary }]}
        >
          <Image
            source={
              isDarkTheme
                ? require("../../../assets/images/lightLogo.png")
                : require("../../../assets/images/darkLogo.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.colors.activeColor }]}>
            Afghanistan Digital Market
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textColor }]}>
            Connecting Businesses and Customers Nationwide
          </Text>
        </View>

        {/* Stats Section */}
        <Surface
          style={[
            styles.statsContainer,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: theme.colors.activeColor }]}
              >
                {stat.value}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.inactiveColor },
                ]}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </Surface>

        {/* About ADM Section */}
        <Surface
          style={[styles.section, { backgroundColor: theme.colors.primary }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="information-outline"
              size={24}
              color={theme.colors.button}
            />
            <Text
              style={[styles.sectionTitle, { color: theme.colors.activeColor }]}
            >
              Our Story
            </Text>
          </View>
          <Divider style={{ marginBottom: 16 }} />
          <Text style={[styles.sectionText, { color: theme.colors.textColor }]}>
            Afghanistan Digital Market (ADM) is the premier e-commerce platform
            in Afghanistan, revolutionizing the way people shop and businesses
            operate since 2023.
          </Text>
          <Text
            style={[
              styles.sectionText,
              { marginTop: 12, color: theme.colors.textColor },
            ]}
          >
            Born from a vision to digitize Afghanistan's economy, ADM has grown
            to become the largest online marketplace in the country, supporting
            thousands of merchants and serving millions of customers with
            innovative solutions tailored for the Afghan market.
          </Text>
        </Surface>

        {/* Mission Section */}
        <Surface
          style={[styles.section, { backgroundColor: theme.colors.primary }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="target"
              size={24}
              color={theme.colors.button}
            />
            <Text
              style={[styles.sectionTitle, { color: theme.colors.activeColor }]}
            >
              Our Mission
            </Text>
          </View>
          <Divider style={{ marginBottom: 16 }} />
          <Text style={[styles.sectionText, { color: theme.colors.textColor }]}>
            To empower Afghan businesses and consumers through technology,
            creating a seamless digital marketplace that drives economic growth
            and connects communities across the nation.
          </Text>
        </Surface>

        {/* Features Section */}
        <Surface
          style={[styles.section, { backgroundColor: theme.colors.primary }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="feature-search-outline"
              size={24}
              color={theme.colors.button}
            />
            <Text
              style={[styles.sectionTitle, { color: theme.colors.activeColor }]}
            >
              Why Choose ADM?
            </Text>
          </View>
          <Divider style={{ marginBottom: 16 }} />
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureCard,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    { backgroundColor: theme.colors.button + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={feature.icon}
                    size={28}
                    color={theme.colors.button}
                  />
                </View>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: theme.colors.textColor },
                  ]}
                >
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
            ))}
          </View>
        </Surface>

        {/* Contact Section */}
        <Surface
          style={[styles.section, { backgroundColor: theme.colors.primary }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="chat-processing-outline"
              size={24}
              color={theme.colors.button}
            />
            <Text
              style={[styles.sectionTitle, { color: theme.colors.activeColor }]}
            >
              Get In Touch
            </Text>
          </View>
          <Divider style={{ marginBottom: 16 }} />
          <Text
            style={[
              styles.sectionText,
              { marginBottom: 16, color: theme.colors.textColor },
            ]}
          >
            We'd love to hear from you! Reach out for support, partnerships, or
            just to say hello.
          </Text>

          <View style={styles.contactButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.contactButton,
                { backgroundColor: theme.colors.button },
              ]}
              onPress={() => openLink("https://afgdigitalmarket.com")}
            >
              <MaterialCommunityIcons
                name="web"
                size={20}
                color={theme.colors.buttonText}
              />
              <Text
                style={[
                  styles.contactButtonText,
                  { color: theme.colors.buttonText },
                ]}
              >
                Visit Our Website
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.contactButton,
                { backgroundColor: theme.colors.button },
              ]}
              onPress={() => openLink("mailto:info@afgdigitalmarket.com")}
            >
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={theme.colors.buttonText}
              />
              <Text
                style={[
                  styles.contactButtonText,
                  { color: theme.colors.buttonText },
                ]}
              >
                Email Us
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.contactButton,
                { backgroundColor: theme.colors.button },
              ]}
              onPress={() => openLink("tel:+93799999999")}
            >
              <MaterialCommunityIcons
                name="phone-outline"
                size={20}
                color={theme.colors.buttonText}
              />
              <Text
                style={[
                  styles.contactButtonText,
                  { color: theme.colors.buttonText },
                ]}
              >
                Call Support
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>

        {/* Social Media */}
        <View style={styles.socialContainer}>
          <Text
            style={[styles.socialTitle, { color: theme.colors.inactiveColor }]}
          >
            Follow Us
          </Text>
          <View style={styles.socialIcons}>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => openLink("https://facebook.com/adm")}
            >
              <MaterialCommunityIcons
                name="facebook"
                size={28}
                color="#1877F2"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => openLink("https://twitter.com/adm")}
            >
              <MaterialCommunityIcons
                name="twitter"
                size={28}
                color="#1DA1F2"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => openLink("https://instagram.com/adm")}
            >
              <MaterialCommunityIcons
                name="instagram"
                size={28}
                color="#E1306C"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => openLink("https://linkedin.com/company/adm")}
            >
              <MaterialCommunityIcons
                name="linkedin"
                size={28}
                color="#0077B5"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.footer}>
          <Text
            style={[styles.versionText, { color: theme.colors.inactiveColor }]}
          >
            ADM Mobile App v1.0.0
          </Text>
          <Text
            style={[
              styles.copyrightText,
              { color: theme.colors.inactiveColor },
            ]}
          >
            © {new Date().getFullYear()} Afghanistan Digital Market. All rights
            reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    elevation: 3,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  scrollContainer: {
    paddingBottom: 32,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    width: "48%",
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: "center",
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  contactButtonsContainer: {
    marginTop: 8,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
    marginBottom: 12,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
  },
  socialContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  socialTitle: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: "500",
  },
  socialIcons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  socialIcon: {
    marginHorizontal: 12,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
    marginHorizontal: 16,
  },
  versionText: {
    textAlign: "center",
    fontSize: 13,
    marginBottom: 4,
  },
  copyrightText: {
    textAlign: "center",
    fontSize: 12,
  },
});

export default AboutUs;
