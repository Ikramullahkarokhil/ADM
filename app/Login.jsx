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
// import {
//   GoogleSignin,
//   GoogleSigninButton,
//   statusCodes,
// } from "@react-native-google-signin/google-signin";

// Validation schema for login form
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

  // Configure Google Sign-In
  // useEffect(() => {
  //   GoogleSignin.configure({
  //     webClientId:
  //       "171374130805-5u0qb6dnj2bsbd8smou8egdsh1j0jkea.apps.googleusercontent.com", // Replace with your actual web client ID
  //     offlineAccess: true,
  //   });
  // }, []);

  // Function to handle Google Sign-In
  // const signIn = async () => {
  //   try {
  //     await GoogleSignin.hasPlayServices();
  //     const userInfo = await GoogleSignin.signIn();
  //     console.log("User Info:", userInfo);
  //   } catch (error) {
  //     if (error.code === statusCodes.SIGN_IN_CANCELLED) {
  //       Alert.alert("Sign-In Cancelled", "User cancelled the sign-in process.");
  //     } else if (error.code === statusCodes.IN_PROGRESS) {
  //       Alert.alert("Sign-In In Progress", "Sign-in is already in progress.");
  //     } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
  //       Alert.alert(
  //         "Play Services Not Available",
  //         "Google Play Services is not available or outdated."
  //       );
  //     } else {
  //       Alert.alert("Sign-In Error", "An unknown error occurred.");
  //       console.error("Sign-In Error:", error);
  //     }
  //   }
  // };

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
              style={styles.button}
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
});
