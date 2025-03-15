import React, { useLayoutEffect, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "expo-router";
import { useTheme } from "react-native-paper";
import useProductStore from "../../../components/api/useProductStore";
import DatePicker from "react-native-date-picker";
import { Formik } from "formik";
import * as Yup from "yup";
import { Ionicons } from "@expo/vector-icons";

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  phone: Yup.string().required("Phone number is required"),
  dob: Yup.date()
    .test(
      "is-at-least-10",
      "You must be at least 10 years old",
      function (value) {
        if (!value) return false;
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age >= 10;
      }
    )
    .required("Date of birth is required"),
  gender: Yup.string().required("Gender is required"),
});

const UpdateProfile = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const navigation = useNavigation();
  const theme = useTheme();
  const { profileData, uploadConsumerImage, updateConsumer } =
    useProductStore();

  const [initialValues, setInitialValues] = useState({
    name: "",
    phone: "",
    dob: "",
    gender: "Male",
  });

  useEffect(() => {
    if (profileData?.updated_at) {
      const lastUpdate = new Date(profileData.updated_at);
      const nextUpdate = new Date(lastUpdate.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();

      const diffMs = nextUpdate - now;
      if (diffMs > 0) {
        setTimeLeft(diffMs);

        const timer = setInterval(() => {
          const newDiff = nextUpdate - new Date();
          if (newDiff <= 0) {
            setTimeLeft(null);
            clearInterval(timer);
          } else {
            setTimeLeft(newDiff);
          }
        }, 1000);

        return () => clearInterval(timer);
      }
    }
  }, [profileData?.updated_at]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Update Profile",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  useEffect(() => {
    if (profileData) {
      let genderValue = "Male";
      if (profileData.gender === 1) genderValue = "Male";
      else if (profileData.gender === 0) genderValue = "Female";
      else if (profileData.gender === 2) genderValue = "Other";

      let formattedDate =
        profileData.dob ||
        new Date(new Date().setFullYear(new Date().getFullYear() - 10));
      formattedDate = formatDate(new Date(formattedDate));

      setInitialValues({
        name: profileData.name || "",
        phone: profileData.phone || "",
        dob: formattedDate,
        gender: genderValue,
      });
    }
  }, [profileData]);

  const pickImage = async () => {
    if (timeLeft) return; // Disable image picking when update is restricted
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant permission to access your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatTimeLeft = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (values) => {
    if (timeLeft) {
      Alert.alert(
        "Update Restricted",
        "You can only update your profile once every 24 hours"
      );
      return;
    }
    try {
      let genderValue;
      if (values.gender === "Male") genderValue = 1;
      else if (values.gender === "Female") genderValue = 0;
      else if (values.gender === "Other") genderValue = 2;

      const updatedValues = {
        ...values,
        gender: genderValue,
        consumer_id: profileData.consumer_id,
      };

      if (profileImage && profileData.consumer_id) {
        await uploadConsumerImage({
          consumer_id: profileData.consumer_id,
          image: profileImage,
        });
      }

      await updateConsumer(updatedValues);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileImageContainer}>
          <View style={styles.imageContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : profileData?.consumer_image ? (
              <Image
                source={{ uri: profileData.consumer_image }}
                style={styles.profileImage}
              />
            ) : (
              <View
                style={[
                  styles.placeholderImage,
                  { backgroundColor: theme.colors.button },
                ]}
              >
                <Text style={[styles.placeholderText, { color: "white" }]}>
                  {initialValues.name
                    ? initialValues.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : ""}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[
                styles.editImageButton,
                {
                  backgroundColor: timeLeft
                    ? theme.colors.inactiveColor
                    : theme.colors.button,
                  opacity: timeLeft ? 0.6 : 1,
                },
              ]}
              onPress={pickImage}
              disabled={!!timeLeft}
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {timeLeft && (
          <View style={styles.timerContainer}>
            <Ionicons
              name="time-outline"
              size={24}
              color={theme.colors.textColor}
            />
            <Text style={[styles.timerText, { color: theme.colors.textColor }]}>
              Next update in: {formatTimeLeft(timeLeft)}
            </Text>
          </View>
        )}

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            setFieldTouched,
            values,
            errors,
            touched,
          }) => (
            <>
              <View
                style={[
                  styles.formContainer,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <View style={styles.inputGroup}>
                  <Text
                    style={[styles.label, { color: theme.colors.textColor }]}
                  >
                    Full Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.textColor,
                        opacity: timeLeft ? 0.6 : 1,
                      },
                      touched.name && errors.name && styles.inputError,
                    ]}
                    placeholderTextColor={theme.colors.inactiveColor}
                    value={values.name}
                    onChangeText={handleChange("name")}
                    onBlur={handleBlur("name")}
                    placeholder="Enter your full name"
                    editable={!timeLeft}
                  />
                  {touched.name && errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text
                    style={[styles.label, { color: theme.colors.textColor }]}
                  >
                    Phone Number
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.textColor,
                        opacity: timeLeft ? 0.6 : 1,
                      },
                      touched.phone && errors.phone && styles.inputError,
                    ]}
                    placeholderTextColor={theme.colors.inactiveColor}
                    value={values.phone}
                    onChangeText={handleChange("phone")}
                    onBlur={handleBlur("phone")}
                    placeholder="123456789"
                    keyboardType="phone-pad"
                    maxLength={12}
                    editable={!timeLeft}
                  />
                  {touched.phone && errors.phone ? (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  ) : (
                    <Text style={styles.phoneHelper}>
                      Phone number should be 10 digits
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text
                    style={[styles.label, { color: theme.colors.textColor }]}
                  >
                    Date of Birth
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.textColor,
                        opacity: timeLeft ? 0.6 : 1,
                      },
                      touched.dob && errors.dob && styles.inputError,
                    ]}
                    onPress={() => {
                      if (!timeLeft) {
                        setActiveField("dob");
                        setDatePickerOpen(true);
                      }
                    }}
                  >
                    <Text
                      style={{
                        color: values.dob
                          ? theme.colors.textColor
                          : theme.colors.inactiveColor,
                      }}
                    >
                      {values.dob || "Select date of birth"}
                    </Text>
                  </TouchableOpacity>
                  {touched.dob && errors.dob && (
                    <Text style={styles.errorText}>{errors.dob}</Text>
                  )}
                  <DatePicker
                    modal
                    open={datePickerOpen && activeField === "dob"}
                    date={
                      values.dob
                        ? new Date(values.dob)
                        : new Date(
                            new Date().setFullYear(
                              new Date().getFullYear() - 10
                            )
                          )
                    }
                    mode="date"
                    onConfirm={(date) => {
                      setDatePickerOpen(false);
                      setFieldValue("dob", formatDate(date));
                      setFieldTouched("dob", true);
                    }}
                    onCancel={() => {
                      setDatePickerOpen(false);
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text
                    style={[styles.label, { color: theme.colors.textColor }]}
                  >
                    Gender
                  </Text>
                  <View style={styles.genderContainer}>
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        values.gender === "Male" && [
                          styles.selectedGender,
                          {
                            backgroundColor: theme.colors.button,
                            borderColor: theme.colors.button,
                          },
                        ],
                        touched.gender && errors.gender && styles.inputError,
                        { opacity: timeLeft ? 0.6 : 1 },
                      ]}
                      onPress={() => {
                        if (!timeLeft) {
                          setFieldValue("gender", "Male");
                          setFieldTouched("gender", true);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          values.gender === "Male" && [
                            styles.selectedGenderText,
                            { color: "white" },
                          ],
                        ]}
                      >
                        Male
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        values.gender === "Female" && [
                          styles.selectedGender,
                          {
                            backgroundColor: theme.colors.button,
                            borderColor: theme.colors.button,
                          },
                        ],
                        touched.gender && errors.gender && styles.inputError,
                        { opacity: timeLeft ? 0.6 : 1 },
                      ]}
                      onPress={() => {
                        if (!timeLeft) {
                          setFieldValue("gender", "Female");
                          setFieldTouched("gender", true);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          values.gender === "Female" && [
                            styles.selectedGenderText,
                            { color: "white" },
                          ],
                        ]}
                      >
                        Female
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        values.gender === "Other" && [
                          styles.selectedGender,
                          {
                            backgroundColor: theme.colors.button,
                            borderColor: theme.colors.button,
                          },
                        ],
                        touched.gender && errors.gender && styles.inputError,
                        { opacity: timeLeft ? 0.6 : 1 },
                      ]}
                      onPress={() => {
                        if (!timeLeft) {
                          setFieldValue("gender", "Other");
                          setFieldTouched("gender", true);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          values.gender === "Other" && [
                            styles.selectedGenderText,
                            { color: "white" },
                          ],
                        ]}
                      >
                        Other
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {touched.gender && errors.gender && (
                    <Text style={styles.errorText}>{errors.gender}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  {
                    backgroundColor: timeLeft
                      ? theme.colors.inactiveColor
                      : theme.colors.button,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!!timeLeft}
              >
                <Text style={[styles.updateButtonText, { color: "white" }]}>
                  Update Profile
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  imageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#6c63ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: "bold",
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginVertical: 20,
    flexDirection: "row",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
  formContainer: {
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  inputError: {
    borderColor: "red",
    borderWidth: 1,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  phoneHelper: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderOption: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
  },
  selectedGender: {
    backgroundColor: "#6c63ff",
    borderColor: "#6c63ff",
  },
  genderText: {
    fontSize: 16,
  },
  selectedGenderText: {
    color: "white",
    fontWeight: "600",
  },
  updateButton: {
    borderRadius: 15,
    padding: 18,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 30,
    shadowColor: "#6c63ff",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
});

export default UpdateProfile;
