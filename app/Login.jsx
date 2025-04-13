import React, { useState, useCallback, useEffect, memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ToastAndroid,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import useProductStore from "../components/api/useProductStore";
import { Link, useRouter } from "expo-router";
import { Button, useTheme } from "react-native-paper";
import useThemeStore from "../components/store/useThemeStore";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

const loginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Too Short!").required("Required"),
});

// Memoized FormikInput component
const FormikInput = memo(
  ({ fieldName, theme, secureTextEntry, toggleSecure, ...props }) => {
    const [field, meta, helpers] = useField(fieldName);

    const handleChange = useCallback(
      (text) => {
        helpers.setValue(text);
      },
      [helpers]
    );

    const handleBlur = useCallback(() => {
      helpers.setTouched(true);
    }, [helpers]);

    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            value={field.value}
            onChangeText={handleChange}
            onBlur={handleBlur}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.primary,
                color: theme.colors.textColor,
                borderColor: theme.colors.subInactiveColor,
              },
              meta.touched && meta.error && styles.errorInput,
            ]}
            placeholderTextColor={theme.colors.inactiveColor}
            secureTextEntry={secureTextEntry}
            {...props}
          />
          {fieldName === "password" && (
            <TouchableOpacity onPress={toggleSecure} style={styles.eyeIcon}>
              <Text style={{ color: theme.colors.textColor }}>
                {secureTextEntry ? "👁️" : "👁️‍🗨️"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {meta.touched && meta.error && (
          <Text
            style={[styles.errorText, { color: theme.colors.deleteButton }]}
          >
            {meta.error}
          </Text>
        )}
      </View>
    );
  }
);

const Login = () => {
  const router = useRouter();
  const { loginUser, loginLoading, loginError, user, isAuthenticated } =
    useProductStore();
  const theme = useTheme();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const { isDarkTheme } = useThemeStore();
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);

  // Check authentication status and biometric preference
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Check if user is already authenticated
      if (isAuthenticated) {
        const savedPreference = await AsyncStorage.getItem(
          "biometricAuthEnabled"
        );
        const isEnabled = savedPreference === "true";

        if (isEnabled) {
          setIsBiometricEnabled(true);
          setShowLoginForm(false); // Hide login form initially
          handleBiometricAuth(); // Trigger biometric auth immediately
        } else {
          // If authenticated but biometric not enabled, go to main app
          router.navigate("(tabs)");
        }
      } else {
        // Check biometric support for login page
        const compatible = await LocalAuthentication.hasHardwareAsync();
        setIsBiometricSupported(compatible);

        const savedPreference = await AsyncStorage.getItem(
          "biometricAuthEnabled"
        );
        if (savedPreference !== null) {
          setIsBiometricEnabled(savedPreference === "true");
        }
      }
    };

    checkAuthStatus();
  }, [isAuthenticated]);

  const handleBiometricAuth = useCallback(async () => {
    if (!isBiometricSupported) return;

    try {
      setIsBiometricLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify your identity",
        cancelLabel: "Use password instead",
      });

      if (result.success) {
        // Successful authentication - proceed to app
        router.navigate("(tabs)");
      } else {
        // Failed or canceled - show login form
        setShowLoginForm(true);
        if (result.error !== "user_cancel") {
          ToastAndroid.show("Authentication failed", ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      console.error("Biometric auth error:", error);
      setShowLoginForm(true);
    } finally {
      setIsBiometricLoading(false);
    }
  }, [isBiometricSupported, router]);

  const handleLogin = useCallback(
    async (values) => {
      try {
        await loginUser(values);
        router.navigate("(tabs)");
      } catch (error) {
        console.error("Login Error:", error);
      }
    },
    [loginUser, router]
  );

  const toggleSecure = useCallback(() => {
    setSecureTextEntry((prev) => !prev);
  }, []);

  // Show loading state while checking auth status
  if (isAuthenticated && isBiometricEnabled && !showLoginForm) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.primary }]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.button}
          style={styles.loader}
        />
        <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
          Verifying your identity...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={
              !isDarkTheme
                ? require("../assets/images/darkLogo.png")
                : require("../assets/images/lightLogo.png")
            }
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="App Logo"
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.textColor }]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.inactiveColor }]}>
          {isAuthenticated ? "Verify your identity" : "Sign in to your account"}
        </Text>

        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={loginSchema}
          onSubmit={handleLogin}
        >
          {({ handleSubmit }) => (
            <View
              style={[
                styles.form,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.subInactiveColor,
                },
              ]}
            >
              {showLoginForm && (
                <>
                  <FormikInput
                    fieldName="email"
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    theme={theme}
                    accessibilityLabel="Email input"
                  />
                  <FormikInput
                    fieldName="password"
                    placeholder="Password"
                    secureTextEntry={secureTextEntry}
                    toggleSecure={toggleSecure}
                    autoCapitalize="none"
                    theme={theme}
                    accessibilityLabel="Password input"
                  />
                </>
              )}

              {loginError && (
                <Text
                  style={[styles.error, { color: theme.colors.deleteButton }]}
                >
                  {loginError}
                </Text>
              )}

              {showLoginForm ? (
                <>
                  <Button
                    textColor={theme.colors.primary}
                    buttonColor={theme.colors.button}
                    style={styles.button}
                    loading={loginLoading}
                    accessibilityLabel="Sign in button"
                    onPress={handleSubmit}
                  >
                    Sign In
                  </Button>

                  {isBiometricSupported && (
                    <Button
                      mode="outlined"
                      style={styles.biometricButton}
                      icon="fingerprint"
                      loading={isBiometricLoading}
                      onPress={handleBiometricAuth}
                      textColor={theme.colors.button}
                      accessibilityLabel="Sign in with fingerprint"
                    >
                      Use Fingerprint Instead
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  mode="outlined"
                  style={styles.biometricButton}
                  icon="fingerprint"
                  loading={isBiometricLoading}
                  onPress={handleBiometricAuth}
                  textColor={theme.colors.button}
                  accessibilityLabel="Verify with fingerprint"
                >
                  Verify with Fingerprint
                </Button>
              )}

              <View style={styles.footer}>
                {!isAuthenticated && (
                  <Link href="/screens/Signup" asChild>
                    <Pressable style={{ flexDirection: "row" }}>
                      <Text
                        style={[styles.link, { color: theme.colors.textColor }]}
                      >
                        Don't have an account?{" "}
                      </Text>
                      <Text
                        style={[styles.link, { color: theme.colors.button }]}
                      >
                        Sign Up
                      </Text>
                    </Pressable>
                  </Link>
                )}
                <Link href="(tabs)" asChild>
                  <Button
                    mode="text"
                    textColor={theme.colors.button}
                    style={styles.skipButton}
                  >
                    {isAuthenticated ? "Use Password Instead" : "Skip"}
                  </Button>
                </Link>
              </View>
            </View>
          )}
        </Formik>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logo: {
    width: 180,
    height: 60,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    opacity: 0.8,
  },
  form: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  eyeIcon: {
    position: "absolute",
    right: 20,
  },
  errorInput: {
    borderColor: "red",
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  biometricButton: {
    borderRadius: 12,
    paddingVertical: 10,
    borderColor: "#6200ee",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  error: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  footer: {
    marginTop: 28,
    alignItems: "center",
    gap: 16,
  },
  link: {
    fontSize: 14,
  },
  skipButton: {
    paddingHorizontal: 0,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
});

export default memo(Login);
