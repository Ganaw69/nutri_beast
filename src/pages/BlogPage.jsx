import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { blogArticleService, blogCategoryService } from "../services/api";
import { Search, Calendar, Loader2, ChevronRight } from "lucide-react";

const IMG_BASE = 'https://127.0.0.1:8000/uploads/blog/';

export const BlogPage = () => {
  const { navigateTo, viewBlogArticle } = useCart();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogCategoryService.getAll({ active: true, isActive: true }).catch(() => ({ 'hydra:member': [] })).then(d => setCategories(d['hydra:member'] || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { published: true };
    if (search) params.title = search;
    if (selectedCategory) params.category = `/api/blog_categories/${selectedCategory}`;
    blogArticleService.getAll(params).then(d => {
      setArticles(d['hydra:member'] || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, selectedCategory]);

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] py-12 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 text-[#d90429] font-black text-xs tracking-[0.25em] uppercase mb-3">
            <span className="w-1.5 h-4 bg-[#d90429] inline-block" /> CONTENU EXPERT
          </div>
          <h1 className="font-black text-4xl sm:text-6xl text-white uppercase leading-none tracking-tight mb-4">BLOG &amp; CONSEILS</h1>
          <p className="text-gray-400 text-sm max-w-xl">Nutrition, entraînement et science du sport — des articles rédigés par nos experts.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Rechercher un article..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d90429]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${!selectedCategory ? 'bg-[#d90429] text-white' : 'bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-white'}`}
            >Tous</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${selectedCategory === c.id ? 'bg-[#d90429] text-white' : 'bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-white'}`}
              >{c.name}</button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#d90429] animate-spin" /></div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Aucun article trouvé.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(a => (
              <div key={a.id} onClick={() => viewBlogArticle(a.id)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-[#d90429] transition-all group"
              >
                <div className="aspect-video bg-[#111] overflow-hidden">
                  {a.image ? (
                    <img src={`${IMG_BASE}${a.image}`} alt={a.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">Pas d'image</div>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  {a.category && <span className="text-[10px] font-bold text-[#d90429] uppercase tracking-widest">{a.category.name}</span>}
                  <h3 className="font-black text-white text-sm uppercase leading-tight group-hover:text-[#d90429] transition-colors line-clamp-2">{a.title}</h3>
                  {a.summary && <p className="text-xs text-gray-400 line-clamp-2">{a.summary}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('fr-FR') : ''}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#d90429]" />
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
