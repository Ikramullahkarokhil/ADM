import { useQuery } from "@tanstack/react-query";

/**
 * @param {string} queryKey
 * @param {function} fetchFunction
 * @param {any} params
 * @returns {object}
 */
export const useFetchData = (queryKey, fetchFunction, params) => {
  return useQuery({
    queryKey: [queryKey, params],
    queryFn: () => fetchFunction(params),
  });
};

const API_BASE_URL = "https://demo.ucsofficialstore.com/api";

export const fetchMostSaleProducts = async () => {
  const response = await fetch(`${API_BASE_URL}/get-most-sale-products`);
  if (!response.ok) {
    throw new Error("Failed to fetch most sale products");
  }
  return response.json();
};

export const fetchNewArrivals = async () => {
  const response = await fetch(`${API_BASE_URL}/get-new-arrival-products`);
  if (!response.ok) {
    throw new Error("Failed to fetch new arrivals");
  }
  return response.json();
};

export const fetchJustForYou = async () => {
  const response = await fetch(`${API_BASE_URL}/get-just-foryou-products`);
  if (!response.ok) {
    throw new Error("Failed to fetch Just For You products");
  }
  return response.json();
};

export const fetchTopSellers = async () => {
  const response = await fetch(`${API_BASE_URL}/get-top-sellers`);
  if (!response.ok) {
    throw new Error("Failed to fetch top sellers");
  }
  return response.json();
};

export const fetchMainCategories = async () => {
  const response = await fetch(`${API_BASE_URL}/get-main-categories`);
  if (!response.ok) {
    throw new Error("Failed to fetch main categories");
  }
  return response.json();
};

export const fetchSubcategories = async (mainCategory) => {
  const response = await fetch(
    `${API_BASE_URL}/get-sub-categories/${mainCategory}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch subcategories");
  }
  return response.json();
};

export const fetchProductData = async () => {
  const response = await fetch(`${API_BASE_URL}/get-search-products`);
  if (!response.ok) {
    throw new Error("Failed to fetch Product data");
  }
  return response.json();
};

export const searchProductData = async (params) => {
  const response = await fetch(
    `${API_BASE_URL}/get-search-products?search=products_id=${params}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch Product data");
  }
  return response.json();
};
