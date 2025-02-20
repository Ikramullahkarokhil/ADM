import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import useProductStore from "../components/api/useProductStore";
import { Link, useRouter } from "expo-router";
import { Button, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";

const loginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Too Short!").required("Required"),
});

const FormikInput = ({
  fieldName,
  theme,
  secureTextEntry,
  toggleSecure,
  ...props
}) => {
  const [field, meta, helpers] = useField(fieldName);
  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={field.value}
          onChangeText={helpers.setValue}
          onBlur={() => helpers.setTouched(true)}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: "rgba(255, 255, 255, 0.4)",
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
        <Text style={[styles.errorText, { color: theme.colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </View>
  );
};

const Login = () => {
  const router = useRouter();
  const { loginUser, loginLoading, loginError } = useProductStore();
  const theme = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  React.useEffect(() => {
    // Fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Set navigation bar color to match gradient
    const setNavigationBarColor = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(theme.colors.gradientEnd);
        await NavigationBar.setButtonStyleAsync(
          theme === theme.darkTheme ? "light" : "dark"
        ); // Adjust button style based on theme
      } catch (error) {
        console.error("Error setting navigation bar color:", error);
      }
    };
    setNavigationBarColor();
  }, [fadeAnim, theme]);

  const handleLogin = async (values) => {
    try {
      await loginUser(values);
      router.push("(tabs)");
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const toggleSecure = () => setSecureTextEntry((prev) => !prev);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradientBackground}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/darkLogo.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="App Logo"
            />
          </View>

          <Text style={[styles.title, { color: theme.colors.textColor }]}>
            Welcome Back
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.inactiveColor }]}
          >
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
                  { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                ]}
              >
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
                {loginError && (
                  <Text
                    style={[styles.error, { color: theme.colors.deleteButton }]}
                  >
                    {loginError}
                  </Text>
                )}
                <LinearGradient
                  colors={[
                    theme.colors.buttonGradientStart,
                    theme.colors.buttonGradientEnd,
                  ]}
                  style={styles.button}
                >
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loginLoading}
                    accessibilityLabel="Sign in button"
                    style={styles.buttonInner}
                  >
                    {loginLoading ? (
                      <ActivityIndicator color={theme.colors.activeColor} />
                    ) : (
                      <Text style={styles.buttonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </LinearGradient>

                <View style={styles.footer}>
                  <Link href="/screens/Signup" asChild>
                    <Text
                      style={[styles.link, { color: theme.colors.textColor }]}
                    >
                      Don’t have an account?{" "}
                      <Text style={{ color: theme.colors.button }}>
                        Sign Up
                      </Text>
                    </Text>
                  </Link>
                  <Link href="(tabs)" asChild>
                    <Button
                      mode="text"
                      textColor={theme.colors.textColor}
                      style={styles.skipButton}
                    >
                      Skip
                    </Button>
                  </Link>
                </View>
              </View>
            )}
          </Formik>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  content: {
    alignItems: "center",
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
    borderColor: "rgba(255, 255, 255, 0.2)",
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
    height: 60,
    borderRadius: 16,
    marginTop: 24,
    overflow: "hidden",
  },
  buttonInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
});
