import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://demo.ucsofficialstore.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const initialState = {
  mostSaleProducts: [],
  topSellers: [],
  mainCategories: [],
  subcategories: {},
  productData: [],
  favProducts: [],
  cartItem: [],
  orders: [],
  productsBySubcategory: {},
  productQuestions: null,
  productComments: null,
  consumerBillingAddress: [],
  loginError: null,
  user: null,
  profileData: null,
  loginLoading: false,
  loading: false,
  error: null,
};

const useProductStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // Helper function to handle API requests
      apiRequest: async (endpoint, options = {}) => {
        set({ loading: true, error: null });
        try {
          const response = await api.request({
            url: endpoint,
            ...options,
          });
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          set({ error: errorMessage, loading: false });
          throw new Error(errorMessage);
        } finally {
          set({ loading: false });
        }
      },

      // Fetch Most Sale Products
      fetchMostSaleProducts: async () => {
        const data = await get().apiRequest("/get-most-sale-products");
        set({ mostSaleProducts: data });
      },

      // Fetch New Arrivals
      fetchNewArrivals: async (page) => {
        const data = await get().apiRequest(
          `/get-new-arrival-products?page=${page}`
        );
        return data ?? [];
      },

      // Fetch Just For You
      fetchJustForYou: async (page) => {
        const data = await get().apiRequest(
          `/get-just-foryou-products?page=${page}`
        );
        return data ?? [];
      },

      // Fetch Top Sellers
      fetchTopSellers: async () => {
        const data = await get().apiRequest("/get-top-sellers");
        set({ topSellers: data });
        return data ?? [];
      },

      fetchSellerProfile: async ({ sellerId, consumerId }) => {
        return (
          (await get().apiRequest(
            `/seller/details?seller_id=${sellerId}&consumer_id=${consumerId}`
          )) ?? []
        );
      },

      followSeller: async ({ sellerId, consumerId }) => {
        return await api.post(
          `/seller/follow-request?seller_id=${sellerId}&consumer_id=${consumerId}`
        );
      },

      rateProduct: async ({ productId, consumerId, rating }) => {
        return await api.post(
          `/consumer/setProduct-ratings?consumer_id=${consumerId}&products_id=${productId}&ratings=${rating}`
        );
      },

      sellerVisitCount: async ({ sellerId, consumerId }) => {
        return await api.post(
          `/seller/visit?consumer_id=${consumerId}&seller_id=${sellerId}`
        );
      },

      fetchSellerNewArivals: async ({ sellerId, page }) => {
        return await api.get(
          `/seller/new-arrivals?seller_id=${sellerId}&page=${page}`
        );
      },

      fetchSellerReviews: async ({ sellerId, page }) => {
        return await api.get(
          `/seller/all-reviews?seller_id=${sellerId}&page=${page}`
        );
      },

      fetchSellerAllProducts: async ({ sellerId, page }) => {
        return await api.get(
          `/seller/all-products?seller_id=${sellerId}&page=${page}`
        );
      },

      // Fetch Main Categories
      fetchMainCategories: async () => {
        const data = await get().apiRequest("/get-main-categories");
        set({ mainCategories: data });
        return data?.data ?? [];
      },

      // Fetch Subcategories
      fetchSubcategories: async (id, limit) => {
        const data = await get().apiRequest(
          `/get-sub-categories/${id}?limit=${limit}`
        );
        set((state) => ({
          subcategories: {
            ...state.subcategories,
            [id]: data,
          },
        }));
        return data?.data ?? [];
      },

      fetchMainPageData: async (consumerId) => {
        return (
          await get().apiRequest(
            `/get-main-page-data?consumer_id=${consumerId}`
          )
        ).data;
      },

      // Fetch Products by Subcategory
      fetchProductsBySubcategory: async (subcategoryId) => {
        try {
          set({ loading: true, error: null });
          const data = await get().apiRequest("/get-search-products", {
            params: { categories: [subcategoryId], limitData: 20 },
          });
          set({ productData: data?.data || [], loading: false });
          return data?.data || [];
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      // Search products
      searchProductData: async (searchTerm) => {
        try {
          set({ loading: true, error: null });
          const data = await get().apiRequest("/get-search-products", {
            params: { search: searchTerm, limitData: 20 },
          });
          set({ productData: data?.data || [], loading: false });
          return data?.data || [];
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      fetchProductDetails: async ({ productId, consumerId }) => {
        try {
          set({ loading: true, error: null });
          const data = await get().apiRequest("/get-product-details", {
            params: { products_id: productId, consumer_id: consumerId },
          });
          return data || [];
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      fetchProductByCategories: async (subCategoryIds = []) => {
        if (subCategoryIds.length === 0) return [];
        const data = await get().apiRequest("/get-search-products", {
          params: { "categories[]": subCategoryIds },
        });
        return data;
      },

      fetchRelatedProducts: async (productId) => {
        const response = await api.get(
          `/get-related-products?product_id=${productId}`
        );
        return response.data.related_products;
      },

      addToFavorite: async ({ productID, consumerID }) => {
        try {
          await api.post(
            `/consumer/addfav-product?product_id=${productID}&consumer_id=${consumerID}`
          );
          await get().fetchFavProducts(consumerID);
        } catch (error) {
          console.log("error", error);
          const errorMessage = error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
      },

      removeFavorite: async ({ favId, consumerID }) => {
        try {
          await api.post(
            `/consumer/removefav-product?id=${favId}&consumer_id=${consumerID}`
          );
          await get().fetchFavProducts(consumerID);
        } catch (error) {
          console.log(error);
        }
      },

      fetchFavProducts: async (consumerId) => {
        try {
          const data = await api.post(
            `consumer/fav-products?consumer_id=${consumerId}`
          );
          set({ favProducts: data.data.favorites || [] });
          return data.data.favorites || [];
        } catch (error) {
          console.error("Error fetching favorites:", error);
          throw error;
        }
      },

      addToCart: async ({ productID, consumerID, quantity = 1 }) => {
        try {
          await api.post(
            `/cart/add?product_id=${productID}&consumer_id=${consumerID}&qty=${quantity}`
          );
          await get().listCart(consumerID);
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
      },

      // List cart items for a consumer
      listCart: async (consumerID) => {
        try {
          const response = await api.get(
            `/cart/list?consumer_id=${consumerID}`
          );
          set({ cartItem: response.data.cart_products });
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
      },

      deleteFromCart: async ({ productID, consumerID }) => {
        try {
          await api.delete(
            `/cart/delete?id=${productID}&consumer_id=${consumerID}`
          );
          await get().listCart(consumerID);
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
      },

      deleteAllFromCart: async (consumerID) => {
        try {
          await api.delete(`/cart/delete-all?consumer_id=${consumerID}`);
          set({ cartItem: [] });
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
      },

      fetchProfile: async (consumerId) => {
        try {
          set({
            profileData: await get().apiRequest(
              `/consumer/profile-details/${consumerId}`
            ),
          });
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          set({ loginError: errorMessage, loginLoading: false });
          throw new Error(errorMessage);
        }
      },

      changePassword: async ({ consumerID, password }) => {
        const data = await api.post(
          `/consumer/change-password?consumer_id=${consumerID}&password=${password}`
        );
        return data;
      },

      getProductQuestionList: async ({ productId, page, limitData = 10 }) => {
        const response = await get().apiRequest(
          `/questions/list?product_id=${productId}&sort=recent&page=${page}&limitData=${limitData}`
        );
        set({ productQuestions: response.total || [] });
        return response || [];
      },

      addProductQuestion: async ({ consumerID, productID, question }) => {
        await api.post(
          `/question/add?question=${question}&product_id=${productID}&consumer_id=${consumerID}`
        );
        await get().getProductQuestionList(productID);
      },

      editQuestion: async (questionData) => {
        await get().apiRequest("/question/edit", {
          method: "POST",
          data: questionData,
        });
      },

      deleteProductQuestion: async ({ consumerID, questionId }) => {
        await api.delete(
          `/question/delete?question_id=${questionId}&consumer_id=${consumerID}`
        );
      },

      loginUser: async (credentials) => {
        set({ loginLoading: true, loginError: null });
        try {
          const response = await api.post("/consumer/login", credentials);
          if (response.data.status === "success") {
            const userWithTimestamp = {
              ...response.data.data,
              timestamp: Date.now(),
            };
            set({ user: userWithTimestamp, loginLoading: false });
            return userWithTimestamp;
          }
          throw new Error(response.data.message || "Login failed");
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          set({ loginError: errorMessage, loginLoading: false });
          throw new Error(errorMessage);
        }
      },

      signupUser: async (formData) => {
        set({ loginLoading: true, loginError: null });
        try {
          console.log("Sending FormData to /consumer/register:", formData);
          const response = await api.post("/consumer/register", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
          });
          console.log("Signup response:", response.data);
          if (
            response.status === 201 ||
            response.data.message === "Consumer registered successfully!"
          ) {
            const userWithTimestamp = {
              ...response.data.data,
              timestamp: Date.now(),
            };
            set({ loginLoading: false });
            return { success: true, user: userWithTimestamp };
          } else {
            throw new Error(response.data.message || "Signup failed");
          }
        } catch (error) {
          console.log("Signup error:", error);
          console.log("Response data:", error.response?.data);
          let errorMessage = "An error occurred during signup.";
          if (error.response) {
            if (error.response.status === 422) {
              const errors = error.response.data.errors;
              if (errors) {
                errorMessage = Object.values(errors).flat().join(", ");
              } else {
                errorMessage =
                  error.response.data.message ||
                  "This email is already registered. Please log in or use a different email.";
              }
            } else if (error.response.status === 406) {
              errorMessage =
                "The server rejected the request format. Please check the data.";
            } else if (error.response.status === 400) {
              errorMessage =
                error.response.data.message || "Invalid signup data.";
            } else {
              errorMessage = error.response.data.message || error.message;
            }
          } else {
            errorMessage = error.message;
          }
          set({ loginError: errorMessage, loginLoading: false });
          throw new Error(errorMessage);
        }
      },

      uploadConsumerImage: async (formData) => {
        set({ loading: true, error: null });

        try {
          // Logging for debugging - ensure formData contains the expected parts
          console.log(formData._parts || formData);

          // Axios will set the Content-Type for FormData automatically
          const response = await api.post("/consumer/upload-image", formData);

          console.log("Image upload response:", response.data);
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          console.error("Image upload error:", errorMessage);
          set({ error: errorMessage, loading: false });
          throw new Error(errorMessage);
        } finally {
          set({ loading: false });
        }
      },

      updateConsumer: async (formData) => {
        console.log(formData);
        const data = await get().apiRequest("/consumer/edit-profile-details", {
          method: "POST",
          data: formData,
        });
        await get().fetchProfile(formData.consumer_id);

        return data.data;
      },

      fetchComments: async ({ productID, page, limitData }) => {
        const response = await get().apiRequest(
          `/comment/list?product_id=${productID}&page=${page}&limitData=${limitData}&sort=recent`
        );
        set({ productComments: response.comments.total });
        return response;
      },

      addComment: async (commentData) => {
        await get().apiRequest("/comment/add", {
          method: "POST",
          data: commentData,
        });
      },

      deleteComment: async ({ commentId, consumerID, productId }) => {
        const data = await get().apiRequest("/comment/delete", {
          method: "DELETE",
          params: { comment_id: commentId, consumer_id: consumerID },
        });
        return data;
      },

      editComment: async (commentData) => {
        await get().apiRequest("/comment/edit", {
          method: "POST",
          data: commentData,
        });
      },

      fetchBillingAddresses: async (consumerID) => {
        const data = await api.get(
          `/consumer/billing-address?consumer_id=${consumerID}`
        );
        set({ consumerBillingAddress: data.data.addresses.data });
        return data.data;
      },

      addBillingAddress: async (billingData) => {
        const data = await api.post(
          `/consumer/add-billing-address`,
          billingData
        );
        console.log("from api: ", billingData);
        const consumerID = billingData.consumer_id;
        await get().fetchBillingAddresses(consumerID);
        return data.data;
      },

      setBillingAddressStatus: async ({ consumerId, billingId }) => {
        const data = await api.post(
          `/consumer/set-billing-address?consumer_id=${consumerId}&billing_address_id=${billingId}`
        );
        return data.data;
      },

      editBillingAddress: async (billingData) => {
        const data = await api.post(
          `/consumer/edit-billing-address`,
          billingData
        );
        console.log(billingData);
        const consumerID = billingData.consumer_id;
        await get().fetchBillingAddresses(consumerID);
        return data.data;
      },

      deleteBillingAddress: async ({ consumerID, billingAddressID }) => {
        const data = await api.delete(
          `/consumer/delete-billing-address?consumer_id=${consumerID}&billing_address_id=${billingAddressID}`
        );
        await get().fetchBillingAddresses(consumerID);
        return data.data;
      },

      proceedOrder: async (items) => {
        const response = await api.post(`/order/process`, items);
        await get().listOrders(items.consumer_id);
        return response.data;
      },

      listOrders: async (consumerId) => {
        const response = await api.get(`/orders/${consumerId}`);
        set({ orders: response.data.orders });
      },

      orderDetails: async (consumerId) => {
        const response = await api.get(`/orders/items/${consumerId}`);
        return response.data;
      },

      changeOrderStatus: async (data) => {
        const response = await api.post(`/orders/change-status`, data);
        await get().listOrders(data.consumer_id);
        return response.data;
      },

      deleteConsumerAccount: async (consumerID) => {
        const data = await get().apiRequest("/consumer/delete", {
          method: "DELETE",
          params: { consumer_id: consumerID },
        });
        return data;
      },

      getAppVersions: async () => {
        const data = await api.get("/app/versions");
        return data.data.versions;
      },

      logout: () => {
        set({ user: null, profileData: null, favProducts: [], cartItem: [] });
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

export default useProductStore;
