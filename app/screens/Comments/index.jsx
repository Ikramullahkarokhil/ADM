import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useActionSheet } from "@expo/react-native-action-sheet";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useScrollToTop } from "@react-navigation/native";

// Custom date formatter function
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
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [editingComment, setEditingComment] = useState(null);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user, fetchComments, addComment, deleteComment, editComment } =
    useProductStore();

  const inputRef = useRef(null);
  const listRef = useRef(null);
  useScrollToTop(listRef);

  const showAlert = useCallback((title, message, onConfirm) => {
    setAlertConfig({ title, message, onConfirm });
    setAlertVisible(true);
  }, []);

  // Fetch comments with proper handling of the API response structure
  const loadComments = useCallback(
    async (page = 1, isLoadingMoreComments = false, isRefresh = false) => {
      if ((isLoading || isLoadingMore) && !isRefresh) return;
      if (!hasMoreComments && page > 1) return;

      if (isRefresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await fetchComments({
          productID: productId,
          page,
          limitData: 15,
        });

        if (response && response.comments) {
          const { comments: commentsData } = response;
          const newCommentsData = commentsData.data || [];

          // Check if we've reached the end
          if (newCommentsData.length === 0 || page >= commentsData.last_page) {
            setHasMoreComments(false);
          } else {
            setHasMoreComments(true);
          }

          if (page === 1 || isRefresh) {
            // Reset comments for first page or refresh
            setComments([...newCommentsData]);
          } else {
            // Filter out duplicates and add to the end
            const newComments = newCommentsData.filter(
              (newComment) =>
                !comments.some(
                  (existingComment) =>
                    existingComment.product_comments_id ===
                    newComment.product_comments_id
                )
            );
            setComments((prev) => [...prev, ...newComments]);
          }

          setCurrentPage(commentsData.current_page);
          setTotalPages(commentsData.last_page);
        }
      } catch (err) {
        console.error("Error fetching comments:", err);
        showAlert(
          "Error",
          "Failed to load comments. Please try again.",
          () => {}
        );
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else if (page === 1) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [
      fetchComments,
      productId,
      showAlert,
      isLoading,
      isLoadingMore,
      hasMoreComments,
      comments,
    ]
  );

  // Load comments on initial mount
  useEffect(() => {
    loadComments(1);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setHasMoreComments(true);
    loadComments(1, false, true);
  }, [loadComments]);

  // Handle infinite scroll
  const handleEndReached = useCallback(() => {
    if (
      !isLoadingMore &&
      !isLoading &&
      !isRefreshing &&
      currentPage < totalPages &&
      hasMoreComments
    ) {
      loadComments(currentPage + 1, true);
    }
  }, [
    isLoadingMore,
    isLoading,
    isRefreshing,
    currentPage,
    totalPages,
    hasMoreComments,
    loadComments,
  ]);

  const handleAddComment = useCallback(async () => {
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

    // Set adding state
    setIsAddingComment(true);

    // Create the local comment object for optimistic update
    const tempComment = {
      product_comments_id: `temp_${Date.now()}`,
      product_id: productId,
      comment: trimmedComment,
      consumer_id: user.consumer_id,
      date: new Date().toISOString(),
      consumer_name: user.name || "Anonymous",
      consumer_photo: user.photo || null,
      isPending: true,
    };

    // Add new comment at the beginning (since we're showing newest first)
    setComments((prev) => [tempComment, ...prev]);
    setNewComment("");
    Keyboard.dismiss();

    try {
      // Send to server
      const response = await addComment({
        product_id: productId,
        comment: trimmedComment,
        consumer_id: user.consumer_id,
      });

      // Update the comment with the server response data
      setComments((prev) =>
        prev.map((comment) =>
          comment.product_comments_id === tempComment.product_comments_id
            ? {
                ...comment,
                product_comments_id:
                  response?.comment_id || comment.product_comments_id,
                isPending: false,
              }
            : comment
        )
      );

      ToastAndroid.show("Comment added successfully", ToastAndroid.SHORT);
    } catch (err) {
      console.error("Error adding comment:", err);

      // Remove the temporary comment on failure
      setComments((prev) =>
        prev.filter(
          (comment) =>
            comment.product_comments_id !== tempComment.product_comments_id
        )
      );

      ToastAndroid.show("Failed to add comment", ToastAndroid.SHORT);
    } finally {
      setIsAddingComment(false);
    }
  }, [newComment, user, addComment, productId, showAlert]);

  const handleEditComment = useCallback((comment) => {
    if (Platform.OS === "ios") {
      // iOS specific alert with prompt
      Alert.prompt(
        "Edit Comment",
        "Modify your comment below:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (newText) => {
              if (newText && newText.trim()) {
                updateComment(comment, newText.trim());
              }
            },
          },
        ],
        "plain-text",
        comment.comment
      );
    } else {
      // Android - use the input field
      setNewComment(comment.comment);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setEditingComment(comment);
    }
  }, []);

  const updateComment = useCallback(
    (comment, newText) => {
      // Optimistic update
      setComments((prev) =>
        prev.map((c) =>
          c.product_comments_id === comment.product_comments_id
            ? { ...c, comment: newText, isPending: true }
            : c
        )
      );

      // Reset input state if editing
      if (editingComment) {
        setNewComment("");
        setEditingComment(null);
        Keyboard.dismiss();
      }

      // Send to server
      editComment({
        comment_id: comment.product_comments_id,
        consumer_id: user.consumer_id,
        comment: newText,
      })
        .then(() => {
          setComments((prev) =>
            prev.map((c) =>
              c.product_comments_id === comment.product_comments_id
                ? { ...c, isPending: false }
                : c
            )
          );
          ToastAndroid.show("Comment updated", ToastAndroid.SHORT);
        })
        .catch((err) => {
          console.error("Error updating comment:", err);
          // Revert on failure
          setComments((prev) =>
            prev.map((c) =>
              c.product_comments_id === comment.product_comments_id
                ? { ...comment, isPending: false }
                : c
            )
          );
          ToastAndroid.show("Failed to update comment", ToastAndroid.SHORT);
        });
    },
    [editComment, user, editingComment]
  );

  const handleUpdateComment = useCallback(() => {
    if (!editingComment) return handleAddComment();

    const trimmedComment = newComment.trim();
    if (!trimmedComment) return;

    updateComment(editingComment, trimmedComment);
  }, [editingComment, newComment, updateComment, handleAddComment]);

  const handleDeleteComment = useCallback(
    (comment) => {
      showAlert(
        "Delete Comment",
        "Are you sure you want to delete this comment?",
        () => {
          // Optimistic update - mark as deleting
          setComments((prev) =>
            prev.map((c) =>
              c.product_comments_id === comment.product_comments_id
                ? { ...c, isPending: true, isDeleting: true }
                : c
            )
          );

          deleteComment({
            commentId: comment.product_comments_id,
            consumerID: user.consumer_id,
            productId: comment.products_id || productId,
          })
            .then(() => {
              // Remove from list on success
              setComments((prev) =>
                prev.filter(
                  (c) => c.product_comments_id !== comment.product_comments_id
                )
              );
              ToastAndroid.show("Comment deleted", ToastAndroid.SHORT);
            })
            .catch((err) => {
              console.error("Error deleting comment:", err);
              // Revert on failure
              setComments((prev) =>
                prev.map((c) =>
                  c.product_comments_id === comment.product_comments_id
                    ? { ...comment, isPending: false, isDeleting: false }
                    : c
                )
              );
              ToastAndroid.show("Failed to delete comment", ToastAndroid.SHORT);
            });
        }
      );
    },
    [deleteComment, user, showAlert, productId]
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
          if (buttonIndex === 0) {
            handleEditComment(comment);
          } else if (buttonIndex === 1) {
            handleDeleteComment(comment);
          }
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

  // Render a comment item
  const renderCommentItem = useCallback(
    ({ item }) => {
      const isUserComment = user && item.consumer_id === user.consumer_id;
      const isPending = item.isPending;
      const isDeleting = item.isDeleting;

      return (
        <View style={styles.commentItemContainer}>
          <TouchableOpacity
            onPress={() => isUserComment && showCommentOptions(item)}
            activeOpacity={isUserComment ? 0.7 : 1}
            style={[
              styles.commentItem,
              {
                backgroundColor: theme.colors.primary + "20",
                opacity: isPending ? 0.8 : 1,
                borderColor: isDeleting ? "#ff9f43" : "transparent",
                borderWidth: isDeleting ? 1 : 0,
              },
            ]}
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
                  numberOfLines={1}
                >
                  {item.consumer_name || "Anonymous"}
                  {isPending && " (Syncing...)"}
                  {isDeleting && " (Deleting...)"}
                </Text>
                <Text style={styles.commentDate} numberOfLines={1}>
                  {formatDateString(item.date)}
                </Text>
              </View>
              {isUserComment && (
                <TouchableOpacity
                  onPress={() => showCommentOptions(item)}
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

  // Empty list component
  const EmptyListComponent = useCallback(
    () => (
      <View style={styles.emptyCommentContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.textColor} />
        ) : (
          <>
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={64}
              color={theme.colors.textColor + "50"}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
              No comments yet
            </Text>
          </>
        )}
      </View>
    ),
    [isLoading, theme.colors]
  );

  // Footer component for the list (shows loading indicator at bottom)
  const ListFooterComponent = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={theme.colors.textColor} />
        </View>
      );
    }
    return null;
  }, [isLoadingMore, theme.colors]);

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
          estimatedItemSize={120}
          ListEmptyComponent={EmptyListComponent}
          ListFooterComponent={ListFooterComponent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { borderColor: theme.colors.subInactiveColor + "70" },
              ]}
            />
          )}
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
  commentItemContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  commentItem: {
    padding: 16,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentTitleContainer: {
    flex: 1,
    paddingLeft: 12,
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: "600",
  },
  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 8,
    marginLeft: 48,
  },
  commentDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  commentUserPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  addCommentContainer: {
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
  emptyCommentContainer: {
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

export default React.memo(Comments);
