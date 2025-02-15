import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import useProductStore from "../components/api/useProductStore";
import { Link, useNavigation, useRouter } from "expo-router";
import { Button, useTheme } from "react-native-paper";

const loginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Too Short!").required("Required"),
});

const FormikInput = ({ fieldName, ...props }) => {
  const [field, meta, helpers] = useField(fieldName);
  return (
    <>
      <TextInput
        value={field.value}
        onChangeText={helpers.setValue}
        onBlur={() => helpers.setTouched(true)}
        {...props}
        style={[styles.input, meta.touched && meta.error && styles.errorInput]}
      />
      {meta.touched && meta.error && (
        <Text style={styles.errorText}>{meta.error}</Text>
      )}
    </>
  );
};

const Login = () => {
  const router = useRouter();
  const { loginUser, loginLoading, loginError } = useProductStore();
  const theme = useTheme();

  const handleLogin = async (values) => {
    try {
      await loginUser(values);
      router.push("(tabs)");
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Link href={{ pathname: "(tabs)" }} asChild style={styles.skipButton}>
        <Button
          buttonColor={theme.colors.button}
          textColor={theme.colors.primary}
        >
          Skip
        </Button>
      </Link>
      <Text style={styles.title}>Welcome Back</Text>

      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={loginSchema}
        onSubmit={handleLogin}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
        }) => (
          <View style={styles.form}>
            <FormikInput
              fieldName="email"
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormikInput
              fieldName="password"
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
            />

            {loginError && <Text style={styles.error}>{loginError}</Text>}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.button }]}
              onPress={handleSubmit}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* <GoogleSigninButton onPress={signIn} /> */}

            <Link href={{ pathname: "/screens/Signup" }} asChild>
              <Text style={styles.link}>Don't have an account? Sign Up</Text>
            </Link>
          </View>
        )}
      </Formik>
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 40,
    textAlign: "center",
  },
  form: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 5,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007bff",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#ff4444",
    fontSize: 14,
    marginBottom: 10,
  },
  link: {
    color: "#007bff",
    textAlign: "center",
    marginTop: 10,
    textDecorationLine: "underline",
  },
  errorInput: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    marginBottom: 5,
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 20,
  },
});
