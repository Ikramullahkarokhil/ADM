import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import useProductStore from "../../../components/api/useProductStore";
import { useLayoutEffect } from "react";
import { Link, useNavigation, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";

const signupValidationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string()
    .required("Phone number is required")
    .length(10, "invalid phone number"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  code: Yup.string().required("Code is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
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

const Signup = () => {
  const { signupUser, loginLoading, loginError } = useProductStore();
  const navigation = useNavigation();
  const theme = useTheme();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleSignup = async (values) => {
    try {
      await signupUser(values);
      router.replace("(tabs)");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SignUp to Zaytoon</Text>
      <Formik
        initialValues={{
          name: "",
          phone: "",
          email: "",
          code: "",
          password: "",
        }}
        validationSchema={signupValidationSchema}
        onSubmit={handleSignup}
      >
        {({ handleSubmit }) => (
          <View style={styles.form}>
            <FormikInput
              fieldName="name"
              placeholder="Full Name"
              autoCapitalize="words"
            />
            <FormikInput
              fieldName="phone"
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
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

            {loginError && <Text style={styles.errorText}>{loginError}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
            <Link href={{ pathname: "/Login" }} asChild>
              <Text style={styles.link}>Allready have an account? Sign In</Text>
            </Link>
          </View>
        )}
      </Formik>
    </View>
  );
};

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
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  errorInput: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    marginBottom: 5,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  link: {
    color: "#007bff",
    textAlign: "center",
    marginTop: 10,
    textDecorationLine: "underline",
  },
});

export default Signup;
