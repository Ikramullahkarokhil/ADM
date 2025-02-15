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
  productData: {},
  favProducts: [],
  cartItem: [],
  productsBySubcategory: {},
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
        return data;
      },

      // Fetch Subcategories
      fetchSubcategories: async (id) => {
        const data = await get().apiRequest(`/get-sub-categories/${id}`);
        set((state) => ({
          subcategories: {
            ...state.subcategories,
            [id]: data,
          },
        }));
        return data;
      },

      // Fetch Products by Subcategory
      fetchProductsBySubcategory: async (subcategoryId) => {
        const data = await get().apiRequest("/get-search-products", {
          params: { categories: [subcategoryId] },
        });
        set((state) => ({
          productsBySubcategory: {
            ...state.productsBySubcategory,
            [subcategoryId]: data,
          },
        }));
        return data;
      },

      // Search Products
      searchProductData: async (searchTerm) => {
        const data = await get().apiRequest("/get-search-products", {
          params: { search: searchTerm },
        });
        set({ productData: data });
        return data;
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
            `/cart/delete?product_id=${productID}&consumer_id=${consumerID}`
          );
          await get().listCart(consumerID);
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
      },

      fetchProfile: async (consumerId) => {
        try {
          const data = await get().apiRequest(
            `/consumer/profile-details/${consumerId}`
          );
          set({ profileData: data });
          return data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message;
          set({ loginError: errorMessage, loginLoading: false });
          throw new Error(errorMessage);
        }
      },

      uploadConsumerImage: async ({ image, consumer_id }) => {
        set({ loading: true, error: null });
        try {
          const formData = new FormData();
          formData.append("image", image);
          formData.append("consumer_id", consumer_id);

          const response = await api.post("/consumer/upload-image", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
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

      changePassword: async ({ consumerID, password }) => {
        const data = await api.post(
          `/consumer/change-password?consumer_id=${consumerID}&password=${password},`,
          {
            method: "POST",
          }
        );
        return data;
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

      signupUser: async (userData) => {
        set({ loginLoading: true, loginError: null });
        try {
          const response = await api.post("/consumer/register", userData);
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
          let errorMessage = "An error occurred during signup.";
          if (error.response) {
            console.log(error);
            if (error.response.status === 422) {
              errorMessage =
                "This email is already registered. Please log in or use a different email.";
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

      // New Comment APIs

      // Fetch comments (optionally, pass an identifier like postID if needed)
      fetchComments: async (productID) => {
        const response = await get().apiRequest(
          `/comment/list?product_id=${productID}`
        );
        return response.comments.data;
      },

      // Add a comment. Pass the comment data in the request body.
      addComment: async (commentData) => {
        const data = await get().apiRequest("/comment/add", {
          method: "POST",
          data: commentData,
        });
        return data;
      },

      // Delete a comment by its ID.
      deleteComment: async ({ commentId, consumerID }) => {
        const data = await get().apiRequest("/comment/delete", {
          method: "DELETE",
          params: { comment_id: commentId, consumer_id: consumerID },
        });
        return data;
      },

      // Logout User
      logout: () => {
        set({ user: null, profileData: null, favProducts: [] });
      },

      // Reset Store
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
