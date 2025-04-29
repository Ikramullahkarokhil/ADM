import { useState, useCallback, useEffect, memo } from "react";
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
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import { Link, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import useProductStore from "../components/api/useProductStore";
import useThemeStore from "../components/store/useThemeStore";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Complete any lingering authentication sessions
WebBrowser.maybeCompleteAuthSession();

// Schema for login form validation
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

// Memoized FormikInput component for form fields
const FormikInput = memo(
  ({ fieldName, colors, secureTextEntry, toggleSecure, icon, ...props }) => {
    const [field, meta, helpers] = useField(fieldName);
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = useCallback(
      (text) => {
        helpers.setValue(text);
      },
      [helpers]
    );

    const handleBlur = useCallback(() => {
      helpers.setTouched(true);
      setIsFocused(false);
    }, [helpers]);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    return (
      <View style={styles.inputContainer}>
        <View
          style={[
            styles.inputWrapper,
            {
              borderColor: isFocused
                ? colors.button
                : meta.touched && meta.error
                ? colors.deleteButton
                : colors.subInactiveColor,
              backgroundColor:
                Platform.OS === "ios"
                  ? colors.primary
                  : `${colors.background}90`,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={isFocused ? colors.button : colors.inactiveColor}
            style={styles.inputIcon}
          />
          <TextInput
            value={field.value}
            onChangeText={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            style={[
              styles.input,
              {
                color: colors.textColor,
              },
            ]}
            placeholderTextColor={colors.inactiveColor}
            secureTextEntry={secureTextEntry}
            {...props}
          />
          {fieldName === "password" && (
            <TouchableOpacity onPress={toggleSecure} style={styles.eyeIcon}>
              <MaterialCommunityIcons
                name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={colors.inactiveColor}
              />
            </TouchableOpacity>
          )}
        </View>
        {meta.touched && meta.error && (
          <Text style={[styles.errorText, { color: colors.deleteButton }]}>
            {meta.error}
          </Text>
        )}
      </View>
    );
  }
);

const Login = () => {
  const router = useRouter();
  const { loginUser, loginLoading, loginError } = useProductStore();
  const theme = useTheme();
  const { isDarkTheme } = useThemeStore();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const redirectUri = makeRedirectUri();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:
      "471117594700-86hee82eto1lukhq4sq0v81thv6bodbu.apps.googleusercontent.com",
    androidClientId:
      "471117594700-p0gv2s89o7d13tvtlsfj7ru17d8cf0a9.apps.googleusercontent.com",
    redirectUri: redirectUri,
  });

  useEffect(() => {
    if (response?.type === "success") {
      setGoogleAuthInProgress(false);
      const { access_token } = response.params;
      handleGoogleLogin(access_token);
    } else if (response?.type === "error") {
      setGoogleAuthInProgress(false);
      console.error("Google sign in error:", response.error);
    } else if (response?.type === "dismiss") {
      setGoogleAuthInProgress(false);
      console.log("Google sign in dismissed by user");
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken) => {
    try {
      setSubmitting(true);
      // Wait a moment to simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Navigate to the main app
      router.navigate("(tabs)");
    } catch (error) {
      console.error("Google Login Error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = useCallback(
    async (values) => {
      try {
        setSubmitting(true);
        await loginUser(values);
        router.navigate("(tabs)");
      } catch (error) {
        console.error("Login Error:", error);
      } finally {
        setSubmitting(false);
      }
    },
    [loginUser, router]
  );

  const toggleSecure = useCallback(() => {
    setSecureTextEntry((prev) => !prev);
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setGoogleAuthInProgress(true);
      await promptAsync({
        useProxy: Platform.OS === "web",
        showInRecents: true,
      });
    } catch (error) {
      setGoogleAuthInProgress(false);
      console.error("Error starting Google auth:", error);
    }
  }, [promptAsync]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar
        barStyle={isDarkTheme ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.backgroundElements}>
        <View
          style={[
            styles.circle1,
            { backgroundColor: "rgba(66, 133, 244, 0.08)" },
          ]}
        />
        <View
          style={[
            styles.circle2,
            { backgroundColor: "rgba(52, 168, 83, 0.05)" },
          ]}
        />
        <View
          style={[
            styles.circle3,
            { backgroundColor: "rgba(234, 67, 53, 0.07)" },
          ]}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={
              isDarkTheme
                ? require("../assets/images/lightLogo.png")
                : require("../assets/images/darkLogo.png")
            }
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="App Logo"
          />
        </View>

        <Text style={[styles.title, { color: colors.textColor }]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: colors.inactiveColor }]}>
          Sign in to continue
        </Text>

        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={loginSchema}
          onSubmit={handleLogin}
        >
          {({ handleSubmit }) => (
            <View style={styles.formContainer}>
              <FormikInput
                fieldName="email"
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                colors={colors}
                icon="email-outline"
                accessibilityLabel="Email input"
              />

              <FormikInput
                fieldName="password"
                placeholder="Password"
                secureTextEntry={secureTextEntry}
                toggleSecure={toggleSecure}
                autoCapitalize="none"
                colors={colors}
                icon="lock-outline"
                accessibilityLabel="Password input"
              />

              {loginError && (
                <View
                  style={[
                    styles.errorContainer,
                    { backgroundColor: `${colors.deleteButton}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={colors.deleteButton}
                  />
                  <Text style={[styles.error, { color: colors.deleteButton }]}>
                    {loginError}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.signInButton,
                  {
                    backgroundColor: colors.button,
                    opacity: loginLoading || submitting ? 0.7 : 1,
                    shadowColor: colors.button,
                  },
                ]}
                onPress={handleSubmit}
                disabled={loginLoading || submitting || googleAuthInProgress}
                accessibilityLabel="Sign in button"
              >
                {loginLoading || submitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      animating={true}
                      color={colors.buttonText}
                    />
                  </View>
                ) : (
                  <Text
                    style={[styles.buttonText, { color: colors.buttonText }]}
                  >
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.subInactiveColor },
                  ]}
                />
                <Text
                  style={[styles.dividerText, { color: colors.inactiveColor }]}
                >
                  OR
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.subInactiveColor },
                  ]}
                />
              </View>

              {/* Modern Google Sign In Button */}
              {/* <TouchableOpacity
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(163, 155, 155, 0.08)",
                    borderColor: colors.subInactiveColor,
                    opacity: googleAuthInProgress ? 0.7 : 1,
                  },
                ]}
                onPress={handleGoogleSignIn}
                disabled={submitting || googleAuthInProgress}
                accessibilityLabel="Sign in with Google button"
              >
                {googleAuthInProgress ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator animating={true} color={colors.button} />
                  </View>
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <Image
                        source={require("../assets/icons/google.png")}
                        style={styles.googleIcon}
                        resizeMode="cover"
                      />
                    </View>
                    <Text
                      style={[
                        styles.googleButtonText,
                        {
                          color: isDarkTheme
                            ? colors.activeColor
                            : colors.textColor,
                        },
                      ]}
                    >
                      Sign in with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity> */}

              <View style={styles.footer}>
                <View style={styles.signupContainer}>
                  <Text
                    style={[styles.signupText, { color: colors.inactiveColor }]}
                  >
                    Don't have an account?
                  </Text>
                  <Link href="/screens/Signup" asChild>
                    <Pressable>
                      <Text
                        style={[styles.signupLink, { color: colors.button }]}
                      >
                        Sign Up
                      </Text>
                    </Pressable>
                  </Link>
                </View>

                <Link href="(tabs)" asChild>
                  <TouchableOpacity style={styles.guestButton}>
                    <Text
                      style={[styles.guestButtonText, { color: colors.button }]}
                    >
                      Continue as a guest
                    </Text>
                  </TouchableOpacity>
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
    position: "relative",
  },
  backgroundElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -100,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 100,
    left: -50,
  },
  circle3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: -50,
    right: 50,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 160,
    height: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 360,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  error: {
    fontSize: 14,
    marginLeft: 8,
  },
  signInButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  googleIcon: {
    height: 25,
    width: 25,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
  },
  signupContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  signupText: {
    fontSize: 14,
    marginRight: 4,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  guestButton: {
    padding: 8,
  },
  guestButtonText: {
    fontSize: 14,
  },
});

export default memo(Login);
