"use client";

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
  ActivityIndicator,
  TextInput,
  Image,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Custom date formatter function (unchanged)
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
  const [editingComment, setEditingComment] = useState(null);

  const { user, fetchComments, addComment, deleteComment, updateComment } =
    useProductStore();

  const isLoadingRef = useRef(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const showAlert = useCallback((title, message, onConfirm) => {
    setAlertConfig({ title, message, onConfirm });
    setAlertVisible(true);
  }, []);

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
    [fetchComments, productId, showAlert]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Comments",
      headerStyle: {
        backgroundColor: theme.colors.primary,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: theme.colors.textColor,
      headerTitleStyle: {
        fontWeight: "600",
      },
    });
  }, [navigation, theme.colors]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  const handleAddComment = useCallback(() => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      showAlert(
        "Empty Comment",
        "Please write a comment before submitting.",
        () => {}
      );
      return;
    }
    if (!user?.consumer_id) {
      showAlert("Login Required", "Please login to add a comment.", () => {});
      return;
    }

    setIsAddingComment(true);

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

    setComments((prev) => [newLocalComment, ...prev]);
    setNewComment("");
    Keyboard.dismiss();

    if (listRef.current) {
      listRef.current.scrollToOffset({ offset: 0, animated: false });
    }

    ToastAndroid.show("Comment added", ToastAndroid.SHORT);

    addComment({
      product_id: productId,
      comment: trimmedComment,
      consumer_id: user.consumer_id,
    })
      .then((newCommentFromServer) => {
        setComments((prev) =>
          prev.map((comment) =>
            comment.product_comments_id === tempId
              ? { ...comment, ...newCommentFromServer }
              : comment
          )
        );
      })
      .catch((err) => {
        console.error("Error syncing comment to server:", err);
        setComments((prev) =>
          prev.filter((comment) => comment.product_comments_id !== tempId)
        );
        ToastAndroid.show("Failed to save comment", ToastAndroid.SHORT);
      })
      .finally(() => {
        setIsAddingComment(false);
      });
  }, [newComment, user, addComment, productId, showAlert]);

  const handleEditComment = useCallback(
    (comment) => {
      if (Platform.OS === "ios") {
        Alert.prompt(
          "Edit Comment",
          "Modify your comment below:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Save",
              onPress: (newText) => {
                if (newText && newText.trim()) {
                  const updatedComment = {
                    ...comment,
                    comment: newText.trim(),
                  };
                  setComments((prev) =>
                    prev.map((c) =>
                      c.product_comments_id === comment.product_comments_id
                        ? updatedComment
                        : c
                    )
                  );
                  updateComment({
                    commentId: comment.product_comments_id,
                    comment: newText.trim(),
                    consumerID: user.consumer_id,
                  }).catch((err) => {
                    console.error("Error updating comment:", err);
                    ToastAndroid.show(
                      "Failed to update comment",
                      ToastAndroid.SHORT
                    );
                  });
                }
              },
            },
          ],
          "plain-text",
          comment.comment
        );
      } else {
        setNewComment(comment.comment);
        if (inputRef.current) {
          inputRef.current.focus();
        }
        setEditingComment(comment);
      }
    },
    [updateComment, user]
  );

  const handleUpdateComment = useCallback(() => {
    if (!editingComment) return handleAddComment();

    const trimmedComment = newComment.trim();
    if (!trimmedComment) return;

    const updatedComment = { ...editingComment, comment: trimmedComment };
    setComments((prev) =>
      prev.map((c) =>
        c.product_comments_id === editingComment.product_comments_id
          ? updatedComment
          : c
      )
    );

    updateComment({
      commentId: editingComment.product_comments_id,
      comment: trimmedComment,
      consumerID: user.consumer_id,
    }).catch((err) => {
      console.error("Error updating comment:", err);
      ToastAndroid.show("Failed to update comment", ToastAndroid.SHORT);
    });

    setNewComment("");
    setEditingComment(null);
    Keyboard.dismiss();
  }, [editingComment, newComment, updateComment, user, handleAddComment]);

  const handleDeleteComment = useCallback(
    (commentId) => {
      showAlert(
        "Delete Comment",
        "Are you sure you want to delete this comment?",
        () => {
          setComments((prev) =>
            prev.filter((c) => c.product_comments_id !== commentId)
          );
          ToastAndroid.show("Comment deleted", ToastAndroid.SHORT);

          deleteComment({
            commentId: commentId,
            consumerID: user.consumer_id,
          }).catch((err) => {
            console.error("Error deleting comment from server:", err);
            ToastAndroid.show("Failed to sync deletion", ToastAndroid.SHORT);
          });
        }
      );
    },
    [deleteComment, user, showAlert]
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
          containerStyle: {
            backgroundColor: theme.colors.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          textStyle: { fontSize: 16 },
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleEditComment(comment);
          else if (buttonIndex === 1)
            handleDeleteComment(comment.product_comments_id);
        }
      );
    },
    [
      showActionSheetWithOptions,
      handleEditComment,
      handleDeleteComment,
      theme.colors,
    ]
  );

  const renderCommentItem = useCallback(
    ({ item }) => {
      const isUserComment = user && item.consumer_id === user.consumer_id;

      return (
        <View style={styles.commentItemContainer}>
          <TouchableOpacity
            onPress={() => isUserComment && showCommentOptions(item)}
            activeOpacity={isUserComment ? 0.7 : 1}
            style={styles.commentItem}
          >
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
                <Text style={styles.commentDate}>
                  {formatDateString(item.date)}
                </Text>
              </View>
              {isUserComment && (
                <TouchableOpacity
                  onPress={() => showCommentOptions(item)}
                  style={styles.optionsButton}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={20}
                    color={theme.colors.textColor + "80"}
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[styles.commentContent, { color: theme.colors.textColor }]}
            >
              {item.comment}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [user, theme.colors, showCommentOptions]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreComments) {
      loadComments(commentPage + 1);
    }
  }, [isLoading, hasMoreComments, commentPage, loadComments]);

  const EmptyListComponent = useCallback(
    () => (
      <View style={styles.emptyCommentContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.textColor} />
        ) : (
          <>
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={48}
              color={theme.colors.textColor + "50"}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
              No comments yet
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textColor + "80" },
              ]}
            >
              Be the first to share your thoughts
            </Text>
          </>
        )}
      </View>
    ),
    [isLoading, theme.colors]
  );

  const ListFooterComponent = useCallback(
    () =>
      hasMoreComments && comments.length > 0 ? (
        <View style={styles.listFooter}>
          <ActivityIndicator size="small" color={theme.colors.textColor} />
        </View>
      ) : null,
    [hasMoreComments, comments.length, theme.colors.textColor]
  );

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <View style={{ flex: 1 }}>
        <FlashList
          ref={listRef}
          data={comments}
          keyExtractor={(item) => item.product_comments_id.toString()}
          renderItem={renderCommentItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          estimatedItemSize={120}
          ListEmptyComponent={EmptyListComponent}
          ListFooterComponent={ListFooterComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          style={[
            styles.addCommentContainer,
            {
              backgroundColor: theme.colors.primary,
              borderTopColor: theme.colors.inactiveColor + "30",
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              value={newComment}
              onChangeText={setNewComment}
              placeholder={
                editingComment ? "Edit your comment..." : "Write a comment..."
              }
              placeholderTextColor={theme.colors.inactiveColor}
              style={[
                styles.commentInput,
                {
                  backgroundColor: theme.colors.primary + "80",
                  borderColor: theme.colors.inactiveColor + "30",
                  color: theme.colors.textColor,
                },
              ]}
              multiline
              maxLength={500}
              accessibilityLabel="Comment Input"
            />
          </View>
          <TouchableOpacity
            onPress={editingComment ? handleUpdateComment : handleAddComment}
            disabled={isAddingComment || !newComment.trim()}
            style={[
              styles.sendButton,
              {
                backgroundColor: newComment.trim()
                  ? theme.colors.button
                  : theme.colors.button + "50",
                opacity: isAddingComment ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Send Comment"
          >
            {isAddingComment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons
                name={editingComment ? "check" : "send"}
                size={20}
                color="#fff"
              />
            )}
          </TouchableOpacity>
          {editingComment && (
            <TouchableOpacity
              onPress={() => {
                setEditingComment(null);
                setNewComment("");
              }}
              style={styles.cancelButton}
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
  container: { flex: 1 },
  commentItemContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  commentItem: { padding: 16 },
  commentHeader: { flexDirection: "row", alignItems: "center" },
  commentTitleContainer: { flex: 1, paddingLeft: 12 },
  commentAuthor: { fontSize: 15, fontWeight: "600" },
  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 8,
    marginLeft: 48,
  },
  commentDate: { fontSize: 12, color: "#888", marginTop: 2 },
  commentUserPhoto: { width: 36, height: 36, borderRadius: 18 },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    position: "absolute",
    paddingBottom: 40,
    bottom: 0,
  },
  inputWrapper: { flex: 1, flexDirection: "row", alignItems: "center" },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  commentInput: {
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
  listFooter: { paddingVertical: 20, alignItems: "center" },
  emptyCommentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: { fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySubtext: { fontSize: 14, textAlign: "center", marginTop: 8 },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 24,
  },
  emptyButtonText: { color: "#fff", fontWeight: "500" },
  optionsButton: { padding: 4 },
});

export default React.memo(Comments);
