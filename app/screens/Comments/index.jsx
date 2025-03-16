import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
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

// Utility for exponential backoff retry
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Comments = () => {
  const { productId, numOfComments } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [editingComment, setEditingComment] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryAfter, setRetryAfter] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const { user, fetchComments, addComment, deleteComment, editComment } =
    useProductStore();

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const commentsCache = useRef({});
  const retryTimeoutRef = useRef(null);
  const isMounted = useRef(true);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const showAlert = useCallback((title, message, onConfirm) => {
    setAlertConfig({ title, message, onConfirm });
    setAlertVisible(true);
  }, []);

  // Fetch comments with retry logic
  const fetchCommentsWithRetry = useCallback(
    async (page, maxRetries = 3) => {
      try {
        // Check cache first
        const cacheKey = `${productId}_${page}`;
        if (commentsCache.current[cacheKey]) {
          return commentsCache.current[cacheKey];
        }

        const data = await fetchComments({
          productID: productId,
          page,
          limitData: 15,
        });
        // Cache the result
        commentsCache.current[cacheKey] = data;
        setRetryCount(0);
        return data;
      } catch (err) {
        console.error("Error fetching comments:", err);

        // Handle rate limiting specifically
        if (err.message && err.message.includes("Too Many Attempts")) {
          // Extract retry-after header if available
          const retryAfterSecs =
            err.retryAfter || Math.pow(2, retryCount) * 1000;
          setRetryAfter(retryAfterSecs);

          if (retryCount < maxRetries) {
            setIsRetrying(true);
            setRetryCount((prev) => prev + 1);

            // Wait with exponential backoff
            await wait(retryAfterSecs);

            if (isMounted.current) {
              setIsRetrying(false);
              // Retry the request
              return fetchCommentsWithRetry(page, maxRetries);
            }
          } else {
            throw new Error(
              "Maximum retry attempts reached. Please try again later."
            );
          }
        }
        throw err;
      }
    },
    [fetchComments, productId, retryCount]
  );

  const loadComments = useCallback(
    async (page = 1, isLoadingMoreComments = false) => {
      if (isLoading || isLoadingMore || isRetrying) return;

      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const data = await fetchCommentsWithRetry(page);

        if (isMounted.current) {
          if (page === 1) {
            setComments(data || []);
          } else {
            setComments((prev) => [...prev, ...(data || [])]);
          }
          setCommentPage(page);
          // Check if we've loaded all comments based on numOfComments
          const totalCommentsLoaded =
            page === 1
              ? data?.length || 0
              : comments.length + (data?.length || 0);

          setHasMoreComments(
            totalCommentsLoaded < parseInt(numOfComments || "0", 10)
          );
        }
      } catch (err) {
        if (isMounted.current) {
          if (err.message.includes("Maximum retry attempts")) {
            showAlert(
              "Rate Limit Exceeded",
              "You've reached the rate limit. Please try again later.",
              () => {}
            );
          } else {
            showAlert(
              "Error",
              "Failed to load comments. Please try again.",
              () => {}
            );
            console.log(err);
          }
        }
      } finally {
        if (isMounted.current) {
          if (page === 1) {
            setIsLoading(false);
          } else {
            setIsLoadingMore(false);
          }
        }
      }
    },
    [
      fetchCommentsWithRetry,
      showAlert,
      isLoading,
      isLoadingMore,
      isRetrying,
      numOfComments,
    ]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Comments",
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme.colors]);

  // Only load comments on initial mount
  useEffect(() => {
    // Only fetch comments on initial load
    if (comments.length === 0) {
      loadComments(1);
    }
  }, []);

  // Add a separate effect to handle comment updates
  useEffect(() => {
    // Invalidate cache when comments are modified
    return () => {
      commentsCache.current = {};
    };
  }, []);

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

    // Create a local ID for the new comment
    const localId = `local_${Date.now()}`;

    // Create the local comment object
    const newLocalComment = {
      product_comments_id: localId,
      product_id: productId,
      comment: trimmedComment,
      consumer_id: user.consumer_id,
      date: new Date().toISOString(),
      consumer_name: user.name || "Anonymous",
      consumer_photo: user.photo || null,
    };

    // Update UI immediately
    setComments((prev) => [...prev, newLocalComment]);
    setNewComment("");
    Keyboard.dismiss();

    ToastAndroid.show("Comment added", ToastAndroid.SHORT);

    // Fire and forget - send to server in background
    addComment({
      product_id: productId,
      comment: trimmedComment,
      consumer_id: user.consumer_id,
    }).catch((err) => {
      console.error(
        "Error adding comment to server (will sync on refresh):",
        err
      );
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
                  // Store original comment for potential rollback
                  const originalComment = { ...comment };

                  // Update UI immediately
                  const updatedComment = {
                    ...comment,
                    comment: newText.trim(),
                    isEditing: true,
                  };

                  setComments((prev) =>
                    prev.map((c) =>
                      c.product_comments_id === comment.product_comments_id
                        ? updatedComment
                        : c
                    )
                  );

                  // Use editComment from useProductStore
                  editComment({
                    comment_id: comment.product_comments_id,
                    consumer_id: user.consumer_id,
                    comment: newText.trim(),
                  })
                    .then(() => {
                      // Update succeeded, remove the editing flag
                      setComments((prev) =>
                        prev.map((c) =>
                          c.product_comments_id === comment.product_comments_id
                            ? { ...updatedComment, isEditing: false }
                            : c
                        )
                      );

                      // Invalidate cache after editing
                      commentsCache.current = {};
                    })
                    .catch((err) => {
                      console.error("Error updating comment:", err);
                      // Revert to original comment on failure
                      setComments((prev) =>
                        prev.map((c) =>
                          c.product_comments_id === comment.product_comments_id
                            ? originalComment
                            : c
                        )
                      );
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
    [editComment, user]
  );

  const handleUpdateComment = useCallback(() => {
    if (!editingComment) return handleAddComment();

    const trimmedComment = newComment.trim();
    if (!trimmedComment) return;

    // Store original comment for potential rollback
    const originalComment = { ...editingComment };
    const updatedComment = { ...editingComment, comment: trimmedComment };

    // Update UI immediately
    setComments((prev) =>
      prev.map((c) =>
        c.product_comments_id === editingComment.product_comments_id
          ? { ...updatedComment, isEditing: true }
          : c
      )
    );

    setNewComment("");
    setEditingComment(null);
    Keyboard.dismiss();

    // Use editComment from useProductStore
    editComment({
      comment_id: editingComment.product_comments_id,
      consumer_id: user.consumer_id,
      comment: trimmedComment,
    })
      .then(() => {
        // Update succeeded, remove the editing flag
        setComments((prev) =>
          prev.map((c) =>
            c.product_comments_id === updatedComment.product_comments_id
              ? { ...c, isEditing: false }
              : c
          )
        );

        // Invalidate cache after updating
        commentsCache.current = {};
      })
      .catch((err) => {
        console.error("Error updating comment:", err);
        // Revert to original comment on failure
        setComments((prev) =>
          prev.map((c) =>
            c.product_comments_id === originalComment.product_comments_id
              ? originalComment
              : c
          )
        );
        ToastAndroid.show("Failed to update comment", ToastAndroid.SHORT);
      });
  }, [editingComment, newComment, editComment, user, handleAddComment]);

  const handleDeleteComment = useCallback(
    (comment) => {
      showAlert(
        "Delete Comment",
        "Are you sure you want to delete this comment?",
        () => {
          // Store the comment being deleted in case we need to restore it
          const commentToDelete = comments.find(
            (c) => c.product_comments_id === comment.product_comments_id
          );

          // Update UI immediately
          setComments((prev) =>
            prev.filter(
              (c) => c.product_comments_id !== comment.product_comments_id
            )
          );

          ToastAndroid.show("Comment deleted", ToastAndroid.SHORT);

          deleteComment({
            commentId: comment.product_comments_id,
            consumerID: user.consumer_id,
            productId: comment.products_id,
          })
            .then(() => {
              // Invalidate cache after deleting
              commentsCache.current = {};
            })
            .catch((err) => {
              console.error("Error deleting comment from server:", err);
              // Restore the comment if deletion fails
              if (commentToDelete) {
                setComments((prev) => [...prev, commentToDelete]);
              }
              ToastAndroid.show("Failed to delete comment", ToastAndroid.SHORT);
            });
        }
      );
    },
    [deleteComment, user, showAlert, comments]
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
          else if (buttonIndex === 1) handleDeleteComment(comment);
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

  // Memoize the comment item renderer for better performance
  const renderCommentItem = useCallback(
    ({ item }) => {
      const isUserComment = user && item.consumer_id === user.consumer_id;
      const isTemporary = item.isTemp || item.isEditing;

      return (
        <View style={styles.commentItemContainer}>
          <TouchableOpacity
            onPress={() => isUserComment && showCommentOptions(item)}
            activeOpacity={isUserComment ? 0.7 : 1}
            style={[
              styles.commentItem,
              {
                backgroundColor: theme.colors.primary + "20",
                opacity: isTemporary ? 0.8 : 1,
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
                  {isTemporary && " (Syncing...)"}
                </Text>
                <Text style={styles.commentDate} numberOfLines={1}>
                  {formatDateString(item.date)}
                </Text>
              </View>
              {isUserComment && !isTemporary && (
                <TouchableOpacity
                  onPress={() => showCommentOptions(item)}
                  style={styles.optionsButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={20}
                    color={theme.colors.textColor + "80"}
                  />
                </TouchableOpacity>
              )}
              {isTemporary && (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textColor + "80"}
                  style={styles.optionsButton}
                />
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

  // Debounced load more handler
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && !isRetrying && hasMoreComments) {
      loadComments(commentPage + 1, true);
    }
  }, [
    isLoadingMore,
    isLoading,
    isRetrying,
    hasMoreComments,
    commentPage,
    loadComments,
  ]);
  // Retry timer display
  const retryTimerDisplay = useMemo(() => {
    if (!isRetrying || retryAfter <= 0) return null;
    return `Retrying in ${Math.ceil(retryAfter / 1000)}s`;
  }, [isRetrying, retryAfter]);

  const EmptyListComponent = useCallback(
    () => (
      <View style={styles.emptyCommentContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.textColor} />
        ) : isRetrying ? (
          <>
            <MaterialCommunityIcons
              name="timer-sand"
              size={48}
              color={theme.colors.textColor + "70"}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textColor }]}>
              Rate limit exceeded
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textColor + "80" },
              ]}
            >
              {retryTimerDisplay || "Retrying soon..."}
            </Text>
          </>
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
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.textColor + "80" },
              ]}
            >
              Be the first to share your thoughts on this product
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyButton,
                { backgroundColor: theme.colors.button },
              ]}
              onPress={() => inputRef.current?.focus()}
            >
              <Text style={styles.emptyButtonText}>Write a comment</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    ),
    [isLoading, isRetrying, retryTimerDisplay, theme.colors]
  );

  const ListFooterComponent = useCallback(() => {
    if (isRetrying) {
      return (
        <View style={styles.retryContainer}>
          <ActivityIndicator size="small" color={theme.colors.textColor} />
          <Text style={[styles.retryText, { color: theme.colors.textColor }]}>
            {retryTimerDisplay || "Retrying..."}
          </Text>
        </View>
      );
    }

    if (
      hasMoreComments &&
      comments.length > 0 &&
      comments.length < numOfComments
    ) {
      return (
        <TouchableOpacity
          style={[
            styles.loadMoreButton,
            { backgroundColor: theme.colors.button },
          ]}
          onPress={handleLoadMore}
          disabled={isLoadingMore || isLoading}
        >
          {isLoadingMore ? (
            <View style={styles.loadMoreButtonContent}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.loadMoreButtonText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.loadMoreButtonContent}>
              <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.loadMoreButtonText}>
                Show More Comments ({comments.length} of {numOfComments})
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    } else if (comments.length > 0) {
      return (
        <Text
          style={[
            styles.noMoreCommentsText,
            { color: theme.colors.textColor + "80" },
          ]}
        >
          No more comments to load
        </Text>
      );
    }

    return null;
  }, [
    hasMoreComments,
    comments.length,
    theme.colors,
    handleLoadMore,
    isLoadingMore,
    isLoading,
    isRetrying,
    retryTimerDisplay,
    numOfComments,
  ]);

  return (
    <GestureHandlerRootView
      style={[styles.container, { backgroundColor: theme.colors.primary }]}
    >
      <View style={{ flex: 1 }}>
        <FlashList
          ref={listRef}
          data={comments}
          keyExtractor={(item) => {
            // Ensure we always have a valid key even if product_comments_id is missing
            if (!item || !item.product_comments_id) {
              console.warn("Missing product_comments_id for item:", item);
              return `fallback_${Date.now()}_${Math.random()}`;
            }
            return item.product_comments_id.toString();
          }}
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
  loadMoreButton: {
    marginVertical: 16,
    marginHorizontal: 32,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  noMoreCommentsText: {
    textAlign: "center",
    paddingVertical: 16,
    fontStyle: "italic",
  },
  emptyCommentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  optionsButton: {
    padding: 4,
  },
  separator: {
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  retryContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  retryText: {
    fontSize: 14,
  },
});

export default React.memo(Comments);
