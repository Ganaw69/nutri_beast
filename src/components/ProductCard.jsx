import React from "react";
import { useCart } from "../context/CartContext";
import { ShoppingBag } from "lucide-react";

export const ProductCard = ({ product }) => {
  const { addToCart, viewProductDetails } = useCart();
  const hasImage = !!product.image;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#111111] font-heading shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/35">
      {/* Uniform image canvas keeps the source image and its original background intact. */}
      <div
        onClick={() => viewProductDetails(product.id)}
        className="relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden bg-[#f0f0f0] p-5 sm:p-6"
      >
        {/* Badges on top right */}
        {product.badge && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className={`text-[9px] font-black px-2.5 py-1 rounded-xs tracking-wider uppercase shadow-xs ${
                product.badge === "-15%" || product.badge === "HOT"
                  ? product.badge === "-15%"
                    ? "bg-[#d90429] text-white"
                    : "bg-[#1c1b1b] text-white"
                  : "bg-[#d90429] text-white"
              }`}
            >
              {product.badge}
            </span>
          </div>
        )}

        {hasImage ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="text-center px-4">
            <div className="text-xs font-black uppercase tracking-widest text-gray-500">No picture</div>
          </div>
        )}
      </div>

      {/* Details Box */}
      <div className="flex flex-1 flex-col justify-between gap-3 bg-[#111111] p-4 text-white sm:p-5">
        <div>
          <span className="mb-1 block min-h-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            {product.category}
          </span>
          <h3
            onClick={() => viewProductDetails(product.id)}
            className="line-clamp-2 min-h-10 cursor-pointer text-sm font-black uppercase leading-5 text-white transition-colors hover:text-[#ff526d]"
          >
            {product.name}
          </h3>
        </div>

        {/* Price & Red Square Action Button matching screenshot */}
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div>
            <div className="text-base font-black text-white">
              {product.price.toFixed(2)} <span className="text-xs font-black text-white">TND</span>
            </div>
            {product.originalPrice && (
              <div className="text-[10px] text-gray-400 line-through">
                {product.originalPrice.toFixed(2)} TND
              </div>
            )}
          </div>

          {/* Red Square Shopping Bag Button */}
          <button
            onClick={() => addToCart(product)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d90429] text-white shadow-md transition-colors duration-200 hover:bg-[#b0021f] focus:outline-none focus:ring-2 focus:ring-[#ff526d] focus:ring-offset-2 focus:ring-offset-[#111111]"
            title="Ajouter au panier"
          >
            <ShoppingBag className="w-4 h-4 text-white fill-white/20" />
          </button>
        </div>
      </div>
    </article>
  );
};
