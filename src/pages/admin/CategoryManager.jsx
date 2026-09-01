import React, { useState, useEffect, useCallback } from 'react';
import { categoryService } from '../../services/api';
import { buildCategoryTree, extractCategoryItems } from '../../utils/categoryTree';
import { FolderTree, Plus, Edit2, Trash2, ChevronRight, ChevronDown, X, Loader2, Check, Upload } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  position: 0,
  isActive: true,
  parent: '',
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const countChildren = (items = []) =>
  items.reduce((total, item) => total + 1 + countChildren(item.children || []), 0);

const parseCategoryId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return parseCategoryId(value.id ?? value['@id'] ?? value.iri ?? value.parent_id ?? value.parentId);
  }
  if (typeof value === 'string') {
    const iriMatch = value.match(/\/categories\/(\d+)$/);
    if (iriMatch) return Number(iriMatch[1]);
    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  }
  return null;
};

export const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll({
        itemsPerPage: 100,
        'order[position]': 'asc',
        'order[name]': 'asc',
      });
      setCategories(extractCategoryItems(data));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const categoryTree = buildCategoryTree(categories);
  const activeCount = categories.filter((cat) => cat.isActive !== false).length;
  const subCategoryCount = countChildren(categoryTree);

  const toggleExpand = (id) => {
    setExpandedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openNew = (parentId = null) => {
    setForm({
      ...EMPTY_FORM,
      parent: parentId ? `/api/categories/${parentId}` : '',
    });
    setEditingCategory({ isNew: true });
    setImageFile(null);
    setError('');
    if (parentId) {
      setExpandedCats((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
    }
  };

  const openEdit = (cat) => {
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      position: cat.position || 0,
      isActive: cat.isActive ?? true,
      parent: cat.parent?.['@id'] || cat.parent || '',
    });
    setEditingCategory({ id: cat.id });
    setImageFile(null);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || undefined,
        position: parseInt(form.position, 10) || 0,
        isActive: form.isActive,
        parent: form.parent || null,
      };

      const saved = editingCategory.isNew
        ? await categoryService.create(payload)
        : await categoryService.update(editingCategory.id, payload);

      if (imageFile && saved?.id) {
        await categoryService.uploadImage(saved.id, imageFile);
      }

      setEditingCategory(null);
      setForm(EMPTY_FORM);
      setImageFile(null);
      await fetchCategories();

      if (saved?.id) {
        const savedId = Number(saved.id);
        setExpandedCats((prev) => (prev.includes(savedId) ? prev : [...prev, savedId]));
        if (saved?.parent?.['@id'] || payload.parent) {
          const parentId = Number(String(saved.parent?.['@id'] || payload.parent).split('/').pop());
          if (!Number.isNaN(parentId)) {
            setExpandedCats((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette categorie ?')) return;
    try {
      await categoryService.delete(id);
      fetchCategories();
    } catch (e) {
      alert(e.message);
    }
  };

  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  const buildParentOptions = (items, depth = 0, excludeId = null) => {
    const options = [];
    items.forEach((cat) => {
      if (excludeId && Number(cat.id) === Number(excludeId)) return;
      options.push({
        id: cat.id,
        label: `${'— '.repeat(depth)}${cat.name}`,
        value: `/api/categories/${cat.id}`,
      });
      options.push(...buildParentOptions(cat.children || [], depth + 1, excludeId));
    });
    return options;
  };

  const renderCat = (cat, depth = 0) => {
    const children = cat.children || [];
    const expanded = expandedCats.includes(cat.id);

    return (
      <div key={cat.id}>
        <div className={`flex items-center justify-between px-4 py-3 hover:bg-[#222] transition-colors group rounded-lg ${depth > 0 ? 'ml-6 border-l border-[#2a2a2a] pl-4' : ''}`}>
          <div className="flex items-center gap-3">
            {children.length > 0 ? (
              <button onClick={() => toggleExpand(cat.id)} className="text-white/60 hover:text-white">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : <div className="w-4" />}
            <FolderTree size={16} className="text-[#d90429]" />
            <span className="font-semibold text-white text-sm">{cat.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cat.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
              {cat.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AdminActionButton label="Add subcategory" onClick={() => openNew(cat.id)} className="p-1.5 text-gray-300 hover:text-[#d90429] hover:bg-[#d90429]/10">
              <Plus size={14} />
            </AdminActionButton>
            <AdminActionButton label="Edit" onClick={() => openEdit(cat)} className="p-1.5 text-gray-300 hover:text-white hover:bg-[#333]">
              <Edit2 size={14} />
            </AdminActionButton>
            <AdminActionButton label="Delete" onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-400/10">
              <Trash2 size={14} />
            </AdminActionButton>
          </div>
        </div>

        {expanded && children.map((child) => renderCat(child, depth + 1))}
      </div>
    );
  };

  const parentOptions = buildParentOptions(categoryTree, 0, editingCategory?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gestion Categories</h1>
          <p className="text-gray-400 text-sm">Organisez votre catalogue en categories et sous-categories. Les categories actives peuvent servir au menu du site.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 rounded-xl border border-[#2a2a2a] bg-[#161616] px-4 py-2 text-xs">
            <div>
              <div className="text-gray-500 uppercase font-bold">Actives</div>
              <div className="text-white font-black text-sm">{activeCount}</div>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div>
              <div className="text-gray-500 uppercase font-bold">Enfants</div>
              <div className="text-white font-black text-sm">{subCategoryCount}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openNew()} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
              <Plus size={16} /> Nouvelle Categorie
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin" /></div>
          ) : categoryTree.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune categorie. Creez-en une.</div>
          ) : (
            <div className="space-y-1">{categoryTree.map((cat) => renderCat(cat))}</div>
          )}
        </div>

        <div className="lg:col-span-1">
          {editingCategory ? (
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 sticky top-24">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-white">{editingCategory.isNew ? 'Nouvelle Categorie' : 'Modifier la categorie'}</h3>
                <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>

              {error && <div className="text-red-400 text-xs mb-3">{error}</div>}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Slug</label>
                  <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className={inputCls} placeholder="Auto generated if empty" />
                </div>

                <div>
                  <label className={labelCls}>Parent category</label>
                  <select value={form.parent} onChange={e => setForm(p => ({ ...p, parent: e.target.value }))} className={inputCls}>
                    <option value="">Top level category</option>
                    {parentOptions.map((option) => (
                      <option key={option.id} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none`} />
                </div>

                <div>
                  <label className={labelCls}>Position</label>
                  <input type="number" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} className={inputCls} />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="accent-[#d90429]" />
                  <span className="text-sm text-gray-300">Active</span>
                </label>

                <div>
                  <label className={labelCls}>Image</label>
                  <label className="border-2 border-dashed border-[#333] rounded-lg p-4 text-center hover:bg-[#222] transition-colors cursor-pointer block">
                    <Upload size={20} className="mx-auto text-gray-500 mb-1" />
                    <span className="text-xs text-gray-500">{imageFile ? imageFile.name : 'Choisir une image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
                  </label>
                </div>

                <div className="rounded-lg border border-white/5 bg-white/5 p-3 text-xs text-gray-400">
                  Active categories can be shown in the storefront navigation, and child categories will appear under their parent automatically.
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="flex-1 bg-[#d90429] hover:bg-[#ff1a3c] text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
                  </button>
                  <button type="button" onClick={() => setEditingCategory(null)} className="px-4 bg-[#333] hover:bg-[#444] text-white py-2 rounded-lg font-bold text-sm">Annuler</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 text-center text-gray-500 sticky top-24">
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a category to edit or create a new one. Use the plus button to add a subcategory directly from the tree.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
