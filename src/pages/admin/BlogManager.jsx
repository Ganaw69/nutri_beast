import React, { useState, useEffect, useCallback } from 'react';
import { blogArticleService, blogCategoryService, iriToId, mediaUrl } from '../../services/api';
import { Plus, Edit2, Trash2, Search, X, Loader2, Check, Upload, Eye, EyeOff, Star } from 'lucide-react';
import { AdminActionButton } from '../../components/admin/AdminActionButton';

const EMPTY = { title: '', summary: '', content: '', seoTitle: '', seoDescription: '', published: false, featured: false, categoryId: '' };

export const BlogManager = () => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [artData, catData] = await Promise.all([
        blogArticleService.getAll({ itemsPerPage: 50, ...(search ? { title: search } : {}) }),
        blogCategoryService.getAll({ itemsPerPage: 100 }),
      ]);
      setArticles(artData['hydra:member'] || []);
      setTotal(artData['hydra:totalItems'] || 0);
      setCategories(catData['hydra:member'] || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setForm(EMPTY); setImageFile(null); setModal({ mode: 'add' }); setError(''); };
  const openEdit = (a) => {
    setForm({
      title: a.title || '', summary: a.summary || '', content: a.content || '',
      seoTitle: a.seoTitle || '', seoDescription: a.seoDescription || '',
      published: a.published ?? false, featured: a.featured ?? false,
      categoryId: a.category?.id ? String(a.category.id) : String(iriToId(a.category?.['@id'] || a.category?.iri || a.category || '') || ''),
    });
    setImageFile(null);
    setModal({ mode: 'edit', id: a.id });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal.mode === 'add') {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)));
        if (imageFile) fd.append('imageFile', imageFile);
        await blogArticleService.create(fd);
      } else {
        await blogArticleService.update(modal.id, {
          title: form.title, summary: form.summary, content: form.content,
          seoTitle: form.seoTitle, seoDescription: form.seoDescription,
          published: form.published, featured: form.featured,
          category: form.categoryId ? `/api/blog_categories/${form.categoryId}` : null,
        });
      }
      setModal(null);
      fetchAll();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet article ?')) return;
    try { await blogArticleService.delete(id); fetchAll(); } catch (e) { alert(e.message); }
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'publish') await blogArticleService.publish(id);
      else if (action === 'unpublish') await blogArticleService.unpublish(id);
      else if (action === 'featured') await blogArticleService.featured(id);
      fetchAll();
    } catch (e) { alert(e.message); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setCategorySaving(true);
    setError('');
    try {
      await blogCategoryService.create({
        name,
        active: true,
        position: categories.length + 1,
      });

      setNewCategoryName('');
      setCategoryModal(false);
      fetchAll();
    } catch (e) {
      setError(e.message);
    }
    setCategorySaving(false);
  };

  const inputCls = "w-full bg-[#222] border border-[#333] text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#d90429]";
  const labelCls = "block text-xs font-bold text-gray-400 uppercase mb-1.5";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Blog & Articles</h1>
          <p className="text-gray-400 text-sm">{total} article{total !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCategoryModal(true)} className="bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
            <Plus size={16} /> Catégories
          </button>
          <button onClick={openAdd} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#d90429]/20">
            <Plus size={16} /> Nouvel Article
          </button>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Blog Categories</h3>
            <p className="text-[11px] text-gray-500">Managed from a modal, then selected in blog articles.</p>
          </div>
          <button onClick={fetchAll} className="px-3 py-2 rounded-lg bg-[#222] border border-[#333] text-xs font-bold text-gray-300 hover:text-white">
            Refresh
          </button>
        </div>
        <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]"
            />
          </div>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#d90429] animate-spin" /></div>
          ) : articles.map(a => (
            <div key={a.id} className="p-5 hover:bg-[#1a1a1a] flex items-center gap-4 group transition-colors">
              <div className="w-16 h-12 bg-[#111] rounded-lg overflow-hidden shrink-0">
                {a.image ? <img src={mediaUrl(`blog/${a.image}`)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">N/A</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate">{a.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{a.category?.name || '—'}</span>
                  {a.publishedAt && <span>{new Date(a.publishedAt).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${a.published ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                  {a.published ? 'Publié' : 'Brouillon'}
                </span>
                {a.featured && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">À la une</span>}
                <div className="flex gap-1">
                  <AdminActionButton label={a.published ? 'Unpublish' : 'Publish'} onClick={() => handleAction(a.id, a.published ? 'unpublish' : 'publish')} className="p-1.5 text-gray-300 hover:text-emerald-400 hover:bg-emerald-400/10">
                    {a.published ? <EyeOff size={14} /> : <Eye size={14} />}
                  </AdminActionButton>
                  <AdminActionButton label="Feature" onClick={() => handleAction(a.id, 'featured')} className="p-1.5 text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10">
                    <Star size={14} />
                  </AdminActionButton>
                  <AdminActionButton label="Edit" onClick={() => openEdit(a)} className="p-1.5 text-gray-300 hover:text-white hover:bg-[#333]">
                    <Edit2 size={14} />
                  </AdminActionButton>
                  <AdminActionButton label="Delete" onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-400/10">
                    <Trash2 size={14} />
                  </AdminActionButton>
                </div>
              </div>
            </div>
          ))}
          {!loading && articles.length === 0 && <div className="text-center py-8 text-gray-500">Aucun article.</div>}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white">{modal.mode === 'add' ? 'Nouvel Article' : 'Modifier l\'Article'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 overflow-y-auto flex-1 space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              <div><label className={labelCls}>Titre *</label><input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Catégorie</label>
                <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} className={inputCls}>
                  <option value="">— Aucune —</option>
                  {categories.map((c) => {
                    const id = c.id ?? iriToId(c['@id'] || c.iri || '');
                    return <option key={c['@id'] || c.id || id} value={String(id || '')}>{c.name}</option>;
                  })}
                </select>
              </div>
              <div><label className={labelCls}>Résumé</label><textarea rows={2} value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} className={`${inputCls} resize-none`} /></div>
              <div><label className={labelCls}>Contenu</label><textarea rows={6} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className={`${inputCls} resize-none`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>SEO Titre</label><input value={form.seoTitle} onChange={e => setForm(p => ({ ...p, seoTitle: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>SEO Description</label><input value={form.seoDescription} onChange={e => setForm(p => ({ ...p, seoDescription: e.target.value }))} className={inputCls} /></div>
              </div>
              {modal.mode === 'add' && (
                <div>
                  <label className={labelCls}>Image</label>
                  <label className="border-2 border-dashed border-[#333] rounded-lg p-4 text-center hover:bg-[#222] transition-colors cursor-pointer block">
                    <Upload size={18} className="mx-auto text-gray-500 mb-1" />
                    <span className="text-xs text-gray-500">{imageFile ? imageFile.name : 'Choisir une image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
                  </label>
                </div>
              )}
              <div className="flex gap-6">
                {[['published','Publié'],['featured','À la une']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} className="accent-[#d90429]" />
                    <span className="text-sm text-gray-300">{l}</span>
                  </label>
                ))}
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

      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white">Blog Category</h2>
              <button onClick={() => setCategoryModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded-lg p-3">{error}</div>}
              <div>
                <label className={labelCls}>Category name</label>
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Training"
                  className={inputCls}
                />
              </div>
              <p className="text-[11px] text-gray-500">
                This category will be available only for blog articles.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCategoryModal(false)} className="px-4 py-2 text-sm font-bold text-gray-300 hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={categorySaving} className="bg-[#d90429] hover:bg-[#ff1a3c] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                  {categorySaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
