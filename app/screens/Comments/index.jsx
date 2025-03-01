import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TextInput,
  Image,
  ToastAndroid,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { IconButton, useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog";
import { FlashList } from "@shopify/flash-list";

const Comments = () => {
  const { productId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const { user, fetchComments, addComment, deleteComment, updateComment } =
    useProductStore();

  const isLoadingRef = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Comments",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme.colors.primary, theme.colors.textColor]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  const loadComments = useCallback(
    async (page = 1) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      try {
        const data = await fetchComments({ productID: productId, page });
        if (page === 1) {
          setComments(data || []);
        } else {
          setComments((prev) => [...prev, ...data]);
        }
        setCommentPage(page);
        setHasMoreComments(data?.length > 0);
      } catch (err) {
        console.error("Error fetching comments:", err);
        showAlert("Error", "Failed to load comments.", () => {});
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [fetchComments, productId, showAlert],
  );

  const showAlert = (title, message, onConfirm) => {
    setAlertConfig({ title, message, onConfirm });
    setAlertVisible(true);
  };

  const handleAddComment = useCallback(() => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      showAlert(
        "Empty Comment",
        "Please write a comment before submitting.",
        () => {},
      );
      return;
    }
    if (!user?.consumer_id) {
      showAlert("Login Required", "Please login to add a comment.", () => {});
      return;
    }

    setIsAddingComment(true);

    // Create temporary comment with a unique temporary ID
    const tempId = `temp_${Date.now()}`;
    const newLocalComment = {
      product_comments_id: tempId,
      product_id: productId,
      comment: trimmedComment,
      consumer_id: user.consumer_id,
      date: new Date().toISOString(),
      consumer_name: user.name || "Anonymous",
      consumer_photo: user.photo || null,
    };

    // Add comment locally first
    setComments((prev) => [...prev, newLocalComment]);
    setNewComment("");
    Keyboard.dismiss();
    ToastAndroid.show("Comment added", ToastAndroid.SHORT);

    // Then sync with server in background
    addComment({
      product_id: productId,
      comment: trimmedComment,
      consumer_id: user.consumer_id,
    })
      .then((newCommentFromServer) => {
        // Update the temporary comment with server data
        setComments((prev) =>
          prev.map((comment) =>
            comment.product_comments_id === tempId
              ? { ...comment, ...newCommentFromServer }
              : comment,
          ),
        );
      })
      .catch((err) => {
        console.error("Error syncing comment to server:", err);
        // Remove the comment if server sync fails
        setComments((prev) =>
          prev.filter((comment) => comment.product_comments_id !== tempId),
        );
        ToastAndroid.show("Failed to save comment", ToastAndroid.SHORT);
      })
      .finally(() => {
        setIsAddingComment(false);
      });
  }, [newComment, user, addComment, productId, showAlert]);

  const handleEditComment = useCallback(
    (comment) => {
      Alert.prompt(
        "Edit Comment",
        "Modify your comment below:",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Save",
            onPress: (newText) => {
              if (newText && newText.trim()) {
                const updatedComment = { ...comment, comment: newText.trim() };
                setComments((prev) =>
                  prev.map((c) =>
                    c.product_comments_id === comment.product_comments_id
                      ? updatedComment
                      : c,
                  ),
                );
                // Perform API update in background
                updateComment({
                  commentId: comment.product_comments_id,
                  comment: newText.trim(),
                  consumerID: user.consumer_id,
                }).catch((err) => {
                  console.error("Error updating comment:", err);
                  ToastAndroid.show(
                    "Failed to update comment",
                    ToastAndroid.SHORT,
                  );
                });
              }
            },
          },
        ],
        "plain-text",
        comment.comment,
      );
    },
    [updateComment, user],
  );

  const handleDeleteComment = useCallback(
    (commentId) => {
      setComments((prev) =>
        prev.filter((c) => c.product_comments_id !== commentId),
      );
      ToastAndroid.show("Comment deleted", ToastAndroid.SHORT);

      // Then sync with server in background
      deleteComment({
        commentId: commentId,
        consumerID: user.consumer_id,
      }).catch((err) => {
        console.error("Error deleting comment from server:", err);
        ToastAndroid.show("Failed to sync deletion", ToastAndroid.SHORT);
      });
    },
    [deleteComment, user, comments],
  );

  const showCommentOptions = useCallback(
    (comment) => {
      const options = ["Edit", "Delete", "Cancel"];
      const cancelButtonIndex = 2;
      const destructiveButtonIndex = 1;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          tintColor: theme.colors.textColor,
          containerStyle: { backgroundColor: theme.colors.primary },
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleEditComment(comment);
          } else if (buttonIndex === 1) {
            handleDeleteComment(comment.product_comments_id);
          }
        },
      );
    },
    [showActionSheetWithOptions, handleEditComment, handleDeleteComment],
  );

  const renderCommentItem = useCallback(
    ({ item }) => {
      const isUserComment = user && item.consumer_id === user.consumer_id;
      const CommentComponent = (
        <View style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <Image
              source={
                item.consumer_photo
                  ? { uri: item.consumer_photo }
                  : require("../../../assets/images/imageSkeleton.jpg")
              }
              style={styles.commentUserPhoto}
              accessibilityLabel="User Photo"
            />
            <View style={styles.commentTitleContainer}>
              <Text
                style={[
                  styles.commentAuthor,
                  { color: theme.colors.textColor },
                ]}
              >
                {item.consumer_name || "Anonymous"}
              </Text>
              <Text style={styles.commentDate}>{item.date}</Text>
            </View>
          </View>
          <Text
            style={[styles.commentContent, { color: theme.colors.textColor }]}
          >
            {item.comment}
          </Text>
        </View>
      );
      return isUserComment ? (
        <TouchableOpacity onPress={() => showCommentOptions(item)}>
          {CommentComponent}
        </TouchableOpacity>
      ) : (
        CommentComponent
      );
    },
    [user, theme.colors.textColor, showCommentOptions],
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreComments) {
      loadComments(commentPage + 1);
    }
  }, [isLoading, hasMoreComments, commentPage, loadComments]);

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.product_comments_id.toString()}
        renderItem={renderCommentItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.flatListContent}
        estimatedItemSize={96}
        ListEmptyComponent={
          isLoading && hasMoreComments ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.textColor}
              style={styles.emptyCommentContainer}
            />
          ) : (
            <View
              style={[
                styles.emptyCommentContainer,
                { justifyContent: "center", alignItems: "center" },
              ]}
            >
              <Text style={{ color: theme.colors.textColor, fontSize: 18 }}>
                No comments
              </Text>
            </View>
          )
        }
      />
      <KeyboardAvoidingView>
        <View
          style={[
            styles.addCommentContainer,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Write a comment..."
            placeholderTextColor={theme.colors.inactiveColor}
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.inactiveColor,
                color: theme.colors.textColor,
              },
            ]}
            multiline
            accessibilityLabel="Comment Input"
          />
          <IconButton
            icon="send"
            onPress={handleAddComment}
            iconColor={theme.colors.button}
            disabled={isAddingComment}
            accessibilityLabel="Send Comment"
          />
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
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  commentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentTitleContainer: {
    paddingLeft: 10,
  },
  commentAuthor: {
    fontSize: 16,
    fontWeight: "bold",
  },
  commentContent: {
    fontSize: 15,
    paddingTop: 5,
    marginLeft: 45,
  },
  commentDate: {
    fontSize: 12,
    color: "#666",
  },
  commentUserPhoto: {
    width: 35,
    height: 35,
    borderRadius: 20,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingBottom: 40,
    position: "absolute",
    bottom: 0,
    elevation: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#fff",
    fontSize: 15,
    maxHeight: 100,
  },
  listFooter: {
    marginBottom: 20,
  },
  emptyCommentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(Comments);
