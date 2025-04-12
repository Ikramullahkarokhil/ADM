import {
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
  useLayoutEffect,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
  ToastAndroid,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

// Format date string to match the comments page
const formatDateString = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return dateString;
    }

    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "just now";
    if (diffMins < 60)
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    if (diffHours < 24)
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffDays < 7)
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${
      months[date.getMonth()]
    } ${date.getDate()}, ${date.getFullYear()}`;
  } catch (e) {
    return dateString;
  }
};

const Questions = () => {
  const { productId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  // State management
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(true);

  // Store and refs
  const {
    user,
    getProductQuestionList,
    addProductQuestion,
    deleteProductQuestion,
    editQuestion,
  } = useProductStore();

  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Alert helper
  const showAlert = useCallback((title, message, onConfirm = () => {}) => {
    setAlertConfig({ title, message, onConfirm });
    setAlertVisible(true);
  }, []);

  // Set header options
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Questions",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme.colors]);

  // Load questions with optimized pagination handling
  const loadQuestions = useCallback(
    async (page = 1, isLoadingMoreQuestions = false) => {
      // Prevent multiple simultaneous requests
      if (isLoading || isLoadingMore || (!hasMoreQuestions && page > 1)) {
        console.log("Skipping request due to loading state or no more data");
        return;
      }

      // Set appropriate loading state
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await getProductQuestionList({
          productId: productId,
          page: page,
        });

        if (response && response.questions) {
          const questionsData = response.questions || [];
          const total = response.total || 0;
          const perPage = response.perPage || 10;
          const calculatedTotalPages = Math.ceil(total / perPage);

          // Check if we've reached the end
          const hasMore = page < calculatedTotalPages;
          setHasMoreQuestions(hasMore);

          // Update questions list
          setQuestions((prev) => {
            if (page === 1) {
              return [...questionsData];
            } else {
              // Add new questions, avoiding duplicates
              const newQuestions = questionsData.filter(
                (newQ) =>
                  !prev.some(
                    (existingQ) =>
                      existingQ.products_qna_id === newQ.products_qna_id
                  )
              );

              return [...prev, ...newQuestions];
            }
          });

          setCurrentPage(Number(response.currentPage) || page);
          setTotalPages(calculatedTotalPages || 1);
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        showAlert("Error", "Failed to load questions. Please try again.");
      } finally {
        if (page === 1) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [
      getProductQuestionList,
      productId,
      showAlert,
      isLoading,
      isLoadingMore,
      hasMoreQuestions,
    ]
  );

  // Initial load
  useEffect(() => {
    loadQuestions(1);
  }, []);

  // Handle infinite scroll with optimized conditions
  const handleEndReached = useCallback(() => {
    console.log(
      `End reached. Loading more? ${isLoadingMore}, Loading? ${isLoading}, Has more? ${hasMoreQuestions}, Current page: ${currentPage}, Total pages: ${totalPages}`
    );

    if (
      !isLoadingMore &&
      !isLoading &&
      hasMoreQuestions &&
      currentPage < totalPages
    ) {
      console.log(`Loading more questions for page ${currentPage + 1}`);
      loadQuestions(currentPage + 1, true);
    }
  }, [
    isLoadingMore,
    isLoading,
    currentPage,
    totalPages,
    hasMoreQuestions,
    loadQuestions,
  ]);

  // Add question with optimistic updates
  const handleAddQuestion = useCallback(async () => {
    const trimmedQuestion = newQuestion.trim();
    if (!trimmedQuestion) {
      showAlert("Empty Question", "Please write a question before submitting.");
      return;
    }

    if (!user?.consumer_id) {
      showAlert("Login Required", "Please login to ask a question.");
      return;
    }

    setIsAddingQuestion(true);

    // Create temporary question for optimistic update
    const tempQuestion = {
      products_qna_id: `temp_${Date.now()}`,
      product_id: productId,
      question: trimmedQuestion,
      consumer_id: user.consumer_id,
      consumer_name: user.name || "Anonymous",
      date: new Date().toISOString(),
      online_image_url: user.photo || null,
      answers: [],
      isTemporary: true,
    };

    // Add new question at the beginning
    setQuestions((prev) => [tempQuestion, ...prev]);
    setNewQuestion("");
    Keyboard.dismiss();

    try {
      // Send to server
      const response = await addProductQuestion({
        productID: productId,
        consumerID: user.consumer_id,
        question: trimmedQuestion,
      });

      // Update with server data
      setQuestions((prev) =>
        prev.map((question) =>
          question.products_qna_id === tempQuestion.products_qna_id
            ? {
                ...question,
                products_qna_id:
                  response?.question_id || question.products_qna_id,
                isTemporary: false,
              }
            : question
        )
      );

      ToastAndroid.show("Question added successfully", ToastAndroid.SHORT);
    } catch (err) {
      console.error("Error adding question:", err);

      // Remove temporary question on failure
      setQuestions((prev) =>
        prev.filter(
          (question) =>
            question.products_qna_id !== tempQuestion.products_qna_id
        )
      );

      ToastAndroid.show("Failed to add question", ToastAndroid.SHORT);
    } finally {
      setIsAddingQuestion(false);
    }
  }, [newQuestion, user, addProductQuestion, productId, showAlert]);

  // Edit question handling
  const handleEditQuestion = useCallback((question) => {
    if (Platform.OS === "ios") {
      // iOS specific alert with prompt
      Alert.prompt(
        "Edit Question",
        "Modify your question below:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (newText) => {
              if (newText && newText.trim()) {
                updateQuestion(question, newText.trim());
              }
            },
          },
        ],
        "plain-text",
        question.question
      );
    } else {
      // Android - use the input field
      setNewQuestion(question.question);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setEditingQuestion(question);
    }
  }, []);

  // Update question with optimistic updates
  const updateQuestion = useCallback(
    (question, newText) => {
      // Optimistic update
      setQuestions((prev) =>
        prev.map((q) =>
          q.products_qna_id === question.products_qna_id
            ? { ...q, question: newText, isPending: true }
            : q
        )
      );

      // Reset input state if editing
      if (editingQuestion) {
        setNewQuestion("");
        setEditingQuestion(null);
        Keyboard.dismiss();
      }

      // Send to server
      editQuestion({
        question: newText,
        question_id: question.products_qna_id,
        consumer_id: user.consumer_id,
      })
        .then(() => {
          setQuestions((prev) =>
            prev.map((q) =>
              q.products_qna_id === question.products_qna_id
                ? { ...q, isPending: false }
                : q
            )
          );
          ToastAndroid.show("Question updated", ToastAndroid.SHORT);
        })
        .catch((err) => {
          console.error("Error updating question:", err);
          // Revert on failure
          setQuestions((prev) =>
            prev.map((q) =>
              q.products_qna_id === question.products_qna_id
                ? { ...question, isPending: false }
                : q
            )
          );
          ToastAndroid.show("Failed to update question", ToastAndroid.SHORT);
        });
    },
    [editQuestion, user, editingQuestion]
  );

  // Handle update from input field
  const handleUpdateQuestion = useCallback(() => {
    if (!editingQuestion) return handleAddQuestion();

    const trimmedQuestion = newQuestion.trim();
    if (!trimmedQuestion) return;

    updateQuestion(editingQuestion, trimmedQuestion);
  }, [editingQuestion, newQuestion, updateQuestion, handleAddQuestion]);

  // Delete question with confirmation
  const handleDeleteQuestion = useCallback(
    (question) => {
      showAlert(
        "Delete Question",
        "Are you sure you want to delete this question?",
        () => {
          // Optimistic update - mark as deleting
          setQuestions((prev) =>
            prev.map((q) =>
              q.products_qna_id === question.products_qna_id
                ? { ...q, isPending: true, isDeleting: true }
                : q
            )
          );

          deleteProductQuestion({
            consumerID: user.consumer_id,
            questionId: question.products_qna_id,
          })
            .then(() => {
              // Remove from list on success
              setQuestions((prev) =>
                prev.filter(
                  (q) => q.products_qna_id !== question.products_qna_id
                )
              );
              ToastAndroid.show("Question deleted", ToastAndroid.SHORT);
            })
            .catch((err) => {
              console.error("Error deleting question:", err);
              // Revert on failure
              setQuestions((prev) =>
                prev.map((q) =>
                  q.products_qna_id === question.products_qna_id
                    ? { ...question, isPending: false, isDeleting: false }
                    : q
                )
              );
              ToastAndroid.show(
                "Failed to delete question",
                ToastAndroid.SHORT
              );
            });
        }
      );
    },
    [deleteProductQuestion, user, showAlert]
  );

  // Show action sheet for question options
  const showQuestionOptions = useCallback(
    (question) => {
      const options = ["Edit", "Delete", "Cancel"];
      const cancelButtonIndex = 2;
      const destructiveButtonIndex = 1;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          tintColor: theme.colors.textColor,
          containerStyle: {
            backgroundColor: theme.colors.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          textStyle: { fontSize: 16 },
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleEditQuestion(question);
          } else if (buttonIndex === 1) {
            handleDeleteQuestion(question);
          }
        }
      );
    },
    [
      showActionSheetWithOptions,
      handleEditQuestion,
      handleDeleteQuestion,
      theme.colors,
    ]
  );

  // Render a question item - memoized for performance
  const renderQuestionItem = useCallback(
    ({ item }) => {
      const isUserQuestion = user && item.consumer_id === user.consumer_id;
      const isPending = item.isPending;
      const isDeleting = item.isDeleting;

      return (
        <View style={styles.questionItemContainer}>
          <TouchableOpacity
            onPress={() => isUserQuestion && showQuestionOptions(item)}
            activeOpacity={isUserQuestion ? 0.7 : 1}
            style={[
              styles.questionItem,
              {
                backgroundColor: theme.colors.primary + "20",
                opacity: isPending ? 0.8 : 1,
                borderColor: isDeleting ? "#ff9f43" : "transparent",
                borderWidth: isDeleting ? 1 : 0,
              },
            ]}
          >
            <View style={styles.questionHeader}>
              <Image
                source={
                  item.online_image_url
                    ? { uri: item.online_image_url }
                    : require("../../../assets/images/imageSkeleton.jpg")
                }
                style={styles.questionUserPhoto}
                accessibilityLabel="User Photo"
              />
              <View style={styles.questionTitleContainer}>
                <Text
                  style={[
                    styles.questionAuthor,
                    { color: theme.colors.textColor },
                  ]}
                  numberOfLines={1}
                >
                  {item.consumer_name || "Anonymous"}
                  {isPending && " (Syncing...)"}
                  {isDeleting && " (Deleting...)"}
                </Text>
                <Text style={styles.questionDate} numberOfLines={1}>
                  {formatDateString(item.date)}
                </Text>
              </View>
              {isUserQuestion && (
                <TouchableOpacity
                  onPress={() => showQuestionOptions(item)}
                  style={styles.optionsButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isPending ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textColor + "80"}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={20}
                      color={theme.colors.textColor + "80"}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[
                styles.questionContent,
                { color: theme.colors.textColor },
              ]}
            >
              {item.question}
            </Text>

            {item.answers && item.answers.length > 0 && (
              <View style={styles.answersContainer}>
                {item.answers.map((answer, index) => (
                  <View
                    key={`${item.products_qna_id}_answer_${index}`}
                    style={styles.answerItem}
                  >
                    <Image
                      source={
                        answer.seller_image_url
                          ? { uri: answer.seller_image_url }
                          : require("../../../assets/images/imageSkeleton.jpg")
                      }
                      style={styles.answerUserPhoto}
                      accessibilityLabel="Seller Photo"
                    />
                    <View style={styles.answerContent}>
                      <Text
                        style={[
                          styles.answerAuthor,
                          { color: theme.colors.textColor },
                        ]}
                        numberOfLines={1}
                      >
                        {answer.seller_name || "Seller"}
                      </Text>
                      <Text style={styles.answerDate} numberOfLines={1}>
                        {formatDateString(answer.date)}
                      </Text>
                      <Text
                        style={[
                          styles.answerText,
                          { color: theme.colors.textColor },
                        ]}
                      >
                        {answer.answer}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [user, theme.colors, showQuestionOptions]
  );

  // Empty list component - memoized
  const EmptyListComponent = useCallback(
    () => (
      <View style={styles.emptyQuestionContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.textColor} />
        ) : (
          <>
            <MaterialCommunityIcons
              name="comment-question-outline"
              size={64}
              color={theme.colors.textColor + "50"}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
              No questions yet
            </Text>
          </>
        )}
      </View>
    ),
    [isLoading, theme.colors]
  );

  // Footer component - memoized
  const ListFooterComponent = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={theme.colors.textColor} />
          <Text style={{ color: theme.colors.textColor, marginTop: 8 }}>
            Loading more questions...
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, theme.colors]);

  // Item separator - memoized
  const ItemSeparatorComponent = useCallback(
    () => (
      <View
        style={[
          styles.separator,
          { borderColor: theme.colors.subInactiveColor + "70" },
        ]}
      />
    ),
    [theme.colors]
  );

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <View style={{ flex: 1 }}>
        <FlashList
          ref={listRef}
          data={questions}
          keyExtractor={(item) => item.products_qna_id.toString()}
          renderItem={renderQuestionItem}
          estimatedItemSize={120}
          ListEmptyComponent={EmptyListComponent}
          ListFooterComponent={ListFooterComponent}
          ItemSeparatorComponent={ItemSeparatorComponent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.7}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          style={[
            styles.addQuestionContainer,
            {
              backgroundColor: theme.colors.primary,
              borderTopColor: theme.colors.inactiveColor + "30",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 5,
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              value={newQuestion}
              onChangeText={setNewQuestion}
              placeholder={
                editingQuestion ? "Edit your question..." : "Ask a question..."
              }
              placeholderTextColor={theme.colors.inactiveColor}
              style={[
                styles.questionInput,
                {
                  backgroundColor: theme.colors.primary + "80",
                  borderColor: theme.colors.inactiveColor + "30",
                  color: theme.colors.textColor,
                },
              ]}
              multiline
              maxLength={500}
              accessibilityLabel="Question Input"
            />
          </View>
          <TouchableOpacity
            onPress={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
            disabled={isAddingQuestion || !newQuestion.trim()}
            style={[
              styles.sendButton,
              {
                backgroundColor: newQuestion.trim()
                  ? theme.colors.button
                  : theme.colors.button + "50",
                opacity: isAddingQuestion ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Send Question"
          >
            {isAddingQuestion ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons
                name={editingQuestion ? "check" : "send"}
                size={20}
                color="#fff"
              />
            )}
          </TouchableOpacity>
          {editingQuestion && (
            <TouchableOpacity
              onPress={() => {
                setEditingQuestion(null);
                setNewQuestion("");
              }}
              style={styles.cancelButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={theme.colors.textColor}
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <AlertDialog
        visible={isAlertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        onDismiss={() => setAlertVisible(false)}
        onConfirm={() => {
          alertConfig.onConfirm();
          setAlertVisible(false);
        }}
        confirmText="OK"
        cancelText="Cancel"
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  questionItemContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  questionItem: {
    padding: 16,
    borderRadius: 12,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  questionTitleContainer: {
    flex: 1,
    paddingLeft: 12,
  },
  questionAuthor: {
    fontSize: 15,
    fontWeight: "600",
  },
  questionContent: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 8,
    marginLeft: 48,
  },
  questionDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  questionUserPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  answersContainer: {
    marginTop: 16,
    marginLeft: 48,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
    paddingLeft: 12,
  },
  answerItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  answerUserPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  answerContent: {
    flex: 1,
    marginLeft: 10,
  },
  answerAuthor: {
    fontSize: 14,
    fontWeight: "600",
  },
  answerDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  addQuestionContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    position: "absolute",
    paddingBottom: 40,
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  questionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  emptyQuestionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 240,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  optionsButton: {
    padding: 4,
  },
  separator: {
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default memo(Questions);
