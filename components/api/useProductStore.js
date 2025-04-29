import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ====================== API Configuration ======================
const API_BASE_URL = "https://demo.ucsofficialstore.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ====================== Initial State ======================
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
  consumerBillingAddress: [],
  loginError: null,
  user: null,
  profileData: null,
  loginLoading: false,
  loading: false,
  error: null,
};

// ====================== Store Creation ======================
const useProductStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ====================== Helper Functions ======================
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

      // ====================== Product Fetching ======================

      fetchNewArrivals: async (page) => {
        const data = await get().apiRequest(
          `/get-new-arrival-products?page=${page}`
        );
        return data ?? [];
      },

      fetchJustForYou: async (page) => {
        const data = await get().apiRequest(
          `/get-just-foryou-products?page=${page}`
        );
        return data ?? [];
      },

      fetchSaleProducts: async (page) => {
        const data = await get().apiRequest(`/get-sale-products?page=${page}`);
        return data ?? [];
      },

      // ====================== Seller Related ======================
      fetchTopSellers: async () => {
        const data = await get().apiRequest("/get-top-sellers");
        set({ topSellers: data });
        return data ?? [];
      },

      fetchSellerProfile: async ({ sellerId, consumerId }) => {
        return await get().apiRequest(
          `/seller/details?seller_id=${sellerId}&consumer_id=${consumerId}`
        );
      },

      followSeller: async ({ sellerId, consumerId }) => {
        return await get().apiRequest(
          `/seller/follow-request?seller_id=${sellerId}&consumer_id=${consumerId}`,
          { method: "POST" }
        );
      },

      sellerVisitCount: async ({ sellerId, consumerId }) => {
        return await get().apiRequest(
          `/seller/visit?consumer_id=${consumerId}&seller_id=${sellerId}`,
          { method: "POST" }
        );
      },

      fetchSellerNewArivals: async ({ sellerId, page }) => {
        return await get().apiRequest(
          `/seller/new-arrivals?seller_id=${sellerId}&page=${page}`
        );
      },

      fetchSellerReviews: async ({ sellerId, page }) => {
        return await get().apiRequest(
          `/seller/all-reviews?seller_id=${sellerId}&page=${page}`
        );
      },

      fetchSellerAllProducts: async ({ sellerId, page }) => {
        return await get().apiRequest(
          `/seller/all-products?seller_id=${sellerId}&page=${page}`
        );
      },

      // ====================== Categories ======================
      fetchMainCategories: async () => {
        const data = await get().apiRequest("/get-main-categories");
        set({ mainCategories: data });
        return data?.data ?? [];
      },

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
        const data = await get().apiRequest(
          `/get-main-page-data?consumer_id=${consumerId}`
        );
        return data?.data;
      },

      // ====================== Product Operations ======================
      fetchProductsBySubcategory: async (subcategoryId) => {
        const data = await get().apiRequest("/get-search-products", {
          params: { categories: [subcategoryId], limitData: 20 },
        });
        set({ productData: data?.data || [] });
        return data?.data || [];
      },

      searchProductData: async (searchTerm) => {
        const data = await get().apiRequest("/get-search-products", {
          params: { search: searchTerm, limitData: 20 },
        });
        set({ productData: data?.data || [] });
        return data?.data || [];
      },

      fetchProductDetails: async ({ productId, consumerId }) => {
        const data = await get().apiRequest("/get-product-details", {
          params: { products_id: productId, consumer_id: consumerId },
        });
        return data || [];
      },

      fetchProductByCategories: async (subCategoryIds = []) => {
        if (subCategoryIds.length === 0) return [];
        const data = await get().apiRequest("/get-search-products", {
          params: { "categories[]": subCategoryIds },
        });
        return data;
      },

      fetchRelatedProducts: async (productId) => {
        const data = await get().apiRequest(
          `/get-related-products?product_id=${productId}`
        );
        return data.related_products;
      },

      rateProduct: async ({ productId, consumerId, rating }) => {
        return await get().apiRequest(
          `/consumer/setProduct-ratings?consumer_id=${consumerId}&products_id=${productId}&ratings=${rating}`,
          { method: "POST" }
        );
      },

      // ====================== Favorites ======================
      addToFavorite: async ({ productID, consumerID }) => {
        await get().apiRequest(
          `/consumer/addfav-product?product_id=${productID}&consumer_id=${consumerID}`,
          { method: "POST" }
        );
        await get().fetchFavProducts(consumerID);
      },

      removeFavorite: async ({ favId, consumerID }) => {
        await get().apiRequest(
          `/consumer/removefav-product?id=${favId}&consumer_id=${consumerID}`,
          { method: "POST" }
        );
        await get().fetchFavProducts(consumerID);
      },

      fetchFavProducts: async (consumerId) => {
        const data = await get().apiRequest(
          `/consumer/fav-products?consumer_id=${consumerId}`,
          { method: "POST" }
        );
        set({ favProducts: data.favorites || [] });
        return data.favorites || [];
      },

      // ====================== Cart Operations ======================
      addToCart: async ({ productID, consumerID, quantity = 1 }) => {
        await get().apiRequest(
          `/cart/add?product_id=${productID}&consumer_id=${consumerID}&qty=${quantity}`,
          { method: "POST" }
        );
        await get().listCart(consumerID);
      },

      listCart: async (consumerID) => {
        const data = await get().apiRequest(
          `/cart/list?consumer_id=${consumerID}`
        );
        set({ cartItem: data.cart_products });
      },

      deleteFromCart: async ({ productID, consumerID }) => {
        await get().apiRequest(
          `/cart/delete?id=${productID}&consumer_id=${consumerID}`,
          { method: "DELETE" }
        );
        await get().listCart(consumerID);
      },

      deleteAllFromCart: async (consumerID) => {
        await get().apiRequest(`/cart/delete-all?consumer_id=${consumerID}`, {
          method: "DELETE",
        });
        set({ cartItem: [] });
      },

      // ====================== User Profile ======================
      fetchProfile: async (consumerId) => {
        const data = await get().apiRequest(
          `/consumer/profile-details/${consumerId}`
        );
        set({ profileData: data });
      },

      changePassword: async ({ consumerID, password }) => {
        return await api.post(
          `/consumer/change-password?consumer_id=${consumerID}&password=${password}`
        );
      },

      uploadConsumerImage: async (formData) => {
        try {
          const url = `${API_BASE_URL}/consumer/upload-image`;

          console.log("Upload config:", {
            url,
            formDataKeys: Array.from(formData.keys()),
          });

          const response = await fetch(url, {
            method: "POST",
            body: formData,
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Upload failed");
          }

          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Upload error details:", {
            message: error.message,
            error,
          });
          throw error;
        }
      },

      updateConsumer: async (formData) => {
        const data = await get().apiRequest("/consumer/edit-profile-details", {
          method: "POST",
          data: formData,
        });
        await get().fetchProfile(formData.consumer_id);
        return data.data;
      },

      // ====================== Product Questions ======================
      getProductQuestionList: async ({ productId, page, limitData = 10 }) => {
        const response = await get().apiRequest(
          `/questions/list?product_id=${productId}&sort=recent&page=${page}&limitData=${limitData}`
        );
        return response || [];
      },

      addProductQuestion: async ({ consumerID, productID, question }) => {
        await get().apiRequest(
          `/question/add?question=${question}&product_id=${productID}&consumer_id=${consumerID}`,
          { method: "POST" }
        );
      },

      editQuestion: async (questionData) => {
        await get().apiRequest("/question/edit", {
          method: "POST",
          data: questionData,
        });
      },

      deleteProductQuestion: async ({ consumerID, questionId }) => {
        await get().apiRequest(
          `/question/delete?question_id=${questionId}&consumer_id=${consumerID}`,
          { method: "DELETE" }
        );
      },

      // ====================== Authentication ======================
      loginUser: async (credentials) => {
        set({ loginLoading: true, loginError: null });
        try {
          const response = await get().apiRequest("/consumer/login", {
            method: "POST",
            data: credentials,
          });
          if (response.status === "success") {
            const userWithTimestamp = {
              ...response.data,
              timestamp: Date.now(),
            };
            set({ user: userWithTimestamp, loginLoading: false });
            return userWithTimestamp;
          }
          throw new Error(response.message || "Login failed");
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          set({ loginError: errorMessage, loginLoading: false });
          throw new Error(errorMessage);
        }
      },

      signupUser: async (formData) => {
        set({ loginLoading: true, loginError: null });
        try {
          const response = await get().apiRequest("/consumer/register", {
            method: "POST",
            data: formData,
            headers: {
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
          });
          if (
            response.status === 201 ||
            response.message === "Consumer registered successfully!"
          ) {
            const userWithTimestamp = {
              ...response.data,
              timestamp: Date.now(),
            };
            set({ loginLoading: false });
            return { success: true, user: userWithTimestamp };
          }
          throw new Error(response.message || "Signup failed");
        } catch (error) {
          let errorMessage = "An error occurred during signup.";
          if (error.response) {
            if (error.response.status === 422) {
              const errors = error.response.data.errors;
              errorMessage = errors
                ? Object.values(errors).flat().join(", ")
                : "This email is already registered. Please log in or use a different email.";
            } else if (error.response.status === 406) {
              errorMessage = "The server rejected the request format.";
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

      // ====================== Comments ======================
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
        return await get().apiRequest("/comment/delete", {
          method: "DELETE",
          params: { comment_id: commentId, consumer_id: consumerID },
        });
      },

      editComment: async (commentData) => {
        await get().apiRequest("/comment/edit", {
          method: "POST",
          data: commentData,
        });
      },

      // ====================== Billing Address ======================
      fetchBillingAddresses: async (consumerID) => {
        const data = await get().apiRequest(
          `/consumer/billing-address?consumer_id=${consumerID}`
        );
        set({ consumerBillingAddress: data.addresses.data });
        return data;
      },

      addBillingAddress: async (billingData) => {
        const data = await get().apiRequest(`/consumer/add-billing-address`, {
          method: "POST",
          data: billingData,
        });
        await get().fetchBillingAddresses(billingData.consumer_id);
        return data;
      },

      setBillingAddressStatus: async ({ consumerId, billingId }) => {
        return await get().apiRequest(
          `/consumer/set-billing-address?consumer_id=${consumerId}&billing_address_id=${billingId}`,
          { method: "POST" }
        );
      },

      editBillingAddress: async (billingData) => {
        const data = await get().apiRequest(`/consumer/edit-billing-address`, {
          method: "POST",
          data: billingData,
        });
        await get().fetchBillingAddresses(billingData.consumer_id);
        return data;
      },

      deleteBillingAddress: async ({ consumerID, billingAddressID }) => {
        const data = await get().apiRequest(
          `/consumer/delete-billing-address?consumer_id=${consumerID}&billing_address_id=${billingAddressID}`,
          { method: "DELETE" }
        );
        await get().fetchBillingAddresses(consumerID);
        return data;
      },

      // ====================== Orders ======================
      proceedOrder: async (items) => {
        const data = await get().apiRequest(`/order/process`, {
          method: "POST",
          data: items,
        });
        return data;
      },

      listOrders: async (consumerId) => {
        const data = await get().apiRequest(`/orders/${consumerId}`);
        set({ orders: data.orders });
      },

      orderDetails: async (consumerId) => {
        return await get().apiRequest(`/orders/items/${consumerId}`);
      },

      changeOrderStatus: async (data) => {
        const response = await get().apiRequest(`/orders/change-status`, {
          method: "POST",
          data,
        });
        await get().listOrders(data.consumer_id);
        return response;
      },

      // ====================== Account Management ======================
      deleteConsumerAccount: async (consumerID) => {
        return await get().apiRequest("/consumer/delete", {
          method: "DELETE",
          params: { consumer_id: consumerID },
        });
      },

      getAppVersions: async () => {
        const data = await get().apiRequest("/app/versions");
        return data.versions;
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
        cartItem: state.cartItem,
        profileData: state.profileData,
      }),
    }
  )
);

export default useProductStore;
