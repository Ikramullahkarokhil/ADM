import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://demo.ucsofficialstore.com/api";

// Create axios instance with common configuration
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
  productsBySubcategory: {},
  loginError: null,
  user: null,
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

      // Signup User
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
          const errorMessage = error.response?.data?.message || error.message;
          set({ loginError: errorMessage, loginLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Logout User
      logout: () => {
        set({ user: null });
      },

      // Reset Store
      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useProductStore;
