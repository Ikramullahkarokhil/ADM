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
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { IconButton, useTheme } from "react-native-paper";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import useProductStore from "../../../components/api/useProductStore";
import AlertDialog from "../../../components/ui/AlertDialog"; // Import the AlertDialog

const Comments = () => {
  const { productId } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();

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

  const { user, fetchComments, addComment, deleteComment } = useProductStore();

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

  // Load the first page of comments on initial load
  useEffect(() => {
    loadComments(1);
  }, []);

  const loadComments = useCallback(
    async (page = 1) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setIsLoading(true);
      try {
        const data = await fetchComments({ productID: productId, page });
        if (page === 1) {
          setComments(data || []); // Replace comments for the first page
        } else {
          setComments((prev) => [...prev, ...data]); // Append comments for subsequent pages
        }
        setCommentPage(page);
        setHasMoreComments(data?.length > 0); // Check if there are more comments to load
      } catch (err) {
        console.error("Error fetching comments:", err);
        showAlert("Error", "Failed to load comments.", () => {});
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [fetchComments, productId]
  );

  const showAlert = (title, message, onConfirm) => {
    setAlertConfig({ title, message, onConfirm });
    setAlertVisible(true);
  };

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
    if (!user) {
      showAlert("Login Required", "Please login to add a comment.", () => {});
      return;
    }
    setIsAddingComment(true);
    try {
      await addComment({
        product_id: productId,
        comment: trimmedComment,
        consumer_id: user.consumer_id,
      });
      setNewComment("");
      ToastAndroid.show("Comment added", ToastAndroid.SHORT);
      loadComments(1); // Reload the first page to show the new comment
    } catch (err) {
      showAlert("Error", err.message, () => {});
    } finally {
      setIsAddingComment(false);
    }
  }, [newComment, user, addComment, productId, loadComments]);

  const handleDeleteComment = useCallback(
    async (commentId) => {
      try {
        await deleteComment({
          commentId: commentId,
          consumerID: user.consumer_id,
        });
        ToastAndroid.show("Comment deleted", ToastAndroid.SHORT);
        setComments((prev) =>
          prev.filter((comment) => comment.product_comments_id !== commentId)
        );
      } catch (err) {
        showAlert("Error", err.message, () => {});
      }
    },
    [user, deleteComment]
  );

  const renderRightActions = (commentId) => (
    <View style={styles.deleteContainer}>
      <IconButton
        icon="delete"
        iconColor="white"
        onPress={() => handleDeleteComment(commentId)}
      />
    </View>
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
        <Swipeable
          renderRightActions={() =>
            renderRightActions(item.product_comments_id)
          }
        >
          {CommentComponent}
        </Swipeable>
      ) : (
        CommentComponent
      );
    },
    [user, theme.colors.textColor, handleDeleteComment]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMoreComments) {
      loadComments(commentPage + 1); // Load the next page
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
        ListFooterComponent={
          isLoading && hasMoreComments ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.textColor}
              style={styles.listFooter}
            />
          ) : null
        }
      />
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
          placeholderTextColor="#999"
          style={styles.commentInput}
          multiline
        />
        <IconButton
          icon="send"
          onPress={handleAddComment}
          iconColor={theme.colors.button}
          disabled={isAddingComment}
          accessibilityLabel="Send Comment"
        />
      </View>
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
  deleteContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    backgroundColor: "#ff4d4d",
    borderRadius: 12,
  },
  commentItem: {
    padding: 10,
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
    position: "absolute",
    padding: 10,
    elevation: 10,
    paddingBottom: 40,
    bottom: 0,
  },
  commentInput: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 40,
    paddingHorizontal: 15,
    height: 45,
  },
  listFooter: {
    marginBottom: 120,
  },
});

export default React.memo(Comments);
