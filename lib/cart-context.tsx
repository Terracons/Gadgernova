"use client";

/**
 * Client-side cart.
 *
 * localStorage holds only {productId, quantity}. Every price shown comes from
 * the server action, which reads the database — so a tampered cart can display
 * nothing false and buys nothing at the wrong price.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { quoteCart } from "@/app/actions/cart";
import type { Quote } from "@/lib/quote";
import { store } from "@/store.config";

const STORAGE_KEY = "store_cart_v1";
const MAX = store.options.maxQuantityPerItem;

export interface CartEntry {
  productId: number;
  quantity: number;
}

interface CartValue {
  entries: CartEntry[];
  quote: Quote | null;
  loading: boolean;
  count: number;
  ready: boolean;
  add: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  // Slide-out mini-cart drawer state. Kept here so any "add to cart" button
  // can open it and the floating cart / header can toggle it.
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartValue | null>(null);

function readStorage(): CartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e) => ({
        productId: Number(e?.productId),
        quantity: Number(e?.quantity),
      }))
      .filter((e) => e.productId > 0 && e.quantity > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // localStorage isn't available during SSR, so load after mount.
  useEffect(() => {
    setEntries(readStorage());
    setReady(true);
  }, []);

  // Persist — but not before hydration, or we'd overwrite the stored cart
  // with the empty initial state.
  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, ready]);

  // Re-price on every change.
  useEffect(() => {
    if (!ready) return;
    if (entries.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    startTransition(async () => {
      try {
        const result = await quoteCart(entries);
        if (cancelled) return;
        setQuote(result);

        // Server dropped or capped something — mirror it locally so the
        // customer is never shown one cart and charged for another.
        if (result.wasAdjusted) {
          setEntries(
            result.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
            })),
          );
        }
      } catch {
        if (!cancelled) setQuote(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [entries, ready]);

  const add = useCallback((productId: number, quantity = 1) => {
    setEntries((current) => {
      const existing = current.find((e) => e.productId === productId);
      if (!existing) return [...current, { productId, quantity }];
      return current.map((e) =>
        e.productId === productId
          ? { ...e, quantity: Math.min(e.quantity + quantity, MAX) }
          : e,
      );
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setEntries((current) =>
      quantity <= 0
        ? current.filter((e) => e.productId !== productId)
        : current.map((e) =>
            e.productId === productId
              ? { ...e, quantity: Math.min(quantity, MAX) }
              : e,
          ),
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setEntries((c) => c.filter((e) => e.productId !== productId));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const count = useMemo(
    () => entries.reduce((sum, e) => sum + e.quantity, 0),
    [entries],
  );

  const value = useMemo<CartValue>(
    () => ({
      entries,
      quote,
      loading: pending,
      count,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [
      entries,
      quote,
      pending,
      count,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      drawerOpen,
      openDrawer,
      closeDrawer,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
