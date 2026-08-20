import React from "react";
import { useCart } from "../context/CartContext";
import { ShoppingBag } from "lucide-react";

export const ProductCard = ({ product }) => {
  const { addToCart, viewProductDetails } = useCart();
  const hasImage = !!product.image;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group font-heading">
      {/* Top Image Canvas Container - Light grey background */}
      <div
        onClick={() => viewProductDetails(product.id)}
        className="relative bg-[#f4f4f6] aspect-square w-full flex items-center justify-center p-6 cursor-pointer overflow-hidden"
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
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-center px-4">
            <div className="text-xs font-black uppercase tracking-widest text-gray-500">No picture</div>
          </div>
        )}
      </div>

      {/* Details Box */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3 bg-white text-black">
        <div>
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
            {product.category}
          </span>
          <h3
            onClick={() => viewProductDetails(product.id)}
            className="font-black text-sm text-gray-900 uppercase hover:text-[#d90429] transition-colors cursor-pointer line-clamp-1"
          >
            {product.name}
          </h3>
        </div>

        {/* Price & Red Square Action Button matching screenshot */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
          <div>
            <div className="font-black text-base text-gray-900">
              {product.price.toFixed(2)} <span className="text-xs font-black text-gray-900">TND</span>
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
            className="w-9 h-9 bg-[#d90429] hover:bg-[#b0021f] text-white rounded-md flex items-center justify-center transition-all duration-200 shadow-md group-hover:scale-105 shrink-0"
            title="Ajouter au panier"
          >
            <ShoppingBag className="w-4 h-4 text-white fill-white/20" />
          </button>
        </div>
      </div>
    </div>
  );
};
