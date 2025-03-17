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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import debounce from "lodash.debounce";

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
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const {
    user,
    getProductQuestionList,
    addProductQuestion,
    deleteProductQuestion,
    editQuestion,
  } = useProductStore();
  const isLoadingRef = useRef(false);
  const pendingQuestionsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const editInputRef = useRef(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Product Questions",
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme]);

  const loadQuestions = useCallback(
    debounce(async (page = 1, isInitialLoad = false) => {
      if (isInitialLoad && initialLoadDoneRef.current) {
        return;
      }

      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        const data = await getProductQuestionList(productId, page);

        if (isInitialLoad) {
          initialLoadDoneRef.current = true;
        }

        setQuestions((prev) => {
          const serverQuestionIds = new Set(
            data.questions.map((q) => q.products_qna_id)
          );
          const filteredPrev =
            page === 1
              ? []
              : prev.filter(
                  (q) =>
                    !serverQuestionIds.has(q.products_qna_id) && !q.isTemporary
                );

          return [...filteredPrev, ...data.questions];
        });
        setQuestionPage(page);
        setHasMoreQuestions(data.questions?.length > 0);

        data.questions.forEach((q) => {
          pendingQuestionsRef.current.delete(q.question);
        });
      } catch (err) {
        console.error("Failed to load questions:", err);
        showAlert("Error", "Failed to load questions.", () => {});
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }, 300),
    [productId, showAlert]
  );

  useEffect(() => {
    loadQuestions(1, true);
    return () => {
      initialLoadDoneRef.current = false;
    };
  }, [loadQuestions]);

  const showAlert = useCallback((title, message, onConfirm) => {
    setAlertConfig({
      title,
      message,
      onConfirm,
    });
    setAlertVisible(true);
  }, []);

  const handleAddQuestion = useCallback(
    debounce(async () => {
      const trimmed = newQuestion.trim();
      if (!trimmed) {
        showAlert("Empty Question", "Please enter a question.", () => {});
        return;
      }
      if (!user) {
        showAlert(
          "Login Required",
          "Please login to ask a question.",
          () => {}
        );
        return;
      }

      if (pendingQuestionsRef.current.has(trimmed)) {
        ToastAndroid.show(
          "Question already being processed",
          ToastAndroid.SHORT
        );
        return;
      }

      setIsAddingQuestion(true);
      pendingQuestionsRef.current.add(trimmed);

      try {
        const tempId = Date.now();
        const newQ = {
          products_qna_id: tempId,
          question: trimmed,
          consumer_id: user.consumer_id,
          consumer_name: user.name || "Anonymous",
          date: new Date().toISOString().split("T")[0],
          answers: [],
          isTemporary: true,
        };

        setQuestions((prev) => [...prev, newQ]);
        setNewQuestion("");

        ToastAndroid.show("Question posted successfully", ToastAndroid.SHORT);

        await addProductQuestion({
          productID: productId,
          consumerID: user.consumer_id,
          question: trimmed,
        });
        setQuestions((prev) =>
          prev.filter((q) => q.products_qna_id !== tempId)
        );
        loadQuestions(1);
      } catch (err) {
        console.error("Error adding question:", err);
        showAlert("Error", err.message || "Failed to add question", () => {});
        pendingQuestionsRef.current.delete(trimmed);
      } finally {
        setIsAddingQuestion(false);
      }
    }, 300),
    [newQuestion, user, addProductQuestion, productId, showAlert, loadQuestions]
  );

  const handleDeleteQuestion = useCallback(
    debounce(async (questionId) => {
      setQuestions((prev) =>
        prev.filter((q) => q.products_qna_id !== questionId)
      );

      try {
        await deleteProductQuestion({
          consumerID: user.consumer_id,
          questionId,
        });
        ToastAndroid.show("Question deleted", ToastAndroid.SHORT);
      } catch (err) {
        console.error("Failed to delete question:", err);
        ToastAndroid.show("Failed to delete question", ToastAndroid.SHORT);
        loadQuestions(1);
      }
    }, 300),
    [user, deleteProductQuestion, loadQuestions]
  );

  const handleUpdateQuestion = useCallback(
    debounce(async (questionId, newText) => {
      setEditingQuestionId(null);

      const originalQuestion = questions.find(
        (q) => q.products_qna_id === questionId
      );
      if (
        !originalQuestion ||
        !newText.trim() ||
        newText === originalQuestion.question
      ) {
        return;
      }

      setQuestions((prev) =>
        prev.map((q) =>
          q.products_qna_id === questionId ? { ...q, question: newText } : q
        )
      );

      try {
        ToastAndroid.show("Question updated", ToastAndroid.SHORT);
        await editQuestion({
          question: newText,
          question_id: questionId,
          consumer_id: user.consumer_id,
        });
      } catch (err) {
        console.error("Failed to update question:", err);
        ToastAndroid.show("Failed to update question", ToastAndroid.SHORT);

        setQuestions((prev) =>
          prev.map((q) =>
            q.products_qna_id === questionId ? originalQuestion : q
          )
        );
      }
    }, 300),
    [user, editQuestion, questions]
  );

  const startEditingQuestion = useCallback((questionId, questionText) => {
    setEditingQuestionId(questionId);
    setNewQuestion(questionText);
  }, []);

  const showQuestionOptions = useCallback(
    (question, event) => {
      event.stopPropagation();

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
          containerStyle: { backgroundColor: theme.colors.primary },
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            startEditingQuestion(question.products_qna_id, question.question);
          } else if (buttonIndex === 1) {
            handleDeleteQuestion(question.products_qna_id);
          }
        }
      );
    },
    [user, handleDeleteQuestion, startEditingQuestion, theme]
  );

  const renderQuestionItem = useCallback(
    ({ item }) => (
      <QuestionItem
        item={item}
        theme={theme}
        isEditing={editingQuestionId === item.products_qna_id}
        onOptionsPress={(e) => showQuestionOptions(item, e)}
      />
    ),
    [showQuestionOptions, theme, editingQuestionId]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreQuestions && questions.length > 0) {
      loadQuestions(questionPage + 1);
    }
  }, [isLoading, hasMoreQuestions, questionPage, loadQuestions, questions]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="comment-question-outline"
        size={80}
        color={theme.colors.inactiveColor}
      />
      <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
        No questions yet. Be the first to ask!
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View
      style={[
        styles.loadingContainer,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.textColor} />
      <Text style={[styles.loadingText, { color: theme.colors.textColor }]}>
        Loading questions...
      </Text>
    </View>
  );

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      {isLoading && questionPage === 1 ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.products_qna_id.toString()}
          renderItem={renderQuestionItem}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            questions.length === 0 && styles.emptyListContent,
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
      <View
        style={[
          styles.addQuestionContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <TextInput
          ref={editInputRef}
          value={newQuestion}
          onChangeText={setNewQuestion}
          placeholder="Ask a question..."
          placeholderTextColor={theme.colors.inactiveColor}
          style={[
            styles.questionInput,
            {
              borderColor: theme.colors.subInactiveColor,
              backgroundColor: theme.colors.primary,
              color: theme.colors.textColor,
            },
          ]}
          multiline
          maxLength={200}
        />
        <IconButton
          icon={isAddingQuestion ? "loading" : "send"}
          onPress={
            editingQuestionId
              ? () => handleUpdateQuestion(editingQuestionId, newQuestion)
              : handleAddQuestion
          }
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
      />
    </GestureHandlerRootView>
  );
};

const QuestionItem = memo(({ item, theme, isEditing, onOptionsPress }) => {
  const { user } = useProductStore();
  const isUserQuestion = user && item.consumer_id === user.consumer_id;
  const isTemporary = item.isTemporary;

  return (
    <View
      style={[
        styles.questionItem,
        {
          backgroundColor: theme.colors.surface,
          opacity: isTemporary ? 0.8 : 1,
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
        />
        <View style={styles.questionTitleContainer}>
          <Text
            style={[styles.questionAuthor, { color: theme.colors.textColor }]}
          >
            {item.consumer_name || "Anonymous"}
            {isTemporary && " (Posting...)"}
          </Text>
          <Text
            style={[
              styles.questionDate,
              { color: theme.colors.subInactiveColor },
            ]}
          >
            {item.date}
          </Text>
        </View>
        {isUserQuestion && (
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={onOptionsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color={theme.colors.textColor + "80"}
            />
          </TouchableOpacity>
        )}
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
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContent: {
    paddingBottom: 100, // Increased to ensure scrolling doesn't hide content behind input
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
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
    width: "100%",
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
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    marginTop: 16,
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
  optionsButton: {
    padding: 5,
  },
  // New styles for inline editing
  editContainer: {
    marginLeft: 50,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});

export default memo(Questions);
