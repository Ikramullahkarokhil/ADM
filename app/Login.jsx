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
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import { Link, useRouter } from "expo-router";
import { Button, useTheme } from "react-native-paper";
import useProductStore from "../components/api/useProductStore";
import useThemeStore from "../components/store/useThemeStore";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

// Complete any lingering authentication sessions
WebBrowser.maybeCompleteAuthSession();

// Schema for login form validation
const loginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Too Short!").required("Required"),
});

// Memoized FormikInput component for form fields
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
  const { loginUser, loginLoading, loginError } = useProductStore();
  const theme = useTheme();
  const { isDarkTheme } = useThemeStore();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);

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

      // Get the access token instead of id_token
      const { access_token } = response.params;

      console.log("Google sign in successful!");

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

      console.log("Processing Google login with token:", accessToken);

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
      // Improved platform handling
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
          Sign in to your account
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

              {loginError && (
                <Text
                  style={[styles.error, { color: theme.colors.deleteButton }]}
                >
                  {loginError}
                </Text>
              )}

              <Button
                textColor={theme.colors.primary}
                buttonColor={theme.colors.button}
                style={styles.button}
                loading={loginLoading || submitting}
                accessibilityLabel="Sign in button"
                onPress={handleSubmit}
                disabled={loginLoading || submitting || googleAuthInProgress}
              >
                Sign In
              </Button>

              <View style={styles.divider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.subInactiveColor },
                  ]}
                />
                <Text
                  style={[
                    styles.dividerText,
                    { color: theme.colors.inactiveColor },
                  ]}
                >
                  OR
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.subInactiveColor },
                  ]}
                />
              </View>

              <Button
                textColor={theme.colors.primary}
                buttonColor={theme.colors.button}
                style={styles.button}
                loading={googleAuthInProgress}
                disabled={submitting || googleAuthInProgress}
                onPress={handleGoogleSignIn}
                accessibilityLabel="Sign in with Google button"
              >
                Sign In with Google
              </Button>

              <View style={styles.footer}>
                <Link href="/screens/Signup" asChild>
                  <Pressable style={{ flexDirection: "row" }}>
                    <Text
                      style={[styles.link, { color: theme.colors.textColor }]}
                    >
                      Don't have an account?{" "}
                    </Text>
                    <Text style={[styles.link, { color: theme.colors.button }]}>
                      Sign Up
                    </Text>
                  </Pressable>
                </Link>

                <Link href="(tabs)" asChild>
                  <Button
                    mode="text"
                    textColor={theme.colors.button}
                    style={styles.skipButton}
                  >
                    Skip
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 14,
  },
});

export default memo(Login);
