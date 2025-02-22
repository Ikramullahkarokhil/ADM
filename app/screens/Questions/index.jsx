import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  memo,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Image,
  ToastAndroid,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { IconButton, useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog";

const Questions = () => {
  const { productId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [questionPage, setQuestionPage] = useState(1);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const {
    user,
    getProductQuestionList,
    addProductQuestion,
    deleteProductQuestion,
    updateProductQuestion,
  } = useProductStore();
  const isLoadingRef = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Product Questions",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  const loadQuestions = useCallback(
    async (page = 1) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      try {
        const data = await getProductQuestionList(productId, page);
        setQuestions((prev) => {
          const existingIds = new Set(prev.map((q) => q.products_qna_id));
          const filteredNewQuestions = data.filter(
            (q) => !existingIds.has(q.products_qna_id)
          );
          return page === 1 ? data : [...prev, ...filteredNewQuestions];
        });
        setQuestionPage(page);
        setHasMoreQuestions(data.questions?.length > 0);
      } catch (err) {
        showAlert("Error", "Failed to load questions.", () => {});
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [productId, showAlert]
  );

  useEffect(() => {
    loadQuestions(1);
  }, [loadQuestions]);

  const showAlert = useCallback((title, message, onConfirm) => {
    setAlertConfig({ title, message, onConfirm });
    setAlertVisible(true);
  }, []);

  const handleAddQuestion = useCallback(async () => {
    const trimmed = newQuestion.trim();
    if (!trimmed) {
      showAlert("Empty Question", "Please enter a question.", () => {});
      return;
    }
    if (!user) {
      showAlert("Login Required", "Please login to ask a question.", () => {});
      return;
    }
    setIsAddingQuestion(true);
    try {
      const newQ = {
        products_qna_id: Date.now(), // Temporary ID until server responds
        question: trimmed,
        consumer_id: user.consumer_id,
        consumer_name: user.name || "Anonymous",
        date: new Date().toISOString().split("T")[0],
        answers: [],
      };
      setQuestions((prev) => [...prev, newQ]);
      setNewQuestion("");
      ToastAndroid.show("Question posted successfully", ToastAndroid.SHORT);

      // Background server update
      addProductQuestion({
        productID: productId,
        consumerID: user.consumer_id,
        question: trimmed,
      }).catch((err) => {
        console.error("Background add failed:", err);
        ToastAndroid.show("Failed to sync question", ToastAndroid.SHORT);
      });
    } catch (err) {
      showAlert("Error", err.message, () => {});
    } finally {
      setIsAddingQuestion(false);
    }
  }, [newQuestion, user, addProductQuestion, productId, showAlert]);

  const handleDeleteQuestion = useCallback(
    async (questionId) => {
      setQuestions((prev) =>
        prev.filter((q) => q.products_qna_id !== questionId)
      );
      ToastAndroid.show("Question deleted", ToastAndroid.SHORT);
      // Background server update
      deleteProductQuestion({
        consumerID: user.consumer_id,
        questionId,
      }).catch((err) => {
        console.error("Background delete failed:", err);
        ToastAndroid.show("Failed to sync deletion", ToastAndroid.SHORT);
      });
    },
    [user, deleteProductQuestion]
  );

  const handleUpdateQuestion = useCallback(
    async (questionId, newText) => {
      setQuestions((prev) =>
        prev.map((q) =>
          q.products_qna_id === questionId ? { ...q, question: newText } : q
        )
      );
      ToastAndroid.show("Question updated", ToastAndroid.SHORT);

      // Background server update (assuming updateProductQuestion exists)
      updateProductQuestion({
        consumerID: user.consumer_id,
        questionId,
        question: newText,
      }).catch((err) => {
        console.error("Background update failed:", err);
        ToastAndroid.show("Failed to sync update", ToastAndroid.SHORT);
      });
    },
    [user, updateProductQuestion]
  );

  const showQuestionOptions = useCallback(
    (question) => {
      const isUserQuestion = user && question.consumer_id === user.consumer_id;
      if (!isUserQuestion || (question.answers && question.answers.length > 0))
        return;

      const options = ["Update Question", "Delete Question", "Cancel"];
      const destructiveButtonIndex = 1;
      const cancelButtonIndex = 2;

      showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
          tintColor: theme.colors.textColor,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            showAlert(
              "Update Question",
              "Enter new question text:",
              (newText) => {
                if (newText)
                  handleUpdateQuestion(question.products_qna_id, newText);
              },
              true // Assuming AlertDialog supports text input
            );
          } else if (buttonIndex === 1) {
            handleDeleteQuestion(question.products_qna_id);
          }
        }
      );
    },
    [user, handleDeleteQuestion, handleUpdateQuestion, showAlert, theme]
  );

  const renderQuestionItem = useCallback(
    ({ item }) => (
      <TouchableOpacity onPress={() => showQuestionOptions(item)}>
        <QuestionItem item={item} theme={theme} />
      </TouchableOpacity>
    ),
    [showQuestionOptions, theme]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreQuestions && questions.length > 0) {
      loadQuestions(questionPage + 1);
    }
  }, [isLoading, hasMoreQuestions, questionPage, loadQuestions, questions]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
        No questions yet. Be the first to ask!
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.textColor} />
      <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
        Loading questions...
      </Text>
    </View>
  );

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <GestureHandlerRootView style={styles.container}>
      {isLoading && questionPage === 1 ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.products_qna_id.toString()}
          renderItem={renderQuestionItem}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={
            isLoading && questionPage > 1 ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textColor}
                style={styles.footerIndicator}
              />
            ) : (
              renderEmptyState
            )
          }
          contentContainerStyle={styles.listContent}
        />
      )}
      <View
        style={[
          styles.addQuestionContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <TextInput
          value={newQuestion}
          onChangeText={setNewQuestion}
          placeholder="Ask a question..."
          placeholderTextColor={theme.colors.inactiveColor}
          style={[
            styles.questionInput,
            { borderColor: theme.colors.subInactiveColor },
          ]}
          multiline
          maxLength={200}
        />
        <IconButton
          icon={isAddingQuestion ? "loading" : "send"}
          onPress={handleAddQuestion}
          iconColor={theme.colors.button}
          disabled={isAddingQuestion}
          accessibilityLabel="Post Question"
          containerColor={theme.colors.accent}
          mode="contained"
        />
      </View>
      <AlertDialog
        visible={isAlertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        onDismiss={() => setAlertVisible(false)}
        onConfirm={(inputText) => {
          alertConfig.onConfirm(inputText);
          setAlertVisible(false);
        }}
        confirmText="OK"
        cancelText="Cancel"
        withInput={alertConfig.title === "Update Question"} // Assuming AlertDialog supports this
      />
    </GestureHandlerRootView>
  );
};

const QuestionItem = memo(({ item, theme }) => (
  <View
    style={[styles.questionItem, { backgroundColor: theme.colors.surface }]}
  >
    <View style={styles.questionHeader}>
      <Image
        source={
          item.online_image_url
            ? { uri: item.online_image_url }
            : require("../../../assets/images/imageSkeleton.jpg")
        }
        style={styles.questionUserPhoto}
      />
      <View style={styles.questionTitleContainer}>
        <Text
          style={[styles.questionAuthor, { color: theme.colors.textColor }]}
        >
          {item.consumer_name || "Anonymous"}
        </Text>
        <Text
          style={[styles.questionDate, { color: theme.colors.inactiveColor }]}
        >
          {item.date}
        </Text>
      </View>
    </View>
    <Text style={[styles.questionContent, { color: theme.colors.textColor }]}>
      {item.question}
    </Text>
    {item.answers && item.answers.length > 0 && (
      <View style={styles.answersContainer}>
        {item.answers.map((ans) => (
          <View
            key={`${item.products_qna_id}_${ans.products_ana_id}`}
            style={styles.answerItem}
          >
            <Image
              source={
                ans.seller_image_url
                  ? { uri: ans.seller_image_url }
                  : require("../../../assets/images/imageSkeleton.jpg")
              }
              style={styles.answerSellerPhoto}
            />
            <View>
              <Text
                style={[
                  styles.answerSellerName,
                  { color: theme.colors.textColor },
                ]}
              >
                {ans.seller_name}
              </Text>
              <Text
                style={[
                  styles.answerDate,
                  { color: theme.colors.inactiveColor },
                ]}
              >
                {ans.date}
              </Text>
              <Text
                style={[styles.answerText, { color: theme.colors.textColor }]}
              >
                {ans.answer}
              </Text>
            </View>
          </View>
        ))}
      </View>
    )}
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContent: {
    paddingBottom: 100, // Increased to ensure scrolling doesn't hide content behind input
  },
  questionItem: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginHorizontal: 16,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  questionTitleContainer: {
    paddingLeft: 12,
    flex: 1,
  },
  questionAuthor: {
    fontSize: 16,
    fontWeight: "600",
  },
  questionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  questionUserPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  questionContent: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 50,
  },
  answersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  answerItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  answerSellerPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  answerSellerName: {
    fontSize: 14,
    fontWeight: "600",
  },
  answerDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  addQuestionContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    position: "absolute",
    bottom: 0,
    paddingBottom: 40,
    elevation: 10,
  },
  questionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#fff",
    fontSize: 15,
    maxHeight: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    opacity: 0.7,
  },
  footerIndicator: {
    padding: 20,
  },
});

export default memo(Questions);
