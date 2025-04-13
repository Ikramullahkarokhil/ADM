import React, {
  useEffect,
  useState,
  useCallback,
  memo,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import { StatusBar } from "expo-status-bar";

// Pre-defined constants to avoid recreating arrays on each render
const MONTHS = [
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

const formatReviewDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Simplified ReviewItem component
const ReviewItem = memo(({ review, colors }) => (
  <View style={[styles.reviewItem, { backgroundColor: colors.cardBackground }]}>
    <View style={styles.reviewHeader}>
      <View
        style={[styles.reviewAvatar, { backgroundColor: colors.activeColor }]}
      >
        <Text style={[styles.reviewInitial, { color: colors.primary }]}>
          {review.consumer_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.reviewInfo}>
        <Text style={[styles.reviewerName, { color: colors.textColor }]}>
          {review.consumer_name}
        </Text>
        <Text style={[styles.reviewDate, { color: colors.inactiveColor }]}>
          {formatReviewDate(review.date)}
        </Text>
      </View>
    </View>
    <Text style={[styles.reviewComment, { color: colors.textColor }]}>
      {review.comment}
    </Text>
  </View>
));

// Simple EmptyReviews component
const EmptyReviews = memo(({ colors }) => (
  <View style={styles.emptyReviews}>
    <MaterialCommunityIcons
      name="comment-text-outline"
      size={40}
      color={colors.inactiveColor}
    />
    <Text style={[styles.emptyReviewsText, { color: colors.inactiveColor }]}>
      No reviews yet
    </Text>
  </View>
));

const ReviewsList = () => {
  const { sellerId, title, sellerName } = useLocalSearchParams();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { fetchSellerReviews, user } = useProductStore();
  const { colors } = useTheme();

  // Set navigation options
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: sellerName || "Customer Reviews",
      headerTintColor: colors.buttonText,
      headerStyle: {
        backgroundColor: colors.button,
      },
      headerShadowVisible: false,
    });
  }, [title, navigation, colors]);

  // Load reviews data
  useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      if (!sellerId) return;

      try {
        setLoading(true);
        const response = await fetchSellerReviews({
          sellerId,
          page: 1,
        });

        if (isMounted) {
          setReviews(response.people_reviews.data || []);
          setHasMore(response.people_reviews?.data?.length === 10); // Assuming 10 items per page
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [sellerId, fetchSellerReviews, user?.consumer_id]);

  // Load more reviews
  const loadMoreReviews = useCallback(async () => {
    if (!hasMore || loading || !sellerId) return;

    try {
      const nextPage = page + 1;
      const response = await fetchSellerReviews({
        sellerId,
        page: nextPage,
      });

      if (response.people_reviews.data) {
        setReviews((prevReviews) => {
          const newReviews = [...prevReviews, ...response.people_reviews.data];
          // Update hasMore based on the new reviews count.
          setHasMore(response.people_reviews.total > newReviews.length);
          return newReviews;
        });
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more reviews:", error);
    }
  }, [hasMore, loading, page, sellerId, fetchSellerReviews]);

  // Loading state
  if (loading && page === 1) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.primary }]}
      >
        <View>
          <StatusBar style="light" backgroundColor={colors.button} />
          <Text
            style={{
              fontSize: 18,
              padding: 10,
              borderTopWidth: 0.4,
              color: colors.buttonText,
              backgroundColor: colors.button,
              borderTopColor: colors.buttonText,
            }}
          >
            {title}
          </Text>
        </View>
        <View
          style={{ justifyContent: "center", alignItems: "center", flex: 1 }}
        >
          <ActivityIndicator size="large" color={colors.button} />
          <Text style={[styles.loadingText, { color: colors.button }]}>
            Loading reviews...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View>
        <StatusBar style="light" backgroundColor={colors.button} />
        <Text
          style={{
            fontSize: 18,
            padding: 10,
            borderTopWidth: 0.4,
            color: colors.buttonText,
            backgroundColor: colors.button,
            borderTopColor: colors.buttonText,
          }}
        >
          {title}
        </Text>
      </View>
      {reviews.length === 0 ? (
        <EmptyReviews colors={colors} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item, index) => `review-${index}`}
          renderItem={({ item }) => (
            <ReviewItem review={item} colors={colors} />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreReviews}
          onEndReachedThreshold={0.7}
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator
                size="small"
                color={colors.button}
                style={styles.footerLoader}
              />
            ) : null
          }
          ItemSeparatorComponent={() => (
            <View
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: colors.subInactiveColor,
                marginVertical: 8,
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 14,
  },
  reviewItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewInitial: {
    fontSize: 18,
    fontWeight: "bold",
  },
  reviewInfo: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyReviews: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyReviewsText: {
    marginTop: 16,
    fontSize: 16,
  },
  footerLoader: {
    marginVertical: 16,
  },
});

export default ReviewsList;
