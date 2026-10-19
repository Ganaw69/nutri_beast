import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { recipeService, bannerService, mediaUrl } from "../services/api";
import {
  ArrowLeft, ArrowRight, Beef, ChefHat, ChevronRight, Clock, CookingPot,
  Droplets, Flame, Home, Leaf, Loader2, Wheat,
} from "lucide-react";

const difficultyLabel = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
const difficultyColor = { easy: "text-emerald-300", medium: "text-amber-300", hard: "text-rose-300" };
const displayNumber = (value) => value == null || value === "" || !Number.isFinite(Number(value))
  ? null
  : Number(value).toLocaleString("fr-TN", { maximumFractionDigits: 1 });
const recipeImageUrl = (image) => {
  if (!image) return null;
  const path = /^(https?:)?\/\//i.test(image) || image.startsWith("/uploads/")
    ? image
    : image.startsWith("uploads/")
      ? `/${image}`
      : `recipes/${image}`;
  return mediaUrl(path);
};
const ingredientName = (ingredient) => ingredient.ingredientName || ingredient.name || ingredient.product?.name || "Ingrédient";

export const RecipesPage = () => {
  const { navigateTo } = useCart();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [promoBanner, setPromoBanner] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([recipeService.getAll({ itemsPerPage: 30 }, true), bannerService.getActive()])
      .then(([recipeResult, bannerResult]) => {
        if (!active) return;
        if (recipeResult.status === "fulfilled") setRecipes(recipeResult.value["hydra:member"] || []);
        if (bannerResult.status === "fulfilled") {
          const banners = bannerResult.value["hydra:member"] || bannerResult.value.member || [];
          setPromoBanner(banners.filter((banner) => banner.isActive !== false && banner.enabled !== false)
            .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))[0] || null);
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (selected) {
    const recipe = selected;
    const relatedRecipes = recipes.filter((item) => String(item.id) !== String(recipe.id)).slice(0, 5);
    const preparationTime = displayNumber(recipe.preparationTime);
    const cookingTime = displayNumber(recipe.cookingTime);
    const totalTime = preparationTime != null || cookingTime != null
      ? Number(recipe.preparationTime || 0) + Number(recipe.cookingTime || 0)
      : null;
    const macros = [
      [Flame, "Calories", displayNumber(recipe.calories), "kcal", "text-rose-400"],
      [Beef, "Protéines", displayNumber(recipe.protein), "g", "text-[#ff526d]"],
      [Wheat, "Glucides", displayNumber(recipe.carbs), "g", "text-amber-300"],
      [Droplets, "Lipides", displayNumber(recipe.fat), "g", "text-sky-300"],
    ].filter(([, , value]) => value != null);
    const proteinAmount = displayNumber(recipe.protein);
    const isProteinRich = proteinAmount != null && Number(recipe.protein) >= 20;
    const categoryLabel = recipe.mealType || recipe.meal || recipe.category?.name || recipe.category || null;
    const descriptionSummary = String(recipe.description || "").trim().length > 180
      ? `${String(recipe.description).trim().slice(0, 177).trimEnd()}…`
      : "";

    return (
      <div className="min-h-screen bg-[#06111b] pb-20 text-[#e5eaf1]">
        <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-sky-100/60" aria-label="Fil d’Ariane">
            <button type="button" onClick={() => navigateTo("home")} className="transition hover:text-white" aria-label="Accueil"><Home size={14} /></button>
            <ChevronRight size={13} /><button type="button" onClick={() => setSelected(null)} className="transition hover:text-white">Recettes</button>
            <ChevronRight size={13} /><span className="max-w-[60vw] truncate text-sky-100">{recipe.title}</span>
          </nav>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] xl:gap-6">
            <div className="min-w-0 space-y-4">
          <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-6">
            <div className="relative aspect-[4/3] w-full self-start overflow-hidden rounded-[14px] border border-[#142d40] bg-[#0a1b29]">
              {recipeImageUrl(recipe.image) ? <img src={recipeImageUrl(recipe.image)} alt={recipe.title} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#10283a] to-[#06111b]"><ChefHat className="h-20 w-20 text-sky-100/20" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#04101b]/70 via-transparent to-black/15" />
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#f20b40] px-3 py-1.5 text-xs font-extrabold text-white shadow-lg"><Leaf size={13} /> Healthy</span>
              <button type="button" onClick={() => setSelected(null)} className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/45 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-black/70"><ArrowLeft size={15} /> Toutes les recettes</button>
            </div>

            <section className="rounded-2xl border border-[#142d40] bg-[#081724] p-5 sm:p-6 xl:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">{categoryLabel && <span className="inline-flex rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-sky-100">{categoryLabel}</span>}<h1 className="mt-3 break-words text-3xl font-black leading-tight text-white sm:text-4xl">{recipe.title}</h1></div>
              </div>
              {descriptionSummary && <p className="mt-4 text-sm leading-6 text-sky-100/75">{descriptionSummary}</p>}

              <div className="mt-6 grid grid-cols-3 gap-2 border-y border-[#142d40] py-4">
                <div className="flex items-center gap-2"><Clock className="h-5 w-5 shrink-0 text-[#ff2349]" /><div><p className="text-[10px] text-sky-100/55">Préparation</p><p className="text-xs font-bold text-white">{preparationTime ?? "—"} min</p></div></div>
                <div className="flex items-center gap-2"><CookingPot className="h-5 w-5 shrink-0 text-[#ff2349]" /><div><p className="text-[10px] text-sky-100/55">Cuisson</p><p className="text-xs font-bold text-white">{cookingTime ?? "—"} min</p></div></div>
                <div className="flex items-center gap-2"><ChefHat className="h-5 w-5 shrink-0 text-[#ff2349]" /><div><p className="text-[10px] text-sky-100/55">Difficulté</p><p className={`text-xs font-bold ${difficultyColor[recipe.difficulty] || "text-white"}`}>{difficultyLabel[recipe.difficulty] || recipe.difficulty || "—"}</p></div></div>
              </div>
              {(totalTime != null) && <p className="mt-3 text-[11px] text-sky-100/55">Temps total : <span className="font-bold text-sky-100">{totalTime} min</span></p>}

            </section>

          </div>

          {macros.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {macros.map(([Icon, label, value, unit, color]) => <div key={label} className="rounded-xl border border-[#142d40] bg-[#081724] p-4"><Icon className={`mb-2 h-5 w-5 ${color}`} /><p className="text-lg font-black text-white">{value}<span className="ml-1 text-[10px] font-semibold text-sky-100/60">{unit}</span></p><p className="text-xs text-sky-100/60">{label}</p></div>)}
          </div>}

          <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
            <section className="rounded-2xl border border-[#142d40] bg-[#081724] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-[#142d40] pb-3"><h2 className="flex items-center gap-2 text-lg font-black text-white"><span className="grid h-8 w-8 place-items-center rounded-full bg-rose-500/10 text-[#ff2349]"><ChefHat size={17} /></span>Ingrédients</h2><span className="text-xs text-sky-100/55">{recipe.ingredients?.length || 0} éléments</span></div>
              {recipe.ingredients?.length ? <ul className="divide-y divide-[#142d40]">{recipe.ingredients.map((ingredient, index) => <li key={`${ingredient.productId || ingredient.product?.id || ingredientName(ingredient)}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="flex min-w-0 items-center gap-3 text-sky-100/80"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#102436] text-[10px] font-bold text-rose-300">{String(index + 1).padStart(2, "0")}</span><span className="truncate">{ingredientName(ingredient)}</span></span><span className="shrink-0 text-xs font-semibold text-sky-100/60">{[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ") || "—"}</span></li>)}</ul> : <p className="py-5 text-sm text-sky-100/50">Aucun ingrédient renseigné.</p>}
            </section>

            <div className="space-y-4">
              <section className="rounded-2xl border border-[#142d40] bg-[#081724] p-5 sm:p-6"><h2 className="flex items-center gap-2 border-l-2 border-[#ff2349] pl-3 text-lg font-black text-white"><span className="grid h-7 w-7 place-items-center rounded-full bg-rose-500/10 text-[#ff2349]"><ChefHat size={15} /></span>Description</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-sky-100/75">{recipe.description || "Aucune description disponible."}</p></section>
          </div>
          </div>
          </div>
            <aside className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-rose-500/35 bg-gradient-to-br from-[#170e19] to-[#0b1420] p-5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-rose-500 text-rose-400"><Beef size={25} /></div>
                <div><h2 className="font-black text-white">{isProteinRich ? "Riche en protéines" : "Informations nutritionnelles"}</h2><p className="mt-1 text-xs leading-5 text-sky-100/60">{proteinAmount != null ? `${proteinAmount} g de protéines renseignées` : "Valeurs nutritionnelles de la recette."}</p></div>
              </div>
              <div className="rounded-2xl border border-[#142d40] bg-[#081724] p-4">
                <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-black text-white">Autres recettes healthy</h2><button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-100/65 transition hover:text-white">Tout voir <ArrowRight size={13} /></button></div>
                {relatedRecipes.length ? <div className="divide-y divide-[#142d40]">{relatedRecipes.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-white/[0.03]">
                  <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-[#102436]">{recipeImageUrl(item.image) ? <img src={recipeImageUrl(item.image)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ChefHat size={19} className="text-sky-100/40" /></div>}</div>
                  <div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-bold text-white">{item.title}</p><p className="mt-1 text-[10px] text-sky-100/55">{displayNumber(item.calories) != null ? `${displayNumber(item.calories)} kcal` : ""}{displayNumber(item.protein) != null ? ` · ${displayNumber(item.protein)} g protéines` : ""}</p></div><ChevronRight size={16} className="shrink-0 text-sky-100/50" />
                </button>)}</div> : <p className="py-4 text-xs text-sky-100/50">Aucune autre recette disponible.</p>}
              </div>
              {promoBanner && <div className="relative min-h-28 overflow-hidden rounded-2xl border border-[#142d40] bg-[#081724]">
                {promoBanner.imageDesktop && <img src={mediaUrl(`banners/desktop/${promoBanner.imageDesktop}`)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
                <div className="absolute inset-0 bg-gradient-to-r from-[#06111b]/95 via-[#06111b]/70 to-transparent" />
                <div className="relative p-4"><h3 className="text-sm font-black text-white">{promoBanner.title}</h3>{promoBanner.subtitle && <p className="mt-1 line-clamp-2 text-xs text-sky-100/75">{promoBanner.subtitle}</p>}{promoBanner.buttonLabel && promoBanner.buttonLink && <a href={promoBanner.buttonLink.startsWith("http") || promoBanner.buttonLink.startsWith("/") || promoBanner.buttonLink.startsWith("#") ? promoBanner.buttonLink : `#${promoBanner.buttonLink}`} className="mt-3 inline-flex rounded-md bg-[#f20b40] px-3 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-[#d90a38]">{promoBanner.buttonLabel}</a>}</div>
              </div>}
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06111b] py-12 pb-24 text-[#e5eaf1]">
      <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
        <div className="border-b border-white/10 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#ff526d]"><span className="inline-block h-4 w-1.5 bg-[#ff2349]" /> Nutrition créative</div>
          <h1 className="mb-2 text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl">Recettes</h1>
          <p className="text-sm text-gray-400">Des recettes sportives pour accompagner vos objectifs.</p>
        </div>
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d90429]" /></div> : recipes.length === 0 ? <div className="py-20 text-center text-gray-500">Aucune recette disponible.</div> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{recipes.map((recipe) => <button key={recipe.id} type="button" onClick={() => setSelected(recipe)} className="group overflow-hidden rounded-2xl border border-[#142d40] bg-[#081724] text-left transition hover:-translate-y-1 hover:border-rose-500/50">
          <div className="aspect-video overflow-hidden bg-[#102436]">{recipeImageUrl(recipe.image) ? <img src={recipeImageUrl(recipe.image)} alt={recipe.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><ChefHat className="h-12 w-12 text-sky-100/25" /></div>}</div>
          <div className="space-y-3 p-5"><div className="flex items-center gap-3 text-xs"><span className={`font-bold uppercase ${difficultyColor[recipe.difficulty] || "text-gray-400"}`}>{difficultyLabel[recipe.difficulty] || recipe.difficulty}</span>{(displayNumber(recipe.preparationTime) != null || displayNumber(recipe.cookingTime) != null) && <span className="flex items-center gap-1 text-gray-500"><Clock className="h-3 w-3" /> {Number(recipe.preparationTime || 0) + Number(recipe.cookingTime || 0)} min</span>}<span className="flex items-center gap-1 text-gray-500"><Flame className="h-3 w-3" /> {displayNumber(recipe.calories) ?? "—"} kcal</span></div><h2 className="text-sm font-black uppercase text-white transition-colors group-hover:text-[#ff526d]">{recipe.title}</h2><div className="flex gap-3 border-t border-white/5 pt-3 text-xs font-bold text-gray-400">{displayNumber(recipe.protein) != null && <span>P: {displayNumber(recipe.protein)}g</span>}{displayNumber(recipe.carbs) != null && <span>G: {displayNumber(recipe.carbs)}g</span>}{displayNumber(recipe.fat) != null && <span>L: {displayNumber(recipe.fat)}g</span>}</div></div>
        </button>)}</div>}
      </div>
    </div>
  );
};
