import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import useProductStore from "../../../components/api/useProductStore";
import { useState, React, useLayoutEffect } from "react";
import { Link, useNavigation, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { ProgressBar, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import CountryCodeDropdownPicker from "react-native-dropdown-country-picker";

const step1Schema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string()
    .required("Phone number is required")
    .matches(/^\+\d{1,4}\d{10}$/, "Invalid phone number"), // Example: +931234567890
  email: Yup.string().email("Invalid email").required("Email is required"),
});

const step2Schema = Yup.object().shape({
  dob: Yup.date()
    .required("Date of birth is required")
    .max(
      new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
      "You must be at least 10 years old"
    ),
});

const step3Schema = Yup.object().shape({
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  // profilePicture: Yup.mixed().required("Profile picture is required"),
});

const FormikImagePicker = ({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [3, 3],
      quality: 1,
    });

    if (!result.canceled) {
      helpers.setValue(result.uri);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {field.value ? (
          <Image source={{ uri: field.value }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>Select Profile Picture</Text>
        )}
      </TouchableOpacity>
      {meta.touched && meta.error && (
        <Text style={styles.errorText}>{meta.error}</Text>
      )}
    </>
  );
};

const steps = [step1Schema, step2Schema, step3Schema];

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

const PhoneInputWithCountryCode = ({ value, onChangeText, onBlur }) => {
  const [selected, setSelected] = useState("+93"); // Default country code
  const [phoneNumber, setPhoneNumber] = useState("");

  const handlePhoneChange = (text) => {
    setPhoneNumber(text);
    onChangeText(`${selected}${text}`);
  };

  return (
    <View style={styles.phoneContainer}>
      <CountryCodeDropdownPicker
        selected={selected}
        setSelected={setSelected}
        setCountryDetails={() => {}}
        countryCodeTextStyles={{ fontSize: 12 }}
        phone={phoneNumber}
        setPhone={handlePhoneChange}
        phoneStyles={styles.countryCodePhone}
        countryCodeContainerStyles={styles.countryCodeContainer}
      />
    </View>
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
        style={[
          styles.input,
          styles.datepicker,
          meta.touched && meta.error && styles.errorInput,
        ]}
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

const StepIndicator = ({ currentStep, totalSteps }) => {
  const progress = (currentStep + 1) / totalSteps;
  const theme = useTheme();

  return (
    <View style={styles.stepContainer}>
      <ProgressBar
        progress={progress}
        color="#4a90e2"
        style={[styles.progressBar]}
      />
      <View style={styles.stepTextContainer}>
        {[...Array(totalSteps)].map((_, index) => (
          <Text
            key={index}
            style={[
              styles.stepText,
              index <= progress && styles.activeStepText,
            ]}
          >
            Step {index + 1}
          </Text>
        ))}
      </View>
    </View>
  );
};

const Signup = () => {
  const { signupUser, loginLoading, loginError } = useProductStore();
  const router = useRouter();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleSignup = async (values) => {
    console.log(values);
    try {
      await signupUser(values);
      router.replace("Login");
    } catch (error) {
      console.log(error);
    }
  };

  const handleNext = async (values, setErrors) => {
    try {
      await steps[currentStep].validate(values, { abortEarly: false });
      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      const errors = error.inner.reduce((acc, curr) => {
        acc[curr.path] = curr.message;
        return acc;
      }, {});
      setErrors(errors);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      <StepIndicator currentStep={currentStep} totalSteps={3} />

      <Formik
        initialValues={{
          name: "",
          phone: "",
          email: "",
          dob: "",
          gender: "",
          password: "",
          code: "4337",
          consumer_image: null,
        }}
        onSubmit={handleSignup}
      >
        {({
          handleSubmit,
          values,
          setErrors,
          setFieldValue,
          setFieldTouched,
        }) => (
          <View style={styles.form}>
            {currentStep === 0 && (
              <>
                <FormikInput
                  fieldName="name"
                  placeholder="Full Name"
                  autoCapitalize="words"
                />

                <PhoneInputWithCountryCode
                  value={values.phone}
                  onChangeText={(text) => setFieldValue("phone", text)} // Update Formik field
                  onBlur={() => setFieldTouched("phone", true)} // Mark field as touched
                />

                <FormikInput
                  fieldName="email"
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            )}

            {currentStep === 1 && (
              <>
                <Text style={styles.inputLabel}>Date Of Birth</Text>

                <FormikDatePicker fieldName="dob" />

                <FormikPicker fieldName="gender" />
              </>
            )}

            {currentStep === 2 && (
              <>
                <FormikInput
                  fieldName="password"
                  placeholder="Password"
                  secureTextEntry
                  autoCapitalize="none"
                />

                <FormikImagePicker fieldName="consumer_image" />
              </>
            )}

            {loginError && <Text style={styles.errorText}>{loginError}</Text>}

            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.prevButton]}
                  onPress={() => setCurrentStep((prev) => prev - 1)}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
              )}

              {currentStep < 2 ? (
                <TouchableOpacity
                  style={[styles.button, styles.nextButton]}
                  onPress={() => handleNext(values, setErrors)}
                >
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              ) : (
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
              )}
            </View>
          </View>
        )}
      </Formik>

      <Link href={{ pathname: "/Login" }} asChild>
        <Text style={styles.link}>Already have an account? Sign In</Text>
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 24,
    justifyContent: "center",
  },
  phoneContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    marginBottom: 24,
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    marginBottom: 20,
  },
  countryCodeContainer: {
    backgroundColor: "#f8f9fa",
    height: 45,
  },
  countryCodePhone: {
    height: 45,
    backgroundColor: "#f8f9fa",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
  },
  errorInput: {
    borderColor: "#dc3545",
  },
  errorText: {
    color: "#dc3545",
    marginBottom: 8,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    backgroundColor: "#4a90e2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  prevButton: {
    backgroundColor: "#6c757d",
  },
  nextButton: {
    backgroundColor: "#4a90e2",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  link: {
    color: "#4a90e2",
    textAlign: "center",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  stepContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
  },
  stepTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stepText: {
    fontSize: 14,
    color: "#999", // Inactive step text color
  },
  activeStepText: {
    color: "#4a90e2", // Active step text color
    fontWeight: "bold",
  },
  datepicker: {
    justifyContent: "center",
  },
});

export default Signup;
