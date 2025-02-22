import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  ToastAndroid,
} from "react-native";
import { Link, useLocalSearchParams, useNavigation } from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { useTheme } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
import ProductSkeleton from "../../../components/skeleton/productSkeleton";
import { useActionSheet } from "@expo/react-native-action-sheet";
import AlertDialog from "../../../components/ui/AlertDialog";

const ProductList = () => {
  const { subcategoryId, mainCategoryId, showmore, subCategorieName } =
    useLocalSearchParams();
  const {
    subcategories,
    productsBySubcategory,
    fetchProductsBySubcategory,
    fetchProductByCategories,
    loading,
    error,
    addToCart,
    user,
    cartItem,
  } = useProductStore();
  const [products, setProducts] = useState([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertState, setAlertState] = useState({
    title: "",
    message: "",
    confirmText: "Ok",
    confirmAction: () => setAlertVisible(false),
  });

  const theme = useTheme();
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();

  navigation.setOptions({
    title: subCategorieName,
    headerStyle: { backgroundColor: theme.colors.primary },
    headerTintColor: theme.colors.textColor,
  });

  const loadProducts = useCallback(async () => {
    try {
      await fetchProductsBySubcategory(subcategoryId);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, [subcategoryId, fetchProductsBySubcategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (showmore) {
        try {
          const subCategoryIds =
            subcategories[mainCategoryId]?.map(
              (subCat) => subCat.categories_id
            ) || [];
          const response = await fetchProductByCategories(subCategoryIds);
          setProducts(response);
        } catch (err) {
          console.error("Failed to fetch products for all subcategories:", err);
        }
      } else {
        setProducts(productsBySubcategory[subcategoryId] || []);
      }
    };
    fetchProducts();
  }, [
    showmore,
    mainCategoryId,
    subcategoryId,
    subcategories,
    productsBySubcategory,
    fetchProductByCategories,
  ]);

  const handleAddToCart = useCallback(
    async (product) => {
      if (!user) {
        setAlertState({
          title: "Login Required",
          message: "Please log in to add products to your cart.",
          confirmAction: () => navigation.navigate("Login"),
        });
        setAlertVisible(true);
        return;
      }

      if (cartItem.some((item) => item.products_id === product.products_id)) {
        setAlertState({
          title: "Product already in cart",
          message: "This product is already in your cart.",
          confirmText: "Go to Cart",
          confirmAction: () => navigation.navigate("screens/Cart"),
        });
        setAlertVisible(true);
        return;
      }

      try {
        await addToCart({
          productID: product.products_id,
          consumerID: user.consumer_id,
        });
        ToastAndroid.show("Product added to cart", ToastAndroid.SHORT);
      } catch (error) {
        setAlertState({
          title: "Error",
          message: error.message || "Error adding product to cart",
        });
        setAlertVisible(true);
      }
    },
    [user, cartItem, addToCart, navigation]
  );

  const shareProduct = useCallback(async (product) => {
    try {
      await Share.share({
        message: `Check out this product: ${product.title}`,
        url: product.product_url,
      });
    } catch (error) {
      console.error("Error sharing product:", error);
    }
  }, []);

  const showProductOptions = useCallback(
    (product) => {
      const options = ["Add to Cart", "Share"];
      const cancelButtonIndex = 2;

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          tintColor: theme.colors.button,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              handleAddToCart(product);
              break;
            case 1:
              shareProduct(product);
              break;
          }
        }
      );
    },
    [handleAddToCart, shareProduct, theme.colors.button]
  );

  const renderRatingStars = useCallback(
    (item) => {
      if (!item?.average_rating || item.average_rating === 0) {
        return null;
      }
      return (
        <View style={styles.ratingContainer}>
          <FontAwesome
            name={item.average_rating >= 1 ? "star" : "star-o"}
            size={14}
            color={item.average_rating >= 1 ? "#FFD700" : "#ccc"}
            style={styles.starIcon}
          />
          <Text style={{ color: theme.colors.textColor, paddingLeft: 5 }}>
            {item.average_rating}
          </Text>
        </View>
      );
    },
    [theme.colors.textColor]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.cardContainer}>
        <Link
          href={{
            pathname: "/screens/ProductDetail",
            params: {
              subcategoryId: item.categories_id,
              categoryProductId: item.products_id,
            },
          }}
          asChild
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={() => {
              console.log("Long press detected:", item.title); // Debug log
              showProductOptions(item);
            }}
            delayLongPress={500}
          >
            <View style={styles.card}>
              <Image
                source={
                  item.product_image
                    ? { uri: item.product_image }
                    : require("../../../assets/images/imageSkeleton.jpg")
                }
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <Text
                  style={[
                    styles.productTitle,
                    { color: theme.colors.textColor },
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.productPrice, { color: theme.colors.button }]}
                >
                  {item.spu}
                </Text>
                <View style={styles.brandContainer}>
                  <Text
                    style={[styles.brand, { color: theme.colors.textColor }]}
                  >
                    Brand: {item.brand_title}
                  </Text>
                </View>
                {renderRatingStars(item)}
              </View>
            </View>
          </TouchableOpacity>
        </Link>
      </View>
    ),
    [theme, showProductOptions, renderRatingStars]
  );

  if (error) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: theme.colors.primary, flex: 1 }}>
      <FlatList
        data={loading ? Array(6).fill(null) : products}
        renderItem={loading ? () => <ProductSkeleton /> : renderItem}
        keyExtractor={(item, index) =>
          item ? item.products_id.toString() : index.toString()
        }
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.separator,
              { borderTopColor: theme.colors.inactiveColor },
            ]}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { backgroundColor: theme.colors.background },
        ]}
        ListEmptyComponent={
          !loading && (
            <View style={styles.centerContainer}>
              <Text
                style={[styles.messageText, { color: theme.colors.textColor }]}
              >
                No products found.
              </Text>
            </View>
          )
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />

      <AlertDialog
        visible={alertVisible}
        title={alertState.title}
        message={alertState.message}
        onDismiss={() => setAlertVisible(false)}
        onConfirm={alertState.confirmAction}
        confirmText={alertState.confirmText}
        cancelText="Cancel"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  messageText: {
    fontSize: 16,
    textAlign: "center",
  },
  cardContainer: {
    marginVertical: 5,
    borderRadius: 10,
  },
  card: {
    flexDirection: "row",
    overflow: "hidden",
    margin: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 15,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
  },
  brandContainer: {
    paddingTop: 5,
  },
  brand: {
    fontSize: 14,
  },
  separator: {
    borderTopWidth: 0.5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starIcon: {
    marginRight: 1,
  },
});

export default React.memo(ProductList);
