import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { productService, resolveProductImage } from "../services/api";
import { ArrowRight, Bot, Gauge, MoveUpRight, ShoppingBag, Sparkles, Zap } from "lucide-react";

const normalizeProduct = (p) => ({
  id: p.id,
  name: p.name,
  price: parseFloat(p.price || 0),
  image: resolveProductImage(p, null),
  category: p.category?.name || "",
});

const stripAccents = (value) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const CalculatorPage = () => {
  const { navigateTo, addToCart } = useCart();
  const [age, setAge] = useState("25");
  const [gender, setGender] = useState("H");
  const [weight, setWeight] = useState(82);
  const [height, setHeight] = useState(185);
  const [goal, setGoal] = useState("bulk");
  const [catalog, setCatalog] = useState([]);
  const [results, setResults] = useState({
    targetCalories: 2850,
    proteinGrams: 180,
    carbGrams: 320,
    fatGrams: 75,
    proteinPct: 35,
    carbPct: 45,
    fatPct: 20,
  });

  useEffect(() => {
    productService.getAll({ isActive: true, itemsPerPage: 100 }, true)
      .then((data) => setCatalog((data?.["hydra:member"] || []).map(normalizeProduct)))
      .catch(() => setCatalog([]));
  }, []);

  const calculateMacros = () => {
    const ageValue = Math.min(80, Math.max(15, Number(age) || 25));
    const sexAdjustment = gender === "H" ? 5 : -161;
    const bmr = 10 * weight + 6.25 * height - 5 * ageValue + sexAdjustment;
    const activityFactor = 1.55;

    let calorieAdjustment = 0;
    let proteinPerKg = 2.0;
    let fatPerKg = 0.8;

    if (goal === "bulk") {
      calorieAdjustment = 300;
      proteinPerKg = 2.2;
      fatPerKg = 0.9;
    } else if (goal === "cut") {
      calorieAdjustment = -350;
      proteinPerKg = 2.3;
      fatPerKg = 0.7;
    } else {
      calorieAdjustment = 100;
      proteinPerKg = 1.8;
      fatPerKg = 0.8;
    }

    const targetCalories = Math.max(1400, Math.round(bmr * activityFactor + calorieAdjustment));
    const proteinGrams = Math.round(weight * proteinPerKg);
    const fatGrams = Math.round(weight * fatPerKg);
    const remainingCalories = Math.max(0, targetCalories - (proteinGrams * 4) - (fatGrams * 9));
    const carbGrams = Math.round(remainingCalories / 4);

    const proteinCalories = proteinGrams * 4;
    const carbCalories = carbGrams * 4;
    const fatCalories = fatGrams * 9;
    const totalMacroCalories = Math.max(1, proteinCalories + carbCalories + fatCalories);

    const proteinPct = Math.round((proteinCalories / totalMacroCalories) * 100);
    const carbPct = Math.round((carbCalories / totalMacroCalories) * 100);
    const fatPct = Math.max(0, 100 - proteinPct - carbPct);

    setResults({ targetCalories, proteinGrams, carbGrams, fatGrams, proteinPct, carbPct, fatPct });
  };

  const productsByNeed = useMemo(() => {
    const text = (product) => stripAccents(`${product.name} ${product.category}`);
    const protein = catalog.find((p) => /whey|protein/.test(text(p))) || catalog[0];
    const creatine = catalog.find((p) => /creatine/.test(text(p))) || catalog[1] || catalog[0];
    return { protein, creatine };
  }, [catalog]);

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] font-heading py-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <h1 className="font-black text-4xl sm:text-5xl text-white uppercase tracking-tight">LET'S GET STARTED</h1>
              <p className="text-xs text-gray-400 font-body leading-relaxed max-w-md">
                Calculate an estimated macro target from live product recommendations and your profile.
              </p>
            </div>

            <div className="bg-[#181818] border border-white/10 p-6 rounded-lg space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-300 uppercase tracking-wider block">AGE</label>
                  <div className="h-11 bg-[#0e0e0e] border border-white/10 rounded-xs overflow-hidden">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={age}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        setAge(raw);
                      }}
                      onBlur={() => {
                        const nextAge = Math.min(80, Math.max(15, Number(age) || 25));
                        setAge(String(nextAge));
                      }}
                      className="w-full h-full bg-transparent px-3 text-center text-sm sm:text-base font-black text-white tabular-nums focus:outline-none appearance-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-300 uppercase tracking-wider block">SEX</label>
                  <div className="grid grid-cols-2 bg-[#0e0e0e] border border-white/10 rounded-xs p-1 gap-1">
                    <button type="button" onClick={() => setGender("H")} className={`py-2 text-xs font-black rounded-xs transition-colors ${gender === "H" ? "bg-[#d90429] text-white" : "text-gray-400 hover:text-white"}`}>H</button>
                    <button type="button" onClick={() => setGender("F")} className={`py-2 text-xs font-black rounded-xs transition-colors ${gender === "F" ? "bg-[#d90429] text-white" : "text-gray-400 hover:text-white"}`}>F</button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-black text-gray-300 uppercase tracking-wider">WEIGHT (KG)</label>
                  <span className="font-black text-[#d90429] text-xl">{weight}</span>
                </div>
                <input type="range" min="40" max="150" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full accent-[#d90429] bg-[#2a2a2a] h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-black text-gray-300 uppercase tracking-wider">HEIGHT (CM)</label>
                  <span className="font-black text-[#d90429] text-xl">{height}</span>
                </div>
                <input type="range" min="140" max="220" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-[#d90429] bg-[#2a2a2a] h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-300 uppercase tracking-wider block">PRIMARY GOAL</label>
                <div className="space-y-2">
                  <button type="button" onClick={() => setGoal("bulk")} className={`w-full p-3.5 rounded-xs border text-left flex items-center justify-between font-black text-xs uppercase transition-all ${goal === "bulk" ? "bg-[#161616] border-white/20 text-white" : "bg-[#0e0e0e] border-white/10 text-gray-400 hover:border-white/20"}`}>
                    <span>LEAN BULK</span>
                    <Zap className="w-4 h-4 text-[#d90429] fill-[#d90429]" />
                  </button>
                  <button type="button" onClick={() => setGoal("cut")} className={`w-full p-3.5 rounded-xs border text-left flex items-center justify-between font-black text-xs uppercase transition-all ${goal === "cut" ? "bg-[#161616] border-white/20 text-white" : "bg-[#0e0e0e] border-white/10 text-gray-400 hover:border-white/20"}`}>
                    <span>CUTTING</span>
                    <MoveUpRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => setGoal("endurance")} className={`w-full p-3.5 rounded-xs border text-left flex items-center justify-between font-black text-xs uppercase transition-all ${goal === "endurance" ? "bg-[#161616] border-white/20 text-white" : "bg-[#0e0e0e] border-white/10 text-gray-400 hover:border-white/20"}`}>
                    <span>ENDURANCE</span>
                    <Gauge className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <button type="button" onClick={calculateMacros} className="w-full bg-[#d90429] hover:bg-[#b0021f] text-white font-black text-xs uppercase tracking-widest py-4 rounded-xs shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]">
                CALCULATE MACROS <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#1c1c1c] border border-white/10 p-6 sm:p-8 rounded-lg relative overflow-hidden space-y-8">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d90429]" />

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                  <span className="text-[10px] font-black text-[#d90429] uppercase tracking-widest block">CALORIE TARGET</span>
                  <h2 className="font-black text-5xl sm:text-6xl text-white tracking-tight mt-1">
                    {results.targetCalories.toLocaleString("fr-FR")}
                  </h2>
                  <span className="text-xs font-black text-gray-300 uppercase tracking-widest block mt-1">KCAL / DAY</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 w-full sm:w-auto">
                  <div className="bg-[#0e0e0e] border border-white/10 p-3.5 rounded-xs text-center min-w-[80px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">PROT</span>
                    <div className="font-black text-lg text-white mt-1">{results.proteinGrams}g</div>
                  </div>
                  <div className="bg-[#0e0e0e] border border-white/10 p-3.5 rounded-xs text-center min-w-[80px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">CARB</span>
                    <div className="font-black text-lg text-white mt-1">{results.carbGrams}g</div>
                  </div>
                  <div className="bg-[#0e0e0e] border border-white/10 p-3.5 rounded-xs text-center min-w-[80px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">FAT</span>
                    <div className="font-black text-lg text-white mt-1">{results.fatGrams}g</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-gray-300 uppercase tracking-wider">PROTEIN</span>
                    <span className="text-gray-300">{results.proteinPct}%</span>
                  </div>
                  <div className="w-full bg-[#0e0e0e] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#d90429] h-full transition-all duration-500" style={{ width: `${results.proteinPct}%` }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-gray-300 uppercase tracking-wider">CARBS</span>
                    <span className="text-gray-300">{results.carbPct}%</span>
                  </div>
                  <div className="w-full bg-[#0e0e0e] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gray-300 h-full transition-all duration-500" style={{ width: `${results.carbPct}%` }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-gray-300 uppercase tracking-wider">FAT</span>
                    <span className="text-gray-300">{results.fatPct}%</span>
                  </div>
                  <div className="w-full bg-[#0e0e0e] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gray-500 h-full transition-all duration-500" style={{ width: `${results.fatPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-[#1c0d12] border border-[#d90429]/30 p-6 sm:p-8 rounded-lg space-y-6">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-8xl text-[#d90429]/5 pointer-events-none select-none tracking-widest">
                FUEL
              </div>

              <div className="relative z-10 space-y-2 max-w-lg">
                <h3 className="font-black text-xl sm:text-2xl text-white uppercase tracking-tight">NEED A PERSONAL STACK?</h3>
                <p className="text-xs text-gray-300 font-body leading-relaxed">
                  Use the live catalog to open product pages and add items directly from the recommendation cards below.
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button onClick={() => navigateTo("coach-ia")} className="bg-white hover:bg-gray-100 text-black font-black text-xs uppercase px-5 py-4 rounded-xs flex items-center justify-center gap-2 transition-colors shadow-md">
                  <Bot className="w-4 h-4 text-black" /> OPEN COACH
                </button>
                <button onClick={() => navigateTo("coach-ia")} className="bg-[#d90429] hover:bg-[#b0021f] text-white font-black text-xs uppercase px-5 py-4 rounded-xs flex items-center justify-center gap-2 transition-colors shadow-md">
                  <Sparkles className="w-4 h-4" /> BUILD A PLAN
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6">
          <h2 className="font-black text-xl text-white uppercase tracking-wider">RECOMMENDED STACK</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 text-black flex items-center justify-between gap-6 shadow-md font-heading">
              <div className="w-28 h-28 bg-[#f4f4f4] rounded-md p-2 flex items-center justify-center shrink-0">
                <img src={productsByNeed.protein?.image || "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=800"} alt={productsByNeed.protein?.name || "Protein"} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="bg-[#d90429] text-white text-[9px] font-black px-2.5 py-1 rounded-xs uppercase tracking-wider inline-block">PROTEIN</span>
                <h3 className="font-black text-lg text-black uppercase leading-tight hover:text-[#d90429] transition-colors cursor-pointer" onClick={() => productsByNeed.protein && viewProductDetails(productsByNeed.protein.id)}>
                  {productsByNeed.protein?.name || "Live protein pick"}
                </h3>
                <p className="text-xs text-gray-500 font-body">Recommended from the live catalog.</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-black text-lg text-black">{productsByNeed.protein ? `${productsByNeed.protein.price.toFixed(2)} TND` : "-"}</span>
                  <button onClick={() => productsByNeed.protein && addToCart(productsByNeed.protein)} className="w-9 h-9 bg-black hover:bg-[#d90429] text-white rounded-xs flex items-center justify-center transition-colors shadow-md" title="Add to cart">
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 text-black flex items-center justify-between gap-6 shadow-md font-heading">
              <div className="w-28 h-28 bg-[#f4f4f4] rounded-md p-2 flex items-center justify-center shrink-0">
                <img src={productsByNeed.creatine?.image || "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&q=80&w=800"} alt={productsByNeed.creatine?.name || "Creatine"} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="bg-[#d90429] text-white text-[9px] font-black px-2.5 py-1 rounded-xs uppercase tracking-wider inline-block">FORCE & POWER</span>
                <h3 className="font-black text-lg text-black uppercase leading-tight hover:text-[#d90429] transition-colors cursor-pointer" onClick={() => productsByNeed.creatine && viewProductDetails(productsByNeed.creatine.id)}>
                  {productsByNeed.creatine?.name || "Live creatine pick"}
                </h3>
                <p className="text-xs text-gray-500 font-body">Recommended from the live catalog.</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-black text-lg text-black">{productsByNeed.creatine ? `${productsByNeed.creatine.price.toFixed(2)} TND` : "-"}</span>
                  <button onClick={() => productsByNeed.creatine && addToCart(productsByNeed.creatine)} className="w-9 h-9 bg-black hover:bg-[#d90429] text-white rounded-xs flex items-center justify-center transition-colors shadow-md" title="Add to cart">
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
