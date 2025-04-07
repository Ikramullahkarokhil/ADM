"use client";

import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { Formik, useField, useFormikContext } from "formik";
import * as Yup from "yup";
import useProductStore from "../../../components/api/useProductStore";
import { useState, useLayoutEffect } from "react";
import { Link, useNavigation, useRouter } from "expo-router";
import { Button, ProgressBar, useTheme } from "react-native-paper";
import CountryCodeDropdownPicker from "react-native-dropdown-country-picker";
import DatePicker from "react-native-date-picker";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";

// Validation schemas
const step1Schema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phoneNumber: Yup.string()
    .required("Phone number is required")
    .min(10, "Phone number must be at least 10 digits"),
  email: Yup.string().email("Invalid email").required("Email is required"),
});

const step2Schema = Yup.object().shape({
  dob: Yup.date()
    .required("Date of birth is required")
    .max(
      new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
      "You must be at least 10 years old"
    ),
  gender: Yup.string().required("Gender is required"),
});

const step3Schema = Yup.object().shape({
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),
});

const steps = [step1Schema, step2Schema, step3Schema];

// Formik Components
const FormikInput = ({ fieldName, ...props }) => {
  const [field, meta, helpers] = useField(fieldName);
  const theme = useTheme();
  const { validateField } = useFormikContext();

  const handleChange = (text) => {
    helpers.setValue(text);
    helpers.setTouched(true);
    validateField(fieldName);
  };

  const handleBlur = () => {
    helpers.setTouched(true);
    validateField(fieldName);
  };

  return (
    <>
      <TextInput
        value={field.value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.subInactiveColor,
            color: theme.colors.textColor,
          },
          meta.touched &&
            meta.error && { borderColor: theme.colors.deleteButton },
        ]}
        {...props}
        placeholderTextColor={theme.colors.inactiveColor}
      />
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: theme.colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </>
  );
};

export const PhoneInputWithCountryCode = ({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const [selected, setSelected] = useState("+93");
  const theme = useTheme();
  const { validateField } = useFormikContext();

  const handlePhoneChange = (text) => {
    const fullPhone = `${selected}${text}`;
    helpers.setValue(fullPhone);
    helpers.setTouched(true);
    validateField(fieldName);
  };

  const handleBlur = () => {
    helpers.setTouched(true);
    validateField(fieldName);
  };

  const phoneValue = field.value || "";
  const displayPhone = phoneValue.replace(selected, "") || "";

  return (
    <View style={styles.phoneContainer}>
      <CountryCodeDropdownPicker
        selected={selected}
        setSelected={(code) => {
          setSelected(code);
          const currentPhone = phoneValue.replace(selected, "") || "";
          helpers.setValue(`${code}${currentPhone}`);
          validateField(fieldName);
        }}
        setCountryDetails={() => {}}
        countryCodeTextStyles={{ color: theme.colors.textColor }}
        phone={displayPhone}
        setPhone={handlePhoneChange}
        onBlur={handleBlur}
        phoneStyles={[
          styles.countryCodePhone,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.subInactiveColor,
            color: theme.colors.textColor,
          },
          meta.touched &&
            meta.error && { borderColor: theme.colors.deleteButton },
        ]}
        countryCodeContainerStyles={[
          styles.countryCodeContainer,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.subInactiveColor,
          },
        ]}
      />
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: theme.colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </View>
  );
};

const FormikPicker = ({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { validateField } = useFormikContext();

  const genderOptions = [
    { label: "Male", value: 1 },
    { label: "Female", value: 0 },
  ];

  const options = genderOptions.map((opt) => opt.label);
  const cancelButtonIndex = genderOptions.length;

  const selectedLabel =
    genderOptions.find((opt) => opt.value === field.value)?.label ||
    "Select Gender";

  const handleSelection = (buttonIndex) => {
    if (buttonIndex < genderOptions.length) {
      helpers.setValue(genderOptions[buttonIndex].value);
      helpers.setTouched(true);
      validateField(fieldName);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          showActionSheetWithOptions(
            {
              options,
              cancelButtonIndex,
              tintColor: theme.colors.textColor,
              containerStyle: { backgroundColor: theme.colors.primary },
            },
            handleSelection
          );
        }}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.subInactiveColor,
            justifyContent: "center",
          },
          meta.touched &&
            meta.error && { borderColor: theme.colors.deleteButton },
        ]}
      >
        <Text
          style={
            field.value
              ? { color: theme.colors.textColor }
              : { color: theme.colors.inactiveColor }
          }
        >
          {selectedLabel}
        </Text>
      </TouchableOpacity>
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: theme.colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </>
  );
};

const FormikDatePicker = ({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const [show, setShow] = useState(false);
  const theme = useTheme();
  const { isDarkTheme } = useThemeStore();
  const { validateField } = useFormikContext();

  const minimumDate = new Date(
    new Date().setFullYear(new Date().getFullYear() - 100)
  );
  const maximumDate = new Date(
    new Date().setFullYear(new Date().getFullYear() - 10)
  );

  const handleDateConfirm = (date) => {
    helpers.setValue(date);
    helpers.setTouched(true);
    validateField(fieldName);
    setShow(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[
          styles.input,
          styles.datepicker,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.subInactiveColor,
          },
          meta.touched &&
            meta.error && { borderColor: theme.colors.deleteButton },
        ]}
      >
        <Text
          style={
            field.value
              ? { color: theme.colors.textColor }
              : { color: theme.colors.inactiveColor }
          }
        >
          {field.value ? field.value.toDateString() : "Select Date of Birth"}
        </Text>
      </TouchableOpacity>
      <DatePicker
        modal
        open={show}
        date={field.value || new Date()}
        mode="date"
        theme={isDarkTheme ? "dark" : "light"}
        minimumDate={minimumDate}
        title="Select Date of Birth"
        maximumDate={maximumDate}
        onConfirm={handleDateConfirm}
        onCancel={() => setShow(false)}
        textColor={theme.colors.textColor}
        androidVariant="nativeAndroid"
        style={{
          backgroundColor: theme.colors.primary,
        }}
      />
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: theme.colors.deleteButton }]}>
          {meta.error}
        </Text>
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
        color={theme.colors.button}
        style={[
          styles.progressBar,
          { backgroundColor: theme.colors.subInactiveColor },
        ]}
      />
      <View style={styles.stepTextContainer}>
        {[...Array(totalSteps)].map((_, index) => (
          <Text
            key={index}
            style={[
              styles.stepText,
              { color: theme.colors.inactiveColor },
              index === currentStep && {
                color: theme.colors.button,
                fontWeight: "bold",
              },
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
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleSignup = async (values) => {
    console.log("Submitting form data:", values);
    try {
      const signupData = {
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phoneNumber,
        dob: values.dob ? values.dob.toISOString().split("T")[0] : "",
        gender: values.gender,
        code: values.code,
      };

      const signupResponse = await signupUser(signupData);
      if (signupResponse.success) {
        console.log("Signup successful:", signupResponse.user);
        router.replace("Login");
      } else {
        throw new Error(signupResponse.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error.message);
    }
  };

  const handleNext = async (values, setErrors, validateForm, setTouched) => {
    const errors = await validateForm(values);
    if (Object.keys(errors).length === 0) {
      setCurrentStep((prev) => prev + 1);
    } else {
      const currentStepFields = Object.keys(steps[currentStep].fields);
      const touched = currentStepFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      setTouched(touched);
      setErrors(errors);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.textColor }]}>
        Create Your Account
      </Text>
      <StepIndicator currentStep={currentStep} totalSteps={3} />

      <Formik
        initialValues={{
          name: "",
          phoneNumber: "",
          email: "",
          dob: null,
          gender: "",
          password: "",
          confirmPassword: "",
          code: "4337",
        }}
        onSubmit={handleSignup}
        validationSchema={steps[currentStep]} // Set validation schema based on current step
        validateOnChange={true}
        validateOnBlur={true}
      >
        {({
          handleSubmit,
          values,
          setErrors,
          validateForm,
          isValid,
          dirty,
          setTouched,
        }) => (
          <View style={styles.form}>
            {/* Step content remains the same */}
            {currentStep === 0 && (
              <>
                <Text
                  style={[styles.inputLabel, { color: theme.colors.textColor }]}
                >
                  Full Name
                </Text>
                <FormikInput
                  fieldName="name"
                  placeholder="Full Name"
                  autoCapitalize="words"
                />

                <Text
                  style={[styles.inputLabel, { color: theme.colors.textColor }]}
                >
                  Phone Number
                </Text>
                <PhoneInputWithCountryCode fieldName="phoneNumber" />

                <Text
                  style={[styles.inputLabel, { color: theme.colors.textColor }]}
                >
                  Email
                </Text>
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
                <Text
                  style={[styles.inputLabel, { color: theme.colors.textColor }]}
                >
                  Date of Birth
                </Text>
                <FormikDatePicker fieldName="dob" />

                <Text
                  style={[styles.inputLabel, { color: theme.colors.textColor }]}
                >
                  Gender
                </Text>
                <FormikPicker fieldName="gender" />
              </>
            )}

            {currentStep === 2 && (
              <>
                <Text
                  style={[styles.inputLabel, { color: theme.colors.textColor }]}
                >
                  Password
                </Text>
                <FormikInput
                  fieldName="password"
                  placeholder="Password"
                  secureTextEntry
                  autoCapitalize="none"
                />

                <Text
                  style={[styles.inputLabel, { color: theme.colors.textColor }]}
                >
                  Confirm Password
                </Text>
                <FormikInput
                  fieldName="confirmPassword"
                  placeholder="Confirm Password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}

            {loginError && (
              <Text
                style={[styles.errorText, { color: theme.colors.deleteButton }]}
              >
                {loginError}
              </Text>
            )}

            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.prevButton]}
                  onPress={() => setCurrentStep((prev) => prev - 1)}
                >
                  <Button
                    mode="outlined"
                    style={[
                      styles.button,
                      { borderColor: theme.colors.button },
                    ]}
                    textColor={theme.colors.button}
                  >
                    Back
                  </Button>
                </TouchableOpacity>
              )}

              {currentStep < 2 ? (
                <TouchableOpacity
                  style={[styles.button, styles.nextButton]}
                  onPress={() =>
                    handleNext(values, setErrors, validateForm, setTouched)
                  }
                >
                  <Button
                    style={styles.button}
                    buttonColor={theme.colors.button}
                    textColor={theme.colors.primary}
                  >
                    Next
                  </Button>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSubmit}
                  disabled={loginLoading}
                >
                  <Button
                    style={styles.button}
                    buttonColor={theme.colors.button}
                    textColor={theme.colors.primary}
                    loading={loginLoading}
                  >
                    Sign Up
                  </Button>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Formik>

      <Link href={{ pathname: "/Login" }} asChild>
        <Pressable style={{ flexDirection: "row" }}>
          <Text style={[styles.link, { color: theme.colors.textColor }]}>
            Already have an account?{" "}
          </Text>
          <Text style={[styles.link, { color: theme.colors.button }]}>
            Sign In
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 45,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  phoneContainer: {
    marginBottom: 20,
  },
  countryCodeContainer: {
    height: 45,
  },
  countryCodePhone: {
    height: 45,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
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
    borderRadius: 12,
    paddingVertical: 4,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  link: {
    textAlign: "center",
    fontSize: 14,
  },
  stepContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  stepTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stepText: {
    fontSize: 14,
  },
  datepicker: {
    justifyContent: "center",
  },
});

export default Signup;
