import { useState } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useField } from "formik";
import DateTimePicker from "@react-native-community/datetimepicker";

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
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  navButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  navButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default FormikDatePicker;
