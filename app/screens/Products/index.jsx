import React, {
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
} from "react";
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
import {
  Link,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import useProductStore from "../../../components/api/useProductStore";
import { Icon, useTheme } from "react-native-paper";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import ProductSkeleton from "../../../components/skeleton/productSkeleton";
import Modal from "react-native-modal";
import AlertDialog from "../../../components/ui/AlertDialog"; // Import your custom alert dialog

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
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();

  // State for our long press modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

  // State for the AlertDialog
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertConfirmText, setAlertConfirmText] = useState("Ok");
  const [alertConfirmAction, setAlertConfirmAction] = useState(() => () => {});

  useLayoutEffect(() => {
    navigation.setOptions({
      title: subCategorieName,
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.textColor,
    });
  }, [navigation, theme, subCategorieName]);

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
    if (showmore) {
      (async () => {
        try {
          const subCategoryIds =
            subcategories[mainCategoryId]?.data?.map(
              (subCat) => subCat.categories_id
            ) || [];
          const response = await fetchProductByCategories(subCategoryIds);
          setProducts(response?.data || []);
        } catch (err) {
          console.error("Failed to fetch products for all subcategories:", err);
        }
      })();
    } else {
      setProducts(productsBySubcategory[subcategoryId]?.data || []);
    }
  }, [
    showmore,
    mainCategoryId,
    subcategoryId,
    subcategories,
    productsBySubcategory,
    fetchProductByCategories,
  ]);

  const handleLongPress = (item, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedProduct(item);
    setModalPosition({ top: pageY - 50, left: pageX - 75 });
    setModalVisible(true);
  };

  // Updated add-to-cart handler that uses AlertDialog for errors
  const handleAddToCart = async (product) => {
    if (!user) {
      setAlertTitle("Login Required");
      setAlertMessage("Please log in to add products to your cart.");
      setAlertConfirmAction(() => () => {
        setAlertVisible(false);
        router.navigate("/Login");
      });
      setAlertVisible(true);
      return;
    }

    const productExists = cartItem.some(
      (item) => item.products_id === product.products_id
    );
    if (productExists) {
      setAlertTitle("Product already in cart");
      setAlertMessage("This product is already in your cart.");
      setAlertConfirmText("Go to Cart");
      setAlertConfirmAction(() => () => router.navigate("/screens/Cart"));
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
      setAlertTitle("Error");
      setAlertMessage(error.message || "Error adding product to cart");
      setAlertConfirmAction(() => () => setAlertVisible(false));
      setAlertVisible(true);
    }
  };

  const shareProduct = async (product) => {
    try {
      await Share.share({
        message: `Check out this product: ${product.title}`,
        url: product.product_url,
      });
    } catch (error) {
      console.error("Error sharing product:", error);
    }
  };

  const renderRatingStars = useCallback(
    (item) => (
      <FontAwesome
        name={item?.average_rating >= 1 ? "star" : "star-o"}
        size={14}
        color={item?.average_rating >= 1 ? "#FFD700" : "#ccc"}
        style={styles.starIcon}
      />
    ),
    []
  );

  const renderItem = useCallback(
    ({ item }) => (
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
          style={styles.cardContainer}
          onLongPress={(event) => handleLongPress(item, event)}
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
              <View>
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
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={[styles.brand, { color: theme.colors.textColor }]}
                  >
                    Brand:{" "}
                  </Text>
                  <Text
                    style={[styles.brand, { color: theme.colors.textColor }]}
                  >
                    {item.brand_title}
                  </Text>
                </View>
                <View style={styles.ratingContainer}>
                  {renderRatingStars(item)}
                  <Text
                    style={{
                      color: theme.colors.textColor,
                      paddingLeft: 5,
                    }}
                  >
                    {item.average_rating}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    ),
    [navigation, theme]
  );

  return error ? (
    <View
      style={[
        styles.centerContainer,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <Text style={styles.errorText}>Error: {error}</Text>
    </View>
  ) : (
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
          <View style={styles.centerContainer}>
            <Text
              style={[styles.messageText, { color: theme.colors.textColor }]}
            >
              No products found.
            </Text>
          </View>
        }
        initialNumToRender={10}
        windowSize={5}
        removeClippedSubviews
      />

      {selectedProduct && (
        <Modal
          isVisible={isModalVisible}
          onBackdropPress={() => setModalVisible(false)}
          onBackButtonPress={() => setModalVisible(false)}
          animationIn="zoomIn"
          animationOut="zoomOut"
          backdropOpacity={0}
          style={[
            styles.modal,
            {
              top: modalPosition.top,
              left: modalPosition.left,
            },
          ]}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                handleAddToCart(selectedProduct);
                setModalVisible(false);
              }}
            >
              <Ionicons
                name="cart-outline"
                size={16}
                color={theme.colors.button}
              />
              <Text
                style={[styles.modalButtonText, { color: theme.colors.button }]}
              >
                Add to Cart
              </Text>
            </TouchableOpacity>
            <View
              style={{
                borderWidth: 0.5,
                borderColor: "#ccc",
                width: "100%",
              }}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                shareProduct(selectedProduct);
                setModalVisible(false);
              }}
            >
              <Ionicons
                name="share-social-outline"
                size={16}
                color={theme.colors.button}
              />
              <Text
                style={[styles.modalButtonText, { color: theme.colors.button }]}
              >
                Share
              </Text>
            </TouchableOpacity>
            <View
              style={{
                borderWidth: 0.5,
                borderColor: "#ccc",
                width: "100%",
              }}
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text
                style={[
                  styles.modalCancelButtonText,
                  { color: theme.colors.inactiveColor },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Alert Dialog Component */}
      <AlertDialog
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onDismiss={() => setAlertVisible(false)}
        onConfirm={alertConfirmAction}
        confirmText={alertConfirmText}
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
    color: "#555",
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
    flexDirection: "row",
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
  brand: {
    paddingTop: 5,
  },
  modalContainer: {
    borderRadius: 10,
    alignItems: "center",
    elevation: 100,
    width: 150,
  },
  modalButton: {
    padding: 10,
    width: "100%",
    flexDirection: "row",
  },
  modalButtonText: {
    fontSize: 16,
    textAlign: "left",
    paddingLeft: 4,
  },
  modalCancelButton: {
    width: "100%",
    padding: 10,
  },
  modalCancelButtonText: {
    fontSize: 16,
    textAlign: "left",
  },
  modal: {
    position: "absolute",
    margin: 0,
  },
});

export default ProductList;
