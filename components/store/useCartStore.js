import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
const useCartStore = create(
  persist(
    (set) => ({
      cart: [],
      addToCart: (product) =>
        set((state) => ({
          cart: [...state.cart, product],
        })),
      removeFromCart: (ItemId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.products_id !== ItemId),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useCartStore;
