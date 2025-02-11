import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import useProductStore from "../../../components/api/useProductStore";
import { useLayoutEffect, useState } from "react";
import { Link, useNavigation, useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

const signupValidationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string()
    .required("Phone number is required")
    .length(10, "Invalid phone number"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  dob: Yup.date().required("Date of birth is required"),
  gender: Yup.string().required("Gender is required"),
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

const FormikPicker = ({ fieldName, ...props }) => {
  const [field, meta, helpers] = useField(fieldName);
  return (
    <>
      <View
        style={[
          styles.pickerContainer,
          meta.touched && meta.error && styles.errorInput,
        ]}
      >
        <Picker
          selectedValue={field.value}
          onValueChange={(value) => helpers.setValue(value)}
          {...props}
        >
          <Picker.Item label="Select Gender" value="" />
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>
      {meta.touched && meta.error && (
        <Text style={styles.errorText}>{meta.error}</Text>
      )}
    </>
  );
};

const FormikDatePicker = ({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const [show, setShow] = useState(false);

  const onChange = (event, selectedDate) => {
    setShow(false);
    if (event.type === "set") {
      const currentDate = selectedDate || field.value;
      helpers.setValue(currentDate);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.input, meta.touched && meta.error && styles.errorInput]}
      >
        <Text style={field.value ? styles.text : styles.placeholder}>
          {field.value ? field.value.toDateString() : "Select Date of Birth"}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={field.value || new Date()}
          mode="date"
          display="default"
          onChange={onChange}
        />
      )}
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
      router.navigate("(tabs)");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up to Zaytoon</Text>
      <Formik
        initialValues={{
          name: "",
          phone: "",
          email: "",
          dob: "",
          gender: "",
          password: "",
          code: "4637",
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
            <FormikDatePicker fieldName="dob" />
            <FormikPicker fieldName="gender" />
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
              <Text style={styles.link}>Already have an account? Sign In</Text>
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
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 15,
    justifyContent: "center",
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 10,
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
  text: {
    color: "#000",
  },
  placeholder: {
    color: "#aaa",
  },
});

export default Signup;
