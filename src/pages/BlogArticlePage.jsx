import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { blogArticleService } from "../services/api";
import { ChevronLeft, Calendar, Loader2 } from "lucide-react";

const IMG_BASE = 'https://127.0.0.1:8000/uploads/blog/';

export const BlogArticlePage = () => {
  const { selectedArticleId, navigateTo } = useCart();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedArticleId) return;
    setLoading(true);
    blogArticleService.getOne(selectedArticleId)
      .then(d => { setArticle(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedArticleId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-[#d90429] animate-spin" />
    </div>
  );
  if (!article) return <div className="text-center py-20 text-gray-400">Article introuvable.</div>;

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] py-12 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <button onClick={() => navigateTo("blog")}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#d90429] transition-colors uppercase"
        >
          <ChevronLeft className="w-4 h-4" /> Retour au Blog
        </button>

        {/* Category */}
        {article.category && (
          <span className="text-xs font-black text-[#d90429] uppercase tracking-widest">{article.category.name}</span>
        )}

        <h1 className="font-black text-3xl sm:text-5xl text-white uppercase leading-tight">{article.title}</h1>

        {article.publishedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(article.publishedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}

        {article.image && (
          <img src={`${IMG_BASE}${article.image}`} alt={article.title}
            className="w-full rounded-xl aspect-video object-cover"
          />
        )}

        {article.summary && (
          <p className="text-gray-300 text-base leading-relaxed border-l-4 border-[#d90429] pl-4 italic">{article.summary}</p>
        )}

        <div
          className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: article.content || '' }}
        />
      </div>
    </div>
  );
};
