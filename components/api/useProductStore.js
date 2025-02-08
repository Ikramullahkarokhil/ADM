import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://demo.ucsofficialstore.com/api";

const useProductStore = create(
  persist(
    (set, get) => ({
      // State variables
      mostSaleProducts: [],
      newArrivals: [],
      justForYou: [],
      topSellers: [],
      mainCategories: [],
      subcategories: {},
      productData: [],
      loginError: null,
      user: null,
      loginLoading: false,
      loading: false,
      error: null,

      // Fetch Most Sale Products
      fetchMostSaleProducts: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(
            `${API_BASE_URL}/get-most-sale-products`
          );
          set({ mostSaleProducts: response.data, loading: false });
        } catch (error) {
          set({ error: "Failed to fetch most sale products", loading: false });
        }
      },

      // Fetch New Arrivals
      fetchNewArrivals: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(
            `${API_BASE_URL}/get-new-arrival-products`
          );
          set({ newArrivals: response.data, loading: false });
        } catch (error) {
          set({ error: "Failed to fetch new arrivals", loading: false });
        }
      },

      // Fetch Just For You
      fetchJustForYou: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(
            `${API_BASE_URL}/get-just-foryou-products`
          );
          set({ justForYou: response.data, loading: false });
        } catch (error) {
          set({
            error: "Failed to fetch Just For You products",
            loading: false,
          });
        }
      },

      // Fetch Top Sellers
      fetchTopSellers: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(`${API_BASE_URL}/get-top-sellers`);
          set({ topSellers: response.data, loading: false });
        } catch (error) {
          set({ error: "Failed to fetch top sellers", loading: false });
        }
      },

      fetchMainCategories: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(
            `${API_BASE_URL}/get-main-categories`
          );
          set({ mainCategories: response.data, loading: false });
          return response.data;
        } catch (error) {
          set({ error: "Failed to fetch main categories", loading: false });
          throw error;
        }
      },

      fetchSubcategories: async (id) => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(
            `${API_BASE_URL}/get-sub-categories/${id}`
          );
          set((state) => ({
            subcategories: {
              ...state.subcategories,
              [id]: response.data,
            },
            loading: false,
          }));

          return response.data;
        } catch (error) {
          set({ error: "Failed to fetch subcategories", loading: false });
          throw error;
        }
      },

      // Fetch Product Data
      fetchProductData: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(
            `${API_BASE_URL}/get-search-products`
          );
          set({ productData: response.data, loading: false });
        } catch (error) {
          set({ error: "Failed to fetch product data", loading: false });
        }
      },

      // Search Product Data
      searchProductData: async (params) => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(
            `${API_BASE_URL}/get-search-products`,
            { params: { search: params } }
          );
          set({ productData: response.data, loading: false });
        } catch (error) {
          set({ error: "Failed to search product data", loading: false });
        }
      },

      // Login User
      loginUser: async (credentials) => {
        set({ loginLoading: true, loginError: null });
        try {
          const response = await axios.post(`${API_BASE_URL}/consumer-login`, {
            email: credentials.email,
            password: credentials.password,
          });
          if (response.data.status === "success") {
            const userData = response.data.data;
            const userWithTimestamp = { ...userData, timestamp: Date.now() };
            set({ user: userWithTimestamp, loginLoading: false });
          } else {
            throw new Error(response.data.message || "Login failed");
          }
        } catch (error) {
          set({
            loginError:
              error.response?.data?.message || error.message || "Login failed",
            loginLoading: false,
          });
          throw error;
        }
      },

      signupUser: async (userData) => {
        set({ loginLoading: true, loginError: null });
        try {
          const response = await axios.post(
            `${API_BASE_URL}/consumer-register`,
            {
              name: userData.name,
              phone: userData.phone,
              email: userData.email,
              code: userData.code,
              password: userData.password,
            }
          );

          if (response.data.status === "success") {
            const userData = response.data.data;
            const userWithTimestamp = { ...userData, timestamp: Date.now() };
            set({ user: userWithTimestamp, loginLoading: false });
            return { success: true };
          } else {
            throw new Error(response.data.message || "Signup failed");
          }
        } catch (error) {
          set({
            loginError:
              error.response?.data?.message || error.message || "Signup failed",
            loginLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ user: null });
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
