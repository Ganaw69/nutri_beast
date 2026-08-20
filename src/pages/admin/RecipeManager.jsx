import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { productService, recipeService } from '../../services/api';
import { Plus, Edit2, Trash2, Search, X, Loader2, Check, Upload, ChefHat, Clock, Flame } from 'lucide-react';

const EMPTY_INGREDIENT = { name: '', quantity: '100', unit: 'g' };

const EMPTY = {
  title: '',
  description: '',
  difficulty: 'easy',
  preparationTime: '',
  cookingTime: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  metaTitle: '',
  metaDescription: '',
  ingredients: [EMPTY_INGREDIENT],
};

export const RecipeManager = () => {
  const [recipes, setRecipes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recipeService.getAll({ itemsPerPage: 50, ...(search ? { title: search } : {}) });
      setRecipes(data['hydra:member'] || []);
      setTotal(data['hydra:totalItems'] || 0);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    productService.getAll({ itemsPerPage: 200 }, false)
      .then((data) => setProducts(data['hydra:member'] || []))
      .catch(() => setProducts([]));
  }, []);

  const productNames = useMemo(
    () => products
      .map((product) => product.name || '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr')),
    [products]
  );

  const openAdd = () => {
    setForm(EMPTY);
    setImageFile(null);
    setError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (recipe) => {
    setForm({
      title: recipe.title || '',
      description: recipe.description || '',
      difficulty: recipe.difficulty || 'easy',
      preparationTime: recipe.preparationTime ?? '',
      cookingTime: recipe.cookingTime ?? '',
      calories: recipe.calories ?? '',
      protein: recipe.protein ?? '',
      carbs: recipe.carbs ?? '',
      fat: recipe.fat ?? '',
      metaTitle: recipe.metaTitle || '',
      metaDescription: recipe.metaDescription || '',
      ingredients: (recipe.ingredients || []).map((ing) => ({
        name: ing.product?.name || ing.name || '',
        quantity: String(ing.quantity ?? '100'),
        unit: ing.unit || 'g',
      })),
    });
    setImageFile(null);
    setError('');
    setModal({ mode: 'edit', id: recipe.id });
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette recette ?')) return;
    try {
      await recipeService.delete(id);
      fetchAll();
    } catch (e) {
      alert(e.message);
    }
  };

  const resolveIngredientProductId = (name) => {
    const term = String(name || '').trim().toLowerCase();
    if (!term) return null;
    const exact = products.find((product) => (product.name || '').trim().toLowerCase() === term);
    if (exact) return exact.id;
    const loose = products.find((product) => (product.name || '').trim().toLowerCase().includes(term));
    return loose?.id || null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const ingredients = (form.ingredients || [])
        .map((ing) => ({
          productId: Number(resolveIngredientProductId(ing.name) || 0),
          name: String(ing.name || '').trim(),
          quantity: String(ing.quantity || '').trim(),
          unit: String(ing.unit || 'g').trim() || 'g',
        }));

      const unresolved = ingredients.filter((ing) => !ing.productId && ing.name);
      if (unresolved.length > 0) {
        throw new Error(`Ingrédient introuvable: ${unresolved[0].name}. Crée-le comme produit ou choisis un nom existant.`);
      }

      const payloadIngredients = ingredients
        .filter((ing) => ing.productId > 0 && ing.quantity)
        .map(({ name, ...rest }) => rest);

      if (payloadIngredients.length === 0) {
        throw new Error('Ajoute au moins un ingrédient.');
      }

      if (modal.mode === 'add') {
        const fd = new FormData();
        fd.append('title', form.title);
        fd.append('description', form.description);
        fd.append('difficulty', form.difficulty);
        fd.append('preparationTime', String(form.preparationTime || '0'));
        fd.append('cookingTime', String(form.cookingTime || '0'));
        fd.append('calories', String(form.calories || '0'));
        fd.append('protein', String(form.protein || '0'));
        fd.append('carbs', String(form.carbs || '0'));
        fd.append('fat', String(form.fat || '0'));
        fd.append('metaTitle', form.metaTitle || '');
        fd.append('metaDescription', form.metaDescription || '');
        fd.append('ingredients', JSON.stringify(payloadIngredients));
        if (imageFile) fd.append('imageFile', imageFile);
        await recipeService.create(fd);
      } else {
        await recipeService.update(modal.id, {
          title: form.title,
          description: form.description,
          difficulty: form.difficulty,
          preparationTime: Number(form.preparationTime || 0),
          cookingTime: Number(form.cookingTime || 0),
          calories: String(form.calories || '0'),
          protein: String(form.protein || '0'),
          carbs: String(form.carbs || '0'),
          fat: String(form.fat || '0'),
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
          ingredients: payloadIngredients,
        });
      }

      setModal(null);
      fetchAll();
    } catch (e) {
      setError(e.message);
    }

    setSaving(false);
  };

  const updateIngredient = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, i) => (
        i === index ? { ...ingredient, [key]: value } : ingredient
      )),
    }));
  };

  const addIngredient = () => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { ...EMPTY_INGREDIENT }],
    }));
  };

  const removeIngredient = (index) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.length > 1
        ? prev.ingredients.filter((_, i) => i !== index)
        : [{ ...EMPTY_INGREDIENT }],
    }));
  };

  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Recettes</h1>
          <p className="text-gray-400 text-sm">{total} recette{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
          <Plus size={16} /> Nouvelle Recette
        </button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]"
            />
          </div>
        </div>

        <div className="divide-y divide-[#2a2a2a]">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin" /></div>
          ) : recipes.map((recipe) => (
            <div key={recipe.id} className="p-5 hover:bg-[#1a1a1a] flex items-center gap-4 group transition-colors">
              <div className="w-16 h-12 bg-[#111] rounded-lg overflow-hidden shrink-0">
                {recipe.image ? <img src={`https://127.0.0.1:8000/uploads/recipes/${recipe.image}`} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs"><ChefHat size={16} /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate">{recipe.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="uppercase">{recipe.difficulty || 'easy'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {(recipe.preparationTime || 0) + (recipe.cookingTime || 0)} min</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {recipe.calories || 0} kcal</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(recipe)} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(recipe.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {!loading && recipes.length === 0 && <div className="text-center py-8 text-gray-500">Aucune recette.</div>}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouvelle Recette' : 'Modifier la Recette'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 overflow-y-auto flex-1 space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              <div><label className={labelCls}>Titre *</label><input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Description</label><textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Difficulte</label>
                  <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))} className={inputCls}>
                    <option value="easy">Facile</option>
                    <option value="medium">Moyen</option>
                    <option value="hard">Difficile</option>
                  </select>
                </div>
                <div><label className={labelCls}>Image</label>
                  <label className="border-2 border-dashed border-[#333] rounded-lg p-4 text-center hover:bg-[#222] transition-colors cursor-pointer block">
                    <Upload size={18} className="mx-auto text-gray-500 mb-1" />
                    <span className="text-xs text-gray-500">{imageFile ? imageFile.name : 'Choisir une image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div><label className={labelCls}>Preparation</label><input type="number" min="0" value={form.preparationTime} onChange={e => setForm(p => ({ ...p, preparationTime: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Cooking</label><input type="number" min="0" value={form.cookingTime} onChange={e => setForm(p => ({ ...p, cookingTime: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Calories</label><input type="number" min="0" value={form.calories} onChange={e => setForm(p => ({ ...p, calories: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Protein</label><input type="number" step="0.1" min="0" value={form.protein} onChange={e => setForm(p => ({ ...p, protein: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Carbs</label><input type="number" step="0.1" min="0" value={form.carbs} onChange={e => setForm(p => ({ ...p, carbs: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Fat</label><input type="number" step="0.1" min="0" value={form.fat} onChange={e => setForm(p => ({ ...p, fat: e.target.value }))} className={inputCls} /></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className={labelCls}>Ingredients</label>
                  <button type="button" onClick={addIngredient} className="text-xs font-bold text-[#d90429] hover:text-[#ff1a3c] flex items-center gap-1">
                    <Plus size={14} /> Add ingredient
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.ingredients || []).map((ingredient, index) => (
                    <div key={`${index}-${ingredient.name || 'new'}`} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg border border-[#333] bg-[#111]">
                      <div className="sm:col-span-5">
                        <label className={labelCls}>Ingredient name</label>
                        <input
                          value={ingredient.name}
                          list="ingredient-products"
                          onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                          className={inputCls}
                          placeholder="Chicken, rice, whey..."
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className={labelCls}>Quantity</label>
                        <input
                          value={ingredient.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                          className={inputCls}
                          placeholder="100"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className={labelCls}>Unit</label>
                        <input
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          className={inputCls}
                          placeholder="g"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="w-full h-[42px] flex items-center justify-center rounded-lg border border-red-900/40 bg-[#3a1111] text-red-300 hover:text-red-100"
                          title="Remove ingredient"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <datalist id="ingredient-products">
                  {productNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Meta title</label><input value={form.metaTitle} onChange={e => setForm(p => ({ ...p, metaTitle: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>Meta description</label><input value={form.metaDescription} onChange={e => setForm(p => ({ ...p, metaDescription: e.target.value }))} className={inputCls} /></div>
              </div>
            </form>
            <div className="p-5 border-t border-[#2a2a2a] flex gap-3 justify-end bg-[#1a1a1a] rounded-b-xl">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 text-sm font-bold text-gray-300 hover:text-white">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
