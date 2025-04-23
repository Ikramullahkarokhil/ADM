import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { Formik, useField, useFormikContext } from "formik";
import * as Yup from "yup";
import useProductStore from "../../../components/api/useProductStore";
import { useState, useLayoutEffect, useCallback, memo } from "react";
import { Link, useNavigation, useRouter } from "expo-router";
import { Button, ProgressBar, useTheme } from "react-native-paper";
import CountryCodeDropdownPicker from "react-native-dropdown-country-picker";
import DatePicker from "react-native-date-picker";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useThemeStore from "../../../components/store/useThemeStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Validation schemas with improved phone number validation
const step1Schema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phoneNumber: Yup.string()
    .required("Phone number is required")
    .test(
      "phone-validation",
      "Phone number must be valid (9 digits or 12 with country code)",
      (value) => {
        if (!value) return false;

        // Check if it has a country code (starts with +)
        if (value.startsWith("+")) {
          // Should be 12 characters total with country code (+XX plus 9 digits)
          return value.length === 12;
        } else {
          // Without country code, should be exactly 9 digits
          return value.length === 9;
        }
      }
    ),
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

// Memoized FormikInput component for form fields
const FormikInput = memo(
  ({ fieldName, secureTextEntry, toggleSecure, icon, ...props }) => {
    const [field, meta, helpers] = useField(fieldName);
    const [isFocused, setIsFocused] = useState(false);
    const { validateField } = useFormikContext();
    const { colors } = useTheme();

    const handleChange = useCallback(
      (text) => {
        helpers.setValue(text);
        helpers.setTouched(true);
        validateField(fieldName);
      },
      [helpers, validateField, fieldName]
    );

    const handleBlur = useCallback(() => {
      helpers.setTouched(true);
      validateField(fieldName);
      setIsFocused(false);
    }, [helpers, validateField, fieldName]);

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
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={isFocused ? colors.button : colors.inactiveColor}
              style={styles.inputIcon}
            />
          )}
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
          {fieldName === "password" && toggleSecure && (
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

const PhoneInputWithCountryCode = memo(({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const [selected, setSelected] = useState("+93");
  const { validateField } = useFormikContext();

  const { colors } = useTheme();

  const handlePhoneChange = useCallback(
    (text) => {
      // Limit to 9 digits (without country code)
      if (text.length <= 9) {
        const fullPhone = `${selected}${text}`;
        helpers.setValue(fullPhone);
        helpers.setTouched(true);
        validateField(fieldName);
      }
    },
    [selected, helpers, validateField, fieldName]
  );

  const handleBlur = useCallback(() => {
    helpers.setTouched(true);
    validateField(fieldName);
  }, [helpers, validateField, fieldName]);

  const phoneValue = field.value || "";
  const displayPhone = phoneValue.replace(selected, "") || "";

  return (
    <View style={styles.inputContainer}>
      <CountryCodeDropdownPicker
        selected={selected}
        setSelected={(code) => {
          setSelected(code);
          const currentPhone = phoneValue.replace(selected, "") || "";
          helpers.setValue(`${code}${currentPhone}`);
          validateField(fieldName);
        }}
        setCountryDetails={() => {}}
        countryCodeTextStyles={{ color: colors.textColor }}
        phone={displayPhone}
        setPhone={handlePhoneChange}
        onBlur={handleBlur}
        phoneStyles={[
          styles.countryCodePhone,
          {
            backgroundColor:
              Platform.OS === "ios" ? colors.primary : `${colors.background}90`,
            borderColor:
              meta.touched && meta.error
                ? colors.deleteButton
                : colors.subInactiveColor,
            color: colors.textColor,
          },
        ]}
        countryCodeContainerStyles={[
          styles.countryCodeContainer,
          {
            backgroundColor:
              Platform.OS === "ios" ? colors.primary : `${colors.background}90`,
            borderColor: colors.subInactiveColor,
          },
        ]}
      />
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </View>
  );
});

const FormikPicker = memo(({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const { showActionSheetWithOptions } = useActionSheet();
  const { validateField } = useFormikContext();
  const { colors } = useTheme();

  const [isFocused, setIsFocused] = useState(false);

  const genderOptions = [
    { label: "Male", value: 1 },
    { label: "Female", value: 0 },
  ];

  const options = [...genderOptions.map((opt) => opt.label), "Cancel"];
  const cancelButtonIndex = genderOptions.length;

  const selectedLabel =
    genderOptions.find((opt) => opt.value === field.value)?.label ||
    "Select Gender";

  const handleSelection = useCallback(
    (buttonIndex) => {
      if (buttonIndex < genderOptions.length) {
        helpers.setValue(genderOptions[buttonIndex].value);
        helpers.setTouched(true);
        validateField(fieldName);
      }
      setIsFocused(false);
    },
    [helpers, validateField, fieldName, genderOptions]
  );

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        onPress={() => {
          setIsFocused(true);
          showActionSheetWithOptions(
            {
              options,
              cancelButtonIndex,
              tintColor: colors.button,
              containerStyle: { backgroundColor: colors.primary },
            },
            handleSelection
          );
        }}
        style={[
          styles.inputWrapper,
          {
            backgroundColor:
              Platform.OS === "ios" ? colors.primary : `${colors.background}90`,
            borderColor: isFocused
              ? colors.button
              : meta.touched && meta.error
              ? colors.deleteButton
              : colors.subInactiveColor,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="gender-male-female"
          size={20}
          color={isFocused ? colors.button : colors.inactiveColor}
          style={styles.inputIcon}
        />
        <Text
          style={[
            styles.pickerText,
            field.value
              ? { color: colors.textColor }
              : { color: colors.inactiveColor },
          ]}
        >
          {selectedLabel}
        </Text>
      </TouchableOpacity>
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </View>
  );
});

const FormikDatePicker = memo(({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { validateField } = useFormikContext();
  const { isDarkTheme } = useThemeStore();
  const { colors } = useTheme();

  const minimumDate = new Date(
    new Date().setFullYear(new Date().getFullYear() - 100)
  );
  const maximumDate = new Date(
    new Date().setFullYear(new Date().getFullYear() - 10)
  );

  const handleDateConfirm = useCallback(
    (date) => {
      helpers.setValue(date);
      helpers.setTouched(true);
      validateField(fieldName);
      setShow(false);
      setIsFocused(false);
    },
    [helpers, validateField, fieldName]
  );

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        onPress={() => {
          setShow(true);
          setIsFocused(true);
        }}
        style={[
          styles.inputWrapper,
          {
            backgroundColor:
              Platform.OS === "ios" ? colors.primary : `${colors.background}90`,
            borderColor: isFocused
              ? colors.button
              : meta.touched && meta.error
              ? colors.deleteButton
              : colors.subInactiveColor,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={isFocused ? colors.button : colors.inactiveColor}
          style={styles.inputIcon}
        />
        <Text
          style={[
            styles.pickerText,
            field.value
              ? { color: colors.textColor }
              : { color: colors.inactiveColor },
          ]}
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
        onCancel={() => {
          setShow(false);
          setIsFocused(false);
        }}
        textColor={colors.textColor}
        androidVariant="nativeAndroid"
        style={{
          backgroundColor: colors.primary,
        }}
      />
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </View>
  );
});

const StepIndicator = memo(({ currentStep, totalSteps }) => {
  const progress = (currentStep + 1) / totalSteps;
  const { colors } = useTheme();

  return (
    <View style={styles.stepContainer}>
      <ProgressBar
        progress={progress}
        color={colors.button}
        style={[
          styles.progressBar,
          { backgroundColor: colors.subInactiveColor },
        ]}
      />
      <View style={styles.stepTextContainer}>
        {[...Array(totalSteps)].map((_, index) => (
          <Text
            key={index}
            style={[
              styles.stepText,
              { color: colors.inactiveColor },
              index === currentStep && {
                color: colors.button,
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
});

const Signup = () => {
  const { signupUser, loginLoading, loginError } = useProductStore();
  const router = useRouter();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [confirmSecureTextEntry, setConfirmSecureTextEntry] = useState(true);
  const { isDarkTheme } = useThemeStore();
  // const colors = isDarkTheme ? darkTheme.colors : lightTheme.colors;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
        router.navigate("Login");
      } else {
        throw new Error(signupResponse.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error.message);
    }
  };

  const handleNext = async (values, setErrors, validateForm, setTouched) => {
    const errors = await validateForm(values);
    const currentStepFields = Object.keys(steps[currentStep].fields || {});

    // Filter errors to only include fields from the current step
    const currentStepErrors = Object.keys(errors)
      .filter((key) => currentStepFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = errors[key];
        return obj;
      }, {});

    if (Object.keys(currentStepErrors).length === 0) {
      setCurrentStep((prev) => prev + 1);
    } else {
      const touched = currentStepFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      setTouched(touched);
      setErrors(currentStepErrors);
    }
  };

  const togglePasswordVisibility = useCallback(() => {
    setSecureTextEntry((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setConfirmSecureTextEntry((prev) => !prev);
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top,
          // paddingBottom: insets.bottom,
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={
              isDarkTheme
                ? require("../../../assets/images/lightLogo.png")
                : require("../../../assets/images/darkLogo.png")
            }
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="App Logo"
          />
        </View>

        <Text style={[styles.title, { color: colors.textColor }]}>
          Create Your Account
        </Text>
        <Text style={[styles.subtitle, { color: colors.inactiveColor }]}>
          Sign up to get started
        </Text>

        <StepIndicator currentStep={currentStep} totalSteps={3} />

        <Formik
          initialValues={{
            name: "",
            phoneNumber: "+93",
            email: "",
            dob: null,
            gender: "",
            password: "",
            confirmPassword: "",
            code: "4337",
          }}
          onSubmit={handleSignup}
          validationSchema={steps[currentStep]}
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
              {currentStep === 0 && (
                <>
                  <FormikInput
                    fieldName="name"
                    placeholder="Full Name"
                    autoCapitalize="words"
                    icon="account-outline"
                  />

                  <PhoneInputWithCountryCode fieldName="phoneNumber" />

                  <FormikInput
                    fieldName="email"
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    icon="email-outline"
                  />
                </>
              )}

              {currentStep === 1 && (
                <>
                  <FormikDatePicker fieldName="dob" />
                  <FormikPicker fieldName="gender" />
                </>
              )}

              {currentStep === 2 && (
                <>
                  <FormikInput
                    fieldName="password"
                    placeholder="Password"
                    secureTextEntry={secureTextEntry}
                    toggleSecure={togglePasswordVisibility}
                    autoCapitalize="none"
                    icon="lock-outline"
                  />

                  <FormikInput
                    fieldName="confirmPassword"
                    placeholder="Confirm Password"
                    secureTextEntry={confirmSecureTextEntry}
                    toggleSecure={toggleConfirmPasswordVisibility}
                    autoCapitalize="none"
                    icon="lock-check-outline"
                  />
                </>
              )}

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

              <View style={styles.buttonContainer}>
                {currentStep > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: colors.button,
                      },
                    ]}
                    onPress={() => setCurrentStep((prev) => prev - 1)}
                  >
                    <Text style={[styles.buttonText, { color: colors.button }]}>
                      Back
                    </Text>
                  </TouchableOpacity>
                )}

                {currentStep < 2 ? (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.button,
                        flex: currentStep === 0 ? 1 : 0.5,
                      },
                    ]}
                    onPress={() =>
                      handleNext(values, setErrors, validateForm, setTouched)
                    }
                  >
                    <Text
                      style={[styles.buttonText, { color: colors.buttonText }]}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.button,
                        opacity: loginLoading ? 0.7 : 1,
                      },
                    ]}
                    onPress={handleSubmit}
                    disabled={loginLoading}
                  >
                    {loginLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator animating={true} color="white" />
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          { color: colors.buttonText },
                        ]}
                      >
                        Sign Up
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Formik>

        <View style={styles.footer}>
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: colors.inactiveColor }]}>
              Already have an account?
            </Text>
            <Link href="/Login" asChild>
              <Pressable>
                <Text style={[styles.signupLink, { color: colors.button }]}>
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
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
  form: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
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
  pickerText: {
    flex: 1,
    fontSize: 16,
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
  phoneContainer: {
    marginBottom: 16,
  },
  countryCodeContainer: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
  },
  countryCodePhone: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  button: {
    flex: 0.5,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
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
  footer: {
    alignItems: "center",
    marginTop: 8,
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
  stepContainer: {
    marginBottom: 32,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
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
});

export default Signup;
