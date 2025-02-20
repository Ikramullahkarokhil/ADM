import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { Formik, useField } from "formik";
import * as Yup from "yup";
import useProductStore from "../../../components/api/useProductStore";
import { useState, useLayoutEffect } from "react";
import { Link, useNavigation, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { ProgressBar, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import CountryCodeDropdownPicker from "react-native-dropdown-country-picker";
import { LinearGradient } from "expo-linear-gradient";

// Validation schemas
const step1Schema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string()
    .required("Phone number is required")
    .matches(/^\+\d{1,4}\d{6,}$/, "Invalid phone number"),
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
  consumer_image: Yup.string().required("Profile picture is required"),
});

const steps = [step1Schema, step2Schema, step3Schema];

// Formik Components
const FormikImagePicker = ({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const theme = useTheme();

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access gallery is required!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile pic
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      helpers.setValue(uri);
      helpers.setTouched(true);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {field.value ? (
          <Image source={{ uri: field.value }} style={styles.image} />
        ) : (
          <Text
            style={[
              styles.placeholderText,
              { color: theme.colors.inactiveColor },
            ]}
          >
            Select Profile Picture
          </Text>
        )}
      </TouchableOpacity>
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: theme.colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </>
  );
};

const FormikInput = ({ fieldName, ...props }) => {
  const [field, meta, helpers] = useField(fieldName);
  const theme = useTheme();

  return (
    <>
      <TextInput
        value={field.value}
        onChangeText={helpers.setValue}
        onBlur={() => helpers.setTouched(true)}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.subInactiveColor,
          },
          meta.touched &&
            meta.error && { borderColor: theme.colors.deleteButton },
        ]}
        {...props}
      />
      {meta.touched && meta.error && (
        <Text style={[styles.errorText, { color: theme.colors.deleteButton }]}>
          {meta.error}
        </Text>
      )}
    </>
  );
};

const PhoneInputWithCountryCode = ({ value, onChangeText, onBlur }) => {
  const [selected, setSelected] = useState("+93");
  const [phoneNumber, setPhoneNumber] = useState("");
  const theme = useTheme();

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
        countryCodeTextStyles={{ color: theme.colors.textColor }}
        phone={phoneNumber}
        setPhone={handlePhoneChange}
        phoneStyles={[
          styles.countryCodePhone,
          { backgroundColor: theme.colors.primary },
        ]}
        countryCodeContainerStyles={[
          styles.countryCodeContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      />
    </View>
  );
};

const FormikPicker = ({ fieldName }) => {
  const [field, meta, helpers] = useField(fieldName);
  const theme = useTheme();

  return (
    <>
      <View
        style={[
          styles.pickerContainer,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.subInactiveColor,
          },
          meta.touched &&
            meta.error && { borderColor: theme.colors.deleteButton },
        ]}
      >
        <Picker
          selectedValue={field.value}
          onValueChange={(value) => helpers.setValue(value)}
          style={{ color: theme.colors.textColor }}
        >
          <Picker.Item label="Select Gender" value="" />
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>
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

  const onChange = (event, selectedDate) => {
    setShow(false);
    if (event.type === "set") {
      helpers.setValue(selectedDate || field.value);
      helpers.setTouched(true);
    }
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
      {show && (
        <DateTimePicker
          value={field.value || new Date()}
          mode="date"
          display="default"
          onChange={onChange}
        />
      )}
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
        color={theme.colors.progressColor}
        style={styles.progressBar}
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
  const { user, signupUser, uploadConsumerImage, loginLoading, loginError } =
    useProductStore();
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
      // Step 1: Register user without image
      const { consumer_image, dob, ...userData } = values; // Exclude image and adjust dob
      const signupData = {
        ...userData,
        dob: dob ? dob.toISOString().split("T")[0] : null, // Format date as YYYY-MM-DD
      };
      const signupResponse = await signupUser(signupData);

      if (signupResponse.success) {
        console.log("user Registered");
        const consumerId = signupResponse.user.id; // Assuming response includes user id
        console.log(user.consumer_id);
        // Step 2: Upload image if provided
        if (consumer_image) {
          const imageBlob = await fetch(consumer_image).then((res) =>
            res.blob()
          );
          const imageFile = {
            uri: consumer_image,
            type: imageBlob.type || "image/jpeg", // Default to JPEG if unknown
            name: "profile.jpg",
          };

          const uploadResponse = await uploadConsumerImage({
            image: imageFile,
            consumer_id: consumerId,
          });

          if (uploadResponse.status !== "success") {
            console.error("Image upload failed:", uploadResponse.message);
            // Proceed anyway, but log the issue
          }
        }

        router.replace("Login");
      } else {
        throw new Error(signupResponse.message || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error.message);
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
    <LinearGradient
      colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.colors.textColor }]}>
          Create Your Account
        </Text>
        <StepIndicator currentStep={currentStep} totalSteps={3} />

        <Formik
          initialValues={{
            name: "",
            phone: "",
            email: "",
            dob: null,
            gender: "",
            password: "",
            code: "4357",
            // consumer_image: null,
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
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    Full Name
                  </Text>
                  <FormikInput
                    fieldName="name"
                    placeholder="Full Name"
                    autoCapitalize="words"
                  />

                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    Phone Number
                  </Text>
                  <PhoneInputWithCountryCode
                    value={values.phone}
                    onChangeText={(text) => setFieldValue("phone", text)}
                    onBlur={() => setFieldTouched("phone", true)}
                  />

                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textColor },
                    ]}
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
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    Date of Birth
                  </Text>
                  <FormikDatePicker fieldName="dob" />

                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    Gender
                  </Text>
                  <FormikPicker fieldName="gender" />
                </>
              )}

              {currentStep === 2 && (
                <>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textColor },
                    ]}
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
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textColor },
                    ]}
                  >
                    Profile Picture
                  </Text>
                  <FormikImagePicker fieldName="consumer_image" />
                </>
              )}

              {loginError && (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.deleteButton },
                  ]}
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
                    <LinearGradient
                      colors={[
                        theme.colors.buttonGradientStart,
                        theme.colors.buttonGradientEnd,
                      ]}
                      style={styles.gradientButton}
                    >
                      <Text style={styles.buttonText}>Back</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {currentStep < 2 ? (
                  <TouchableOpacity
                    style={[styles.button, styles.nextButton]}
                    onPress={() => handleNext(values, setErrors)}
                  >
                    <LinearGradient
                      colors={[
                        theme.colors.buttonGradientStart,
                        theme.colors.buttonGradientEnd,
                      ]}
                      style={styles.gradientButton}
                    >
                      <Text style={styles.buttonText}>Next</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleSubmit}
                    disabled={loginLoading}
                  >
                    <LinearGradient
                      colors={[
                        theme.colors.buttonGradientStart,
                        theme.colors.buttonGradientEnd,
                      ]}
                      style={styles.gradientButton}
                    >
                      {loginLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Formik>

        <Link href={{ pathname: "/Login" }} asChild>
          <Text style={[styles.link, { color: theme.colors.button }]}>
            Already have an account? Sign In
          </Text>
        </Link>
      </ScrollView>
    </LinearGradient>
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
    elevation: 2,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  prevButton: {},
  nextButton: {},
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  link: {
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
  },
  datepicker: {
    justifyContent: "center",
  },
  imagePicker: {
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    marginBottom: 20,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#fff", // White border for contrast on gradient
  },
  placeholderText: {
    fontSize: 16,
  },
});

export default Signup;
