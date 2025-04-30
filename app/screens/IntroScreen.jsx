import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
  TouchableOpacity,
} from "react-native";
import { Button } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  withSequence,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useThemeStore from "../../components/store/useThemeStore";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");
const AnimatedButton = Animated.createAnimatedComponent(Button);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IntroScreen = ({ theme, onComplete, startAtConsent = false }) => {
  const [currentStep, setCurrentStep] = useState(startAtConsent ? 2 : 0);
  const totalSteps = 3;
  const { isDarkTheme } = useThemeStore();

  // Animation values
  const contentOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const contentTranslateY = useSharedValue(20);

  // Set up animations when step changes
  useEffect(() => {
    // Reset animations on step change
    contentOpacity.value = 0;
    buttonOpacity.value = 0;
    contentTranslateY.value = 20;

    // Animate in with slight delay
    setTimeout(() => {
      // Fade in and slide up for content
      contentOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      contentTranslateY.value = withTiming(0, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      // Slightly delayed fade in for button
      buttonOpacity.value = withDelay(
        400,
        withTiming(1, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );
    }, 100);
  }, [currentStep]);

  // Content animation style
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: contentTranslateY.value }],
    };
  });

  // Button animation style
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Button press handler with animation
  const handleButtonPress = useCallback(() => {
    // Animate button scale down and up
    buttonScale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    // Move to next step with slight delay for animation
    setTimeout(() => setCurrentStep((prev) => prev + 1), 200);
  }, []);

  const handlePreviousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  // Handle terms acceptance
  const handleAccept = useCallback(() => {
    buttonScale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    setTimeout(() => onComplete(), 200);
  }, [onComplete]);

  // Handle terms decline
  const handleDecline = useCallback(() => {
    setCurrentStep(0);
  }, []);

  // Loading fallback
  const LoadingFallback = (
    <View
      style={[
        styles.loadingContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  // Progress indicator component
  const ProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            {
              backgroundColor:
                index === currentStep
                  ? theme.colors.button
                  : theme.colors.button + "30",
              width: index === currentStep ? 18 : 6,
              height: index === currentStep ? 6 : 6,
            },
          ]}
        />
      ))}
    </View>
  );

  // Back button for navigation
  const BackButton = () => {
    if (currentStep === 0) return null;

    return (
      <TouchableOpacity
        style={[styles.backButton]}
        onPress={handlePreviousStep}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={theme.colors.button}
        />
      </TouchableOpacity>
    );
  };

  // Render the appropriate screen based on current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Intro Screen
        return (
          <View
            style={[
              styles.container,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <StatusBar style={isDarkTheme ? "light" : "dark"} />

            <BackButton />
            <ProgressIndicator />

            <Animated.View style={[styles.content, contentAnimatedStyle]}>
              <Image
                source={
                  isDarkTheme
                    ? require("../../assets/images/lightLogo.png")
                    : require("../../assets/images/darkLogo.png")
                }
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={[styles.title, { color: theme.colors.textColor }]}>
                Welcome to ADM
              </Text>

              <Text
                style={[
                  styles.description,
                  { color: theme.colors.textColor + "99" },
                ]}
              >
                Your one-stop solution for shopping with a seamless experience
                and wide range of products delivered to your doorstep.
              </Text>
            </Animated.View>

            <Animated.View
              style={[styles.buttonContainer, buttonAnimatedStyle]}
            >
              <AnimatedPressable
                onPress={handleButtonPress}
                style={({ pressed }) => [
                  styles.buttonWrapper,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Button
                  mode="contained"
                  style={[
                    styles.button,
                    { backgroundColor: theme.colors.button },
                  ]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[
                    styles.buttonLabel,
                    { color: theme.colors.buttonText },
                  ]}
                  onPress={handleButtonPress}
                >
                  Get Started
                </Button>
              </AnimatedPressable>
            </Animated.View>
          </View>
        );

      case 1: // Features Screen
        return (
          <View
            style={[
              styles.container,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <BackButton />
            <ProgressIndicator />
            <FeaturesView
              theme={theme}
              onNext={handleButtonPress}
              contentOpacity={contentOpacity}
              buttonOpacity={buttonOpacity}
              contentTranslateY={contentTranslateY}
            />
          </View>
        );

      case 2: // Consent Screen
        return (
          <View
            style={[
              styles.container,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <StatusBar
              translucent
              backgroundColor="transparent"
              barStyle={theme.dark ? "light-content" : "dark-content"}
            />
            <BackButton />
            <ProgressIndicator />
            <ConsentView
              theme={theme}
              onAccept={handleAccept}
              onDecline={handleDecline}
              contentOpacity={contentOpacity}
              buttonOpacity={buttonOpacity}
              contentTranslateY={contentTranslateY}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return renderCurrentStep();
};

// Simplified Features view (moved from FeaturesScreen.jsx)
const FeaturesView = ({
  theme,
  onNext,
  contentOpacity,
  buttonOpacity,
  contentTranslateY,
}) => {
  const features = [
    {
      icon: "cart-outline",
      title: "Easy Shopping",
      description: "Browse and purchase items with just a few taps",
    },
    {
      icon: "truck-fast-outline",
      title: "Fast Delivery",
      description: "Get your orders delivered quickly to your doorstep",
    },
    {
      icon: "bell-outline",
      title: "Smart Notifications",
      description: "Stay updated with order status and offers",
    },
    {
      icon: "shield-check-outline",
      title: "Secure Payments",
      description: "Multiple secure payment options for convenience",
    },
    {
      icon: "star-outline",
      title: "Reviews & Ratings",
      description: "Make better decisions with user ratings",
    },
  ];

  // Content animation
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: contentTranslateY.value }],
    };
  });

  // Button animation
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
    };
  });

  return (
    <View style={styles.featuresMainContainer}>
      <Animated.View style={[styles.featuresContent, contentAnimatedStyle]}>
        <Text style={[styles.featuresTitle, { color: theme.colors.textColor }]}>
          App Features
        </Text>

        <Text
          style={[
            styles.featuresSubtitle,
            { color: theme.colors.textColor + "99" },
          ]}
        >
          Discover what our app can do for you
        </Text>

        <ScrollView
          style={styles.featuresScrollView}
          contentContainerStyle={styles.featuresScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {features.map((feature, index) => (
            <Animated.View
              entering={FadeIn.delay(200 + index * 100).duration(400)}
              style={[
                styles.featureItem,
                { backgroundColor: theme.colors.background },
              ]}
              key={index}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.primary + "15" },
                ]}
              >
                <MaterialCommunityIcons
                  name={feature.icon}
                  size={24}
                  color={theme.colors.button}
                />
              </View>
              <View style={styles.featureTextContainer}>
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
                    { color: theme.colors.textColor + "99" },
                  ]}
                >
                  {feature.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[
          styles.bottomButtonContainer,
          buttonAnimatedStyle,
          {
            backgroundColor: theme.colors.primary,
            borderTopColor: theme.colors.inactiveColor + "20",
          },
        ]}
      >
        <Button
          mode="contained"
          style={[
            styles.featuresButton,
            { backgroundColor: theme.colors.button },
          ]}
          contentStyle={styles.buttonContent}
          labelStyle={[styles.buttonLabel, { color: theme.colors.buttonText }]}
          onPress={onNext}
        >
          Continue
        </Button>
      </Animated.View>
    </View>
  );
};

// Consent view (moved from ConsentScreen/index.jsx)
const ConsentView = ({
  theme,
  onAccept,
  onDecline,
  contentOpacity,
  buttonOpacity,
  contentTranslateY,
}) => {
  const [loading, setLoading] = useState(false);

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handlePrivacyLink = useCallback(() => {
    Linking.openURL("https://www.example.com/privacy").catch((err) =>
      console.error("Failed to open privacy policy:", err)
    );
  }, []);

  const handleTermsLink = useCallback(() => {
    Linking.openURL("https://www.example.com/terms").catch((err) =>
      console.error("Failed to open terms:", err)
    );
  }, []);

  const handleAcceptPress = useCallback(async () => {
    setLoading(true);
    try {
      await onAccept();
    } catch (error) {
      console.error("Error accepting terms:", error);
    } finally {
      setLoading(false);
    }
  }, [onAccept]);

  return (
    <View style={styles.consentMainContainer}>
      <Animated.View style={[styles.consentContent, contentAnimStyle]}>
        <Text style={[styles.consentTitle, { color: theme.colors.textColor }]}>
          Terms & Conditions
        </Text>

        <ScrollView
          style={styles.consentScrollView}
          contentContainerStyle={styles.termsContent}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[styles.termsText, { color: theme.colors.textColor + "99" }]}
          >
            Welcome to ADM! Before you start using our app, please take a moment
            to read and accept our terms and conditions.
          </Text>

          <Text
            style={[
              styles.termsSectionTitle,
              { color: theme.colors.textColor },
            ]}
          >
            1. Acceptance of Terms
          </Text>
          <Text
            style={[styles.termsText, { color: theme.colors.textColor + "99" }]}
          >
            By using our application, you agree to be bound by these Terms of
            Service and all applicable laws and regulations. If you do not agree
            with any of these terms, you are prohibited from using this
            application.
          </Text>

          <Text
            style={[
              styles.termsSectionTitle,
              { color: theme.colors.textColor },
            ]}
          >
            2. Privacy Policy
          </Text>
          <Text
            style={[styles.termsText, { color: theme.colors.textColor + "99" }]}
          >
            Your use of our application is also subject to our Privacy Policy,
            which outlines how we collect, use, and protect your personal
            information.
          </Text>

          <Text
            style={[
              styles.termsSectionTitle,
              { color: theme.colors.textColor },
            ]}
          >
            3. User Account
          </Text>
          <Text
            style={[styles.termsText, { color: theme.colors.textColor + "99" }]}
          >
            You are responsible for maintaining the confidentiality of your
            account information and for all activities that occur under your
            account.
          </Text>

          <Text
            style={[
              styles.termsSectionTitle,
              { color: theme.colors.textColor },
            ]}
          >
            4. Product Information and Pricing
          </Text>
          <Text
            style={[styles.termsText, { color: theme.colors.textColor + "99" }]}
          >
            We strive to provide accurate product information, but we do not
            warrant that product descriptions or other content is accurate,
            complete, reliable, current, or error-free.
          </Text>

          <Text
            style={[
              styles.termsSectionTitle,
              { color: theme.colors.textColor },
            ]}
          >
            5. Payments and Orders
          </Text>
          <Text
            style={[styles.termsText, { color: theme.colors.textColor + "99" }]}
          >
            All payments are processed securely. By placing an order, you agree
            to pay the specified amount and provide accurate billing
            information.
          </Text>

          <View style={styles.linkContainer}>
            <Text
              style={[styles.linkText, { color: theme.colors.button }]}
              onPress={handlePrivacyLink}
            >
              Privacy Policy
            </Text>
            <Text
              style={[
                styles.separatorText,
                { color: theme.colors.textColor + "60" },
              ]}
            >
              •
            </Text>
            <Text
              style={[styles.linkText, { color: theme.colors.button }]}
              onPress={handleTermsLink}
            >
              Full Terms of Service
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[
          styles.consentButtonContainer,
          buttonsAnimStyle,
          {
            backgroundColor: theme.colors.primary,
            borderTopColor: theme.colors.inactiveColor + "20",
            borderTopWidth: 1,
          },
        ]}
      >
        <Button
          mode="outlined"
          style={[
            styles.declineButton,
            { borderColor: theme.colors.deleteButton },
          ]}
          labelStyle={[
            styles.declineButtonLabel,
            { color: theme.colors.deleteButton },
          ]}
          onPress={onDecline}
          disabled={loading}
        >
          Decline
        </Button>
        <Button
          mode="contained"
          style={[
            styles.acceptButton,
            { backgroundColor: theme.colors.button },
          ]}
          labelStyle={[
            styles.acceptButtonLabel,
            { color: theme.colors.buttonText },
          ]}
          onPress={handleAcceptPress}
          loading={loading}
          disabled={loading}
        >
          Accept
        </Button>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 12,
    letterSpacing: 0.1,
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  buttonWrapper: {
    width: "100%",
  },
  button: {
    width: "100%",
    borderRadius: 8,
    elevation: 0,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "none",
    letterSpacing: 0.2,
  },

  // Features View styles
  featuresMainContainer: {
    flex: 1,
  },
  featuresContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  featuresTitle: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  featuresSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 0.1,
  },
  featuresScrollView: {
    flex: 1,
  },
  featuresScrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  featuresButton: {
    width: "100%",
    borderRadius: 8,
    elevation: 0,
  },

  // Consent View styles
  consentMainContainer: {
    flex: 1,
  },
  consentContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 80,
  },
  consentTitle: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  consentScrollView: {
    flex: 1,
    marginTop: 10,
  },
  termsContent: {
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  termsText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    letterSpacing: 0.1,
  },
  termsSectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 15,
    letterSpacing: 0.1,
  },
  separatorText: {
    marginHorizontal: 8,
  },
  consentButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    flexDirection: "row",
  },
  declineButton: {
    flex: 1,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  acceptButton: {
    flex: 1.5,
    borderRadius: 8,
    elevation: 0,
  },
  declineButtonLabel: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "none",
    letterSpacing: 0.1,
  },
  acceptButtonLabel: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "none",
    letterSpacing: 0.1,
  },

  // Progress indicator styles
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressDot: {
    borderRadius: 3,
    marginHorizontal: 3,
  },

  // Back button
  backButton: {
    position: "absolute",
    top: 48,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default IntroScreen;
