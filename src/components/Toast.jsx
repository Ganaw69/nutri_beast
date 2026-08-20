import React from "react";
import { useCart } from "../context/CartContext";
import { CheckCircle } from "lucide-react";

export const Toast = () => {
  const { toastMessage } = useCart();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface-high border border-primary text-white px-5 py-3.5 rounded-lg shadow-2xl shadow-primary/20 animate-bounce">
      <CheckCircle className="w-5 h-5 text-primary" />
      <span className="font-semibold text-sm">{toastMessage}</span>
    </div>
  );
};
