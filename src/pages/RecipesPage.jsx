import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { recipeService, mediaUrl } from "../services/api";
import { Clock, Flame, ChefHat, Loader2 } from "lucide-react";

const difficultyLabel = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
const difficultyColor = { easy: 'text-emerald-400', medium: 'text-yellow-400', hard: 'text-red-400' };

export const RecipesPage = () => {
  const { navigateTo } = useCart();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    recipeService.getAll({ itemsPerPage: 30 }, true).then(d => {
      setRecipes(d['hydra:member'] || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (selected) {
    const r = selected;
    return (
      <div className="bg-[#131313] min-h-screen text-[#e5e2e1] py-12 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#d90429] transition-colors uppercase">
            ← Retour aux recettes
          </button>
          <h1 className="font-black text-3xl sm:text-5xl text-white uppercase">{r.title}</h1>
          <div className="flex flex-wrap gap-4 text-xs font-bold">
            <span className={`uppercase ${difficultyColor[r.difficulty] || 'text-gray-400'}`}>{difficultyLabel[r.difficulty] || r.difficulty}</span>
            <span className="text-gray-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {r.preparationTime + r.cookingTime} min</span>
            <span className="text-gray-400 flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {r.calories} kcal</span>
          </div>
          {r.image && <img src={mediaUrl(`recipes/${r.image}`)} alt={r.title} className="w-full rounded-xl aspect-video object-cover" />}
          <p className="text-gray-300 leading-relaxed">{r.description}</p>
          {r.ingredients?.length > 0 && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 space-y-3">
              <h3 className="font-black text-white uppercase text-sm">Ingrédients</h3>
              <ul className="space-y-2">
                {r.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-2 h-2 bg-[#d90429] rounded-full shrink-0" />
                    {ing.quantity} {ing.unit} — {ing.product?.name || ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] py-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 text-[#d90429] font-black text-xs tracking-[0.25em] uppercase mb-3">
            <span className="w-1.5 h-4 bg-[#d90429] inline-block" /> NUTRITION CRÉATIVE
          </div>
          <h1 className="font-black text-4xl sm:text-6xl text-white uppercase leading-none tracking-tight mb-2">RECETTES</h1>
          <p className="text-gray-400 text-sm">Des recettes sportives riches en protéines pour atteindre vos objectifs.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#d90429] animate-spin" /></div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Aucune recette disponible.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(r => (
              <div key={r.id} onClick={() => setSelected(r)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-[#d90429] transition-all group"
              >
                <div className="aspect-video bg-[#111] overflow-hidden">
                  {r.image ? (
                    <img src={mediaUrl(`recipes/${r.image}`)} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600"><ChefHat className="w-12 h-12" /></div>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-bold uppercase ${difficultyColor[r.difficulty] || 'text-gray-400'}`}>{difficultyLabel[r.difficulty] || r.difficulty}</span>
                    <span className="text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {(r.preparationTime || 0) + (r.cookingTime || 0)} min</span>
                    <span className="text-gray-500 flex items-center gap-1"><Flame className="w-3 h-3" /> {r.calories} kcal</span>
                  </div>
                  <h3 className="font-black text-white text-sm uppercase group-hover:text-[#d90429] transition-colors">{r.title}</h3>
                  <div className="flex gap-3 text-xs font-bold text-gray-400 pt-1 border-t border-white/5">
                    <span>P: {r.protein}g</span><span>G: {r.carbs}g</span><span>L: {r.fat}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
