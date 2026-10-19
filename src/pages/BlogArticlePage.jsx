import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { blogArticleService, blogCategoryService, mediaUrl } from "../services/api";
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronRight, Clock3,
  Home, Loader2, Tag, UserRound,
} from "lucide-react";

const articleDate = (date) => date
  ? new Date(date).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  : "";

const estimateReadingTime = (content = "") => {
  const words = content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

export const BlogArticlePage = () => {
  const { selectedArticleId, navigateTo, viewBlogArticle } = useCart();
  const [article, setArticle] = useState(null);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedArticleId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      blogArticleService.getOne(selectedArticleId),
      blogArticleService.getAll({ published: true }).catch(() => ({ "hydra:member": [] })),
      blogCategoryService.getAll({ active: true, isActive: true }).catch(() => ({ "hydra:member": [] })),
    ]).then(([detail, articleCollection, categoryCollection]) => {
      if (cancelled) return;
      setArticle(detail);
      setArticles(articleCollection["hydra:member"] || []);
      setCategories(categoryCollection["hydra:member"] || []);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedArticleId]);

  const relatedArticles = useMemo(() => articles
    .filter((item) => String(item.id) !== String(article?.id))
    .sort((a, b) => Number(b.category?.id === article?.category?.id) - Number(a.category?.id === article?.category?.id))
    .slice(0, 4), [articles, article]);

  const categoryCounts = useMemo(() => articles.reduce((counts, item) => {
    const id = item.category?.id;
    if (id != null) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {}), [articles]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#090b0e]">
      <Loader2 className="h-10 w-10 animate-spin text-[#e31837]" />
    </div>
  );
  if (!article) return <div className="bg-[#090b0e] py-20 text-center text-gray-400">Article introuvable.</div>;

  const image = article.image ? mediaUrl(`blog/${article.image}`) : "";
  const readTime = article.readingTime || article.readTime || estimateReadingTime(article.content || "");
  const articleTags = Array.isArray(article.tags)
    ? article.tags
    : typeof article.tags === "string" ? article.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#f3f4f6]">
      <header className="relative isolate overflow-hidden border-b border-[#e31837]/50 bg-[#080a0d]">
        {image && <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080a0d] via-[#080a0d]/90 to-[#080a0d]/40" />
        <div className="mx-auto flex min-h-[300px] max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-gray-300">
              <button onClick={() => navigateTo("home")} className="inline-flex items-center gap-1 hover:text-white" aria-label="Accueil"><Home size={13} /></button>
              <ChevronRight size={13} />
              <button onClick={() => navigateTo("blog")} className="hover:text-white">Blog</button>
              {article.category?.name && <><ChevronRight size={13} /><span>{article.category.name}</span></>}
              <ChevronRight size={13} /><span className="max-w-[18rem] truncate text-gray-400">{article.title}</span>
            </div>
            {article.category?.name && <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e31837] px-4 py-1.5 text-xs font-black uppercase tracking-wide"><BookOpen size={13} />{article.category.name}</span>}
            <h1 className="blog-article-title max-w-4xl text-[2rem] font-extrabold uppercase leading-[1.02] tracking-[-0.025em] text-white sm:text-4xl">
              {article.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-300">
              {article.publishedAt && <span className="inline-flex items-center gap-2"><CalendarDays size={14} />{articleDate(article.publishedAt)}</span>}
              <span className="inline-flex items-center gap-2"><Clock3 size={14} />{readTime} min de lecture</span>
              <span className="inline-flex items-center gap-2"><UserRound size={14} />Par Protein Store Tunisia</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(360px,1fr)] lg:gap-10 lg:px-8">
        <article className="min-w-0">
          {image && <img src={image} alt={article.title} className="mb-3 aspect-[2.4/1] w-full rounded-xl border border-white/10 object-cover shadow-lg shadow-black/30" />}
          {article.summary && (
            <blockquote className="mb-3 flex gap-3 rounded-lg border-l-2 border-[#e31837] bg-[#15181d] px-4 py-4 text-sm italic leading-6 text-gray-200 sm:px-5">
              <span className="text-3xl font-black leading-6 text-[#e31837]" aria-hidden="true">“</span>
              <span>{article.summary}</span>
            </blockquote>
          )}
          <div className="blog-article-content border-b border-white/10 pb-5 text-[15px] leading-7 text-gray-300" dangerouslySetInnerHTML={{ __html: article.content || "" }} />
          <div className="flex flex-wrap gap-2 py-4">
            {[article.category?.name, ...articleTags].filter(Boolean).map((tag, index) => (
              <button key={`${tag}-${index}`} onClick={() => navigateTo("blog")} className="inline-flex items-center gap-1.5 rounded-full border border-[#e31837]/50 bg-[#171014] px-3 py-1.5 text-xs text-gray-200 transition hover:bg-[#e31837]/20"><Tag size={12} className="text-[#e31837]" />{typeof tag === "string" ? tag : tag.name}</button>
            ))}
          </div>
          <button onClick={() => navigateTo("blog")} className="inline-flex items-center gap-2 py-2 text-sm font-bold text-gray-400 transition hover:text-white"><ArrowLeft size={16} />Retour au blog</button>
        </article>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden rounded-lg border border-white/10 bg-[#0c0f13]">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#bd102c] to-[#43101b] px-3 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-black"><BookOpen size={15} />Articles similaires</h2>
              <button onClick={() => navigateTo("blog")} className="rounded-full bg-[#e31837] p-1" aria-label="Voir tous les articles"><ArrowRight size={13} /></button>
            </div>
            <div className="divide-y divide-white/5 px-2">
              {relatedArticles.length ? relatedArticles.map((item) => (
                <button key={item.id} onClick={() => viewBlogArticle(item.id)} className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-white/[0.03]">
                  <div className="h-[76px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-[#171a1f]">
                    {item.image ? <img src={mediaUrl(`blog/${item.image}`)} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" />}
                  </div>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase text-[#f02a45]">{item.category?.name || "Conseils"}</span>
                    <span className="mt-0.5 line-clamp-2 block text-sm font-semibold leading-5 text-gray-100">{item.title}</span>
                    <span className="mt-1 block text-xs text-gray-500">{articleDate(item.publishedAt)} · {item.readingTime || item.readTime || estimateReadingTime(item.content || "")} min</span>
                  </span>
                </button>
              )) : <p className="px-2 py-4 text-xs text-gray-500">Aucun autre article pour le moment.</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-white/10 bg-[#0c0f13] p-2">
            <h2 className="mb-2 flex items-center gap-2 px-1 py-1 text-sm font-black"><Tag size={14} className="text-[#e31837]" />Catégories</h2>
            <div className="space-y-1">
              {categories.map((category) => (
                <button key={category.id} onClick={() => navigateTo("blog")} className="flex w-full items-center justify-between rounded bg-[#15181d] px-2 py-1.5 text-left text-xs text-gray-300 transition hover:bg-[#20242b] hover:text-white">
                  <span className="flex items-center gap-1.5"><ChevronRight size={12} />{category.name}</span>
                  <span className="flex items-center gap-2"><span className="rounded-full bg-[#252a32] px-1.5 text-[10px] text-gray-400">{categoryCounts[category.id] || 0}</span><ChevronRight size={12} className="text-gray-500" /></span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
};
