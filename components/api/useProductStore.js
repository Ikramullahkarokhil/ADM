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
          const response = await api.post(
            `/consumer/addfav-product?product_id=${productID}&consumer_id=${consumerID}`
          );
          if (response.data.status === "success") {
            set((state) => ({
              favProducts: [...state.favProducts, response.data.data],
            }));
            console.log("Product added to fav");
          }
          return response.data;
        } catch (error) {
          console.log("error", error);
          const errorMessage = error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
      },

      removeFavorite: async ({ favId, consumerID }) => {
        try {
          const response = await api.post(
            `/consumer/removefav-product?id=${favId}&consumer_id=${consumerID}`
          );
          if (response.data.status === "success") {
            set({ favProducts: response.data.data });
          }
        } catch (error) {}
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

      // Login User
      loginUser: async (credentials) => {
        set({ loginLoading: true, loginError: null });
        try {
          const response = await api.post("/consumer-login", credentials);
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
          const response = await api.post("/consumer-register", userData);

          if (response.data.status === "success") {
            const userWithTimestamp = {
              ...response.data.data,
              timestamp: Date.now(),
            };
            set({ user: userWithTimestamp, loginLoading: false });
            return { success: true, user: userWithTimestamp };
          }
          throw new Error(response.data.message || "Signup failed");
        } catch (error) {
          console.log("Signup error:", error);

          let errorMessage = "An error occurred during signup.";
          if (error.response) {
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
