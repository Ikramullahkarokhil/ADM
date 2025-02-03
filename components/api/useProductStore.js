import { create } from "zustand";
import axios from "axios";

const API_BASE_URL = "https://demo.ucsofficialstore.com/api";

const useProductStore = create((set) => ({
  mostSaleProducts: [],
  newArrivals: [],
  justForYou: [],
  topSellers: [],
  mainCategories: [],
  subcategories: {},
  productData: [],
  loading: false,
  error: null,

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

  fetchJustForYou: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(
        `${API_BASE_URL}/get-just-foryou-products`
      );
      set({ justForYou: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch Just For You products", loading: false });
    }
  },

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
      const response = await axios.get(`${API_BASE_URL}/get-main-categories`);
      set({ mainCategories: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch main categories", loading: false });
    }
  },

  fetchSubcategories: async (mainCategory) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(
        `${API_BASE_URL}/get-sub-categories/${mainCategory}`
      );
      set((state) => ({
        subcategories: {
          ...state.subcategories,
          [mainCategory]: response.data,
        },
        loading: false,
      }));
    } catch (error) {
      set({ error: "Failed to fetch subcategories", loading: false });
    }
  },

  fetchProductData: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}/get-search-products`);
      set({ productData: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch product data", loading: false });
    }
  },

  searchProductData: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}/get-search-products`, {
        params: { search: `products_id=${params}` },
      });
      set({ productData: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to search product data", loading: false });
    }
  },
}));

export default useProductStore;
