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
  newArrivals: [],
  justForYou: [],
  topSellers: [],
  mainCategories: [],
  subcategories: {},
  productData: [],
  favProducts: [],
  cartItem: [],
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
      fetchNewArrivals: async () => {
        const data = await get().apiRequest("/get-new-arrival-products");
        set({ newArrivals: data });
      },

      // Fetch Just For You
      fetchJustForYou: async () => {
        const data = await get().apiRequest("/get-just-foryou-products");
        set({ justForYou: data });
      },

      // Fetch Top Sellers
      fetchTopSellers: async () => {
        const data = await get().apiRequest("/get-top-sellers");
        set({ topSellers: data });
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

      fetchProductByCategories: async (subCategoryIds = []) => {
        if (subCategoryIds.length === 0) return [];
        const data = await get().apiRequest("/get-search-products", {
          params: { "categories[]": subCategoryIds },
        });
        return data;
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
        ); // Fixed trailing comma in URL
        return data;
      },

      getProductQuestionList: async (productID) => {
        const response = await get().apiRequest(
          `/questions/list?product_id=${productID}`
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
          const response = await api.post("/consumer/upload-image", formData);
          console.log("API Response:", response.data);
          return response.data;
        } catch (error) {
          console.log("Upload Error:", error);
          let errorMessage = error.response?.data?.message || error.message;
          if (error.response?.status === 413) {
            errorMessage =
              "Image file too large. Please upload a smaller file.";
          } else if (error.response?.status === 400) {
            errorMessage = "Invalid image data. Please try again.";
          } else if (error.response?.status === 406) {
            errorMessage =
              "Server rejected the request format. Check API requirements.";
          }
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

        return data.data;
      },

      fetchComments: async ({ productID, page, limitData }) => {
        const response = await get().apiRequest(
          `/comment/list?product_id=${productID}&page=${page}&limitData=${limitData}`
        );
        set({ productComments: response.comments.total });
        return response.comments.data;
      },

      addComment: async (commentData) => {
        await get().apiRequest("/comment/add", {
          method: "POST",
          data: commentData,
        });
        await get().fetchComments({
          productID: commentData.product_id,
          limitData: 1,
        });
      },

      deleteComment: async ({ commentId, consumerID }) => {
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

      deleteConsumerAccount: async (consumerID) => {
        const data = await get().apiRequest("/consumer/delete", {
          method: "DELETE",
          params: { consumer_id: consumerID },
        });
        return data;
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
