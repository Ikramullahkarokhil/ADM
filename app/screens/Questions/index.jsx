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
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { IconButton, TextInput, useTheme } from "react-native-paper";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog";

const Questions = () => {
  const { productId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();

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
  } = useProductStore();

  const isLoadingRef = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Questions",
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
          const newQuestions = data.questions || [];
          // Filter out duplicates by checking existing IDs
          const existingIds = new Set(prev.map((q) => q.products_qna_id));
          const filteredNewQuestions = newQuestions.filter(
            (q) => !existingIds.has(q.products_qna_id)
          );
          return page === 1 ? newQuestions : [...prev, ...filteredNewQuestions];
        });
        setQuestionPage(page);
        setHasMoreQuestions(data.questions?.length > 0);
      } catch (err) {
        showAlert("Error", "Failed to load questions.", () => {});
        console.error("Error fetching questions:", err);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [productId]
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
      showAlert(
        "Empty Question",
        "Please write a question before submitting.",
        () => {}
      );
      return;
    }
    if (!user) {
      showAlert("Login Required", "Please login to add a question.", () => {});
      return;
    }
    setIsAddingQuestion(true);
    try {
      await addProductQuestion({
        productID: productId,
        consumerID: user.consumer_id,
        question: trimmed,
      });
      setNewQuestion("");
      ToastAndroid.show("Question added", ToastAndroid.SHORT);
      await loadQuestions(1);
    } catch (err) {
      showAlert("Error", err.message, () => {});
    } finally {
      setIsAddingQuestion(false);
    }
  }, [
    newQuestion,
    user,
    addProductQuestion,
    productId,
    loadQuestions,
    showAlert,
  ]);

  const handleDeleteQuestion = useCallback(
    async (questionId) => {
      if (!user) {
        showAlert(
          "Login Required",
          "Please login to delete your question.",
          () => {}
        );
        return;
      }
      try {
        await deleteProductQuestion({
          consumerID: user.consumer_id,
          questionId,
        });
        ToastAndroid.show("Question deleted", ToastAndroid.SHORT);
        setQuestions((prev) =>
          prev.filter((q) => q.products_qna_id !== questionId)
        );
      } catch (err) {
        showAlert("Error", err.message, () => {});
      }
    },
    [user, deleteProductQuestion, showAlert]
  );

  const renderRightActions = useCallback(
    (questionId) => (
      <View style={styles.deleteContainer}>
        <IconButton
          icon="delete"
          iconColor="white"
          onPress={() => handleDeleteQuestion(questionId)}
        />
      </View>
    ),
    [handleDeleteQuestion]
  );

  const renderQuestionItem = useCallback(
    ({ item }) => {
      const isUserQuestion = user && item.consumer_id === user.consumer_id;
      return (
        <Swipeable
          renderRightActions={
            isUserQuestion && (!item.answers || item.answers.length === 0)
              ? () => renderRightActions(item.products_qna_id)
              : null
          }
        >
          <QuestionItem item={item} theme={theme} />
        </Swipeable>
      );
    },
    [user, renderRightActions, theme]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreQuestions) {
      loadQuestions(questionPage + 1);
    }
  }, [isLoading, hasMoreQuestions, questionPage, loadQuestions]);

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <FlatList
        data={questions}
        keyExtractor={(item) => item.products_qna_id.toString()}
        renderItem={renderQuestionItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.01}
        ListFooterComponent={
          isLoading && hasMoreQuestions ? (
            <ActivityIndicator size="small" color={theme.colors.textColor} />
          ) : null
        }
      />
      <AddQuestionInput
        newQuestion={newQuestion}
        setNewQuestion={setNewQuestion}
        handleAddQuestion={handleAddQuestion}
        isAddingQuestion={isAddingQuestion}
        theme={theme}
      />
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

const QuestionItem = memo(({ item, theme }) => (
  <View style={styles.questionItem}>
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
        <Text style={styles.questionDate}>{item.date}</Text>
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
            <Text
              style={[styles.answerText, { color: theme.colors.textColor }]}
            >
              {ans.answer}
            </Text>
            <Text style={styles.answerDate}>{ans.date}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
));

const AddQuestionInput = memo(
  ({
    newQuestion,
    setNewQuestion,
    handleAddQuestion,
    isAddingQuestion,
    theme,
  }) => (
    <View
      style={[
        styles.addQuestionContainer,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <TextInput
        value={newQuestion}
        onChangeText={setNewQuestion}
        placeholder="Write a question..."
        placeholderTextColor="#999"
        style={styles.questionInput}
        multiline
      />
      <IconButton
        icon="send"
        onPress={handleAddQuestion}
        iconColor={theme.colors.button}
        disabled={isAddingQuestion}
        accessibilityLabel="Send Question"
      />
    </View>
  )
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  deleteContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    backgroundColor: "#ff4d4d",
    borderRadius: 12,
  },
  questionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 10,
    marginVertical: 5,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  questionTitleContainer: {
    paddingLeft: 10,
  },
  questionAuthor: {
    fontSize: 16,
    fontWeight: "600",
  },
  questionDate: {
    fontSize: 12,
    color: "#666",
  },
  questionUserPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  questionContent: {
    fontSize: 15,
    marginLeft: 50,
    marginTop: 4,
  },
  answersContainer: {
    marginTop: 8,
    marginLeft: 50,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
  },
  answerItem: {
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
  },
  answerDate: {
    fontSize: 12,
    color: "#777",
  },
  addQuestionContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    elevation: 10,
  },
  questionInput: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 20,
    // paddingHorizontal: 10,
  },
});

export default memo(Questions);
