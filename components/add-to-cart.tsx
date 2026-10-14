"use client";

import { useState } from "react";

import { useCart } from "@/components/cart-context";

export function AddToCart({
  bookId,
  title,
  size = "sm",
}: {
  bookId: number;
  title: string;
  size?: "sm" | "lg";
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        add(bookId);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className={`min-h-11 w-full rounded-lg font-semibold transition-colors ${
        size === "lg" ? "px-5 py-3 text-base" : "px-3 py-2 text-sm"
      } ${added ? "bg-emerald-700 text-white" : "bg-ink text-paper hover:bg-graphite"}`}
    >
      {added ? "Adicionado ✓" : "Adicionar"}
      <span className="sr-only"> — {title}</span>
    </button>
  );
}
