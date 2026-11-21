import React, { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { orderService, productService, hydrateProductsWithImages, resolveProductImage } from "../../services/api";
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, MoreVertical, Dumbbell, Zap, Droplet, Package, Coffee, Loader2, X } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PERIODS = [
  { key: "today", label: "Today" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Custom" },
];

const formatMoney = (value) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} TND`;
const dateKey = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};
const orderItems = (order) => {
  const items = order?.items ?? order?.orderItems ?? order?.order_items ?? [];
  return Array.isArray(items) ? items : [];
};
const entityKey = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") return entityKey(value.id ?? value["@id"] ?? value.iri);
  return String(value).split("/").filter(Boolean).pop() || "";
};
const itemProductId = (item) => {
  const product = item?.product;
  return entityKey(product ?? item?.productId ?? item?.productIri);
};
const itemValue = (item) => Number(item?.subtotal ?? item?.lineSubtotal ?? item?.total ?? item?.unitPrice ?? item?.price ?? 0)
  * (item?.subtotal == null && item?.lineSubtotal == null && item?.total == null ? Number(item?.quantity ?? item?.qty ?? 1) : 1);
const itemQuantity = (item) => {
  const quantity = Number(item?.quantity ?? item?.qty ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const ProductRankingRow = ({ item, rank, compact = false }) => (
  <div className={`flex min-w-0 items-center justify-between gap-3 border-b border-[#2a2a2a] last:border-0 hover:bg-[#1a1a1a] ${compact ? "px-4 py-3 sm:px-6" : "px-4 py-3"}`}>
    <div className="flex min-w-0 items-center gap-3">
      <span className="w-5 shrink-0 text-xs font-mono text-gray-500">{rank}.</span>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-[#333] bg-[#111] text-gray-400">
        {item.image
          ? <img src={item.image} alt="" className="h-full w-full object-contain" loading="lazy" />
          : <item.icon size={16} />}
      </div>
      <span className="min-w-0 truncate text-sm font-bold text-gray-200" title={item.name}>{item.name}</span>
    </div>
    <span className="shrink-0 text-right text-xs font-mono text-gray-400">
      {Number(item.unitsSold || 0).toLocaleString("fr-FR")} vendu{Number(item.unitsSold || 0) === 1 ? "" : "s"}
    </span>
  </div>
);

export const DashboardOverview = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showAllPerformers, setShowAllPerformers] = useState(false);
  const [performerLimit, setPerformerLimit] = useState(10);

  useEffect(() => {
    let active = true;
    Promise.all([
      orderService.getAllPages({ itemsPerPage: 100 }).catch(() => ({ "hydra:member": [] })),
      productService.getAllPages({ itemsPerPage: 100 }).catch(() => ({ "hydra:member": [] })),
    ]).then(([orderData, productData]) => {
      if (!active) return;
      setOrders(orderData["hydra:member"] || []);
      const catalogProducts = productData["hydra:member"] || [];
      setProducts(catalogProducts);
      setLoading(false);
      void hydrateProductsWithImages(catalogProducts).then((productsWithImages) => {
        if (active) setProducts(productsWithImages);
      }).catch(() => {
        if (active) setProducts(catalogProducts);
      });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!showAllPerformers) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowAllPerformers(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showAllPerformers]);

  const metrics = useMemo(() => {
    const now = new Date();
    let start;
    let end;
    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (period === "custom") {
      start = customStart ? new Date(`${customStart}T00:00:00`) : new Date(0);
      end = customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date(8640000000000000);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
    }

    const filteredOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt <= end;
    });
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalNetSales = filteredOrders.reduce((sum, order) => sum + Number(order.subtotal || order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const chartBuckets = period === "year"
      ? MONTHS.map((name, monthIndex) => ({ name, matches: (date) => date.getMonth() === monthIndex }))
      : period === "month"
        ? Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, index) => {
          const day = index + 1;
          return { name: String(day), matches: (date) => date.getDate() === day };
        })
        : period === "today"
          ? [{ name: "Today", matches: () => true }]
          : [{ name: "Custom", matches: () => true }];
    const monthly = chartBuckets.map(({ name, matches }) => {
      const bucketOrders = filteredOrders.filter((order) => matches(new Date(order.createdAt)));
      return {
        name,
        gross: bucketOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        net: bucketOrders.reduce((sum, order) => sum + Number(order.subtotal || order.total || 0), 0),
      };
    });

    const productMap = new Map(products.map((product) => [
      entityKey(product.id ?? product["@id"] ?? product.iri),
      product,
    ]).filter(([id]) => id));
    const productSales = new Map();
    const categoryMap = new Map();
    filteredOrders.forEach((order) => {
      orderItems(order).forEach((item) => {
        const productId = itemProductId(item);
        const embeddedProduct = typeof item.product === "object" ? item.product : null;
        const product = productMap.get(productId) || embeddedProduct;
        const productKey = productId || `name:${String(product?.name ?? item?.productName ?? item?.name ?? "Produit inconnu").toLocaleLowerCase()}`;
        const sales = productSales.get(productKey) || {
          ...(product || {
            id: productKey,
            name: item?.productName ?? item?.name ?? "Produit inconnu",
            image: item?.productImage ?? item?.image,
          }),
          unitsSold: 0,
          revenue: 0,
        };
        sales.unitsSold += itemQuantity(item);
        sales.revenue += itemValue(item);
        productSales.set(productKey, sales);
        const category = product?.category?.name || "Other";
        categoryMap.set(category, (categoryMap.get(category) || 0) + itemValue(item));
      });
    });

    const rankedProducts = new Map();
    products.forEach((product) => {
      const key = entityKey(product.id ?? product["@id"] ?? product.iri);
      if (!key) return;
      rankedProducts.set(key, {
        ...product,
        unitsSold: 0,
        revenue: 0,
      });
    });
    productSales.forEach((sales, key) => {
      const catalogProduct = productMap.get(key);
      rankedProducts.set(key, {
        ...(catalogProduct || sales),
        ...sales,
        unitsSold: sales.unitsSold,
        revenue: sales.revenue,
      });
    });
    const rankByUnits = (first, second) => (
      second.unitsSold - first.unitsSold
      || second.revenue - first.revenue
      || String(first.name || "").localeCompare(String(second.name || ""), "fr")
    );
    const decorateProduct = (product) => ({
      ...product,
      image: resolveProductImage(product, null),
      icon:
        /creatine/i.test(product.name) ? Zap :
        /water|drink|boisson/i.test(product.name) ? Droplet :
        /shaker|accessoire|bottle/i.test(product.name) ? Coffee :
        /gain|mass/i.test(product.name) ? Package :
        Dumbbell,
    });
    const rankedList = [...rankedProducts.values()];
    const rankedBySales = rankedList
      .filter((product) => product.unitsSold > 0)
      .sort(rankByUnits)
      .map(decorateProduct);
    const topPerformers = rankedBySales.slice(0, 5);
    const leastPerformers = rankedList
      .filter((product) => product.isActive !== false)
      .sort((first, second) => (
        first.unitsSold - second.unitsSold
        || first.revenue - second.revenue
        || String(first.name || "").localeCompare(String(second.name || ""), "fr")
      ))
      .map(decorateProduct);

    const heatmap = [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: index === 0 ? "#e60033" : index === 1 ? "#990022" : index === 2 ? "#59111c" : "#222",
      }));

    return { totalRevenue, totalNetSales, totalOrders, avgOrderValue, monthly, topPerformers, rankedBySales, leastPerformers, heatmap };
  }, [orders, products, period, customStart, customEnd]);

  const maxHeatValue = Math.max(...metrics.heatmap.map((item) => item.value), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#d90429] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[#111] pb-6 sm:pb-10">
      <div className="mb-6 flex flex-col gap-4 px-0 pt-1 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-2 sm:pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">Sales Analytics</h1>
          <p className="text-gray-500 text-sm">Derived from live orders and products.</p>
        </div>
        <div className="flex w-full items-center overflow-x-auto rounded border border-[#2a2a2a] bg-[#161616] sm:w-auto">
          {PERIODS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setPeriod(key)} className={`shrink-0 px-4 py-2 text-xs font-bold transition-colors sm:px-5 ${period === key ? "bg-[#e60033] text-white" : "text-gray-400 hover:text-white"} ${key !== "today" ? "border-l border-[#2a2a2a]" : ""}`}>
              {label} {key === "custom" && <CalendarIcon className="ml-1 inline" size={14} />}
            </button>
          ))}
        </div>
      </div>
      {period === "custom" && (
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded border border-[#2a2a2a] bg-[#161616] p-4">
          <label className="text-xs font-bold text-gray-400">From<input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="mt-1 block rounded border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" /></label>
          <label className="text-xs font-bold text-gray-400">To<input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="mt-1 block rounded border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" /></label>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:mb-6 lg:grid-cols-4 lg:gap-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-[11px] font-mono font-bold tracking-widest uppercase">Gross Revenue</h3>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter sm:text-4xl">{formatMoney(metrics.totalRevenue)}</h2>
          <div className="flex items-center gap-2 text-[11px] font-mono mt-4">
            <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
            <span className="text-gray-500">from orders API</span>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-[11px] font-mono font-bold tracking-widest uppercase">Net Sales</h3>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter sm:text-4xl">{formatMoney(metrics.totalNetSales)}</h2>
          <div className="flex items-center gap-2 text-[11px] font-mono mt-4">
            <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
            <span className="text-gray-500">subtotal / total</span>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-[11px] font-mono font-bold tracking-widest uppercase">Avg Order Value</h3>
            <TrendingDown size={16} className="text-red-400" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter sm:text-4xl">{formatMoney(metrics.avgOrderValue)}</h2>
          <div className="flex items-center gap-2 text-[11px] font-mono mt-4">
            <span className="text-gray-400 font-bold bg-[#333] px-1.5 py-0.5 rounded">API</span>
            <span className="text-gray-500">{metrics.totalOrders} orders</span>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 sm:p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-[11px] font-mono font-bold tracking-widest uppercase">Total Orders</h3>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter sm:text-4xl">{metrics.totalOrders.toLocaleString("fr-FR")}</h2>
          <div className="flex items-center gap-2 text-[11px] font-mono mt-4">
            <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
            <span className="text-gray-500">current dataset</span>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:mb-6 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2 bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Revenue vs Net Sales</h2>
              <p className="text-gray-500 text-sm">Monthly revenue built from orders</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e60033]"></span> Gross
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#444]"></span> Net
              </div>
              <MoreVertical size={18} className="text-gray-500 ml-2" />
            </div>
          </div>

          <div className="h-60 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthly} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e60033" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#e60033" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical horizontal />
                <XAxis dataKey="name" stroke="#444" tick={{ fill: "#666", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} />
                <YAxis stroke="#444" tick={{ fill: "#666", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => (v === 0 ? "0" : `${Math.round(v / 1000)}k`)} />
                <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#333", color: "#fff", borderRadius: "8px" }} itemStyle={{ color: "#e60033" }} />
                <Area type="monotone" dataKey="net" stroke="#555" strokeWidth={3} fill="none" />
                <Area type="monotone" dataKey="gross" stroke="#e60033" strokeWidth={4} fillOpacity={1} fill="url(#colorGross)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg flex flex-col">
          <div className="flex items-center justify-between border-b border-[#2a2a2a] p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white">Top 5 produits vendus</h2>
            <button
              type="button"
              onClick={() => setShowAllPerformers(true)}
              className="text-[10px] font-bold uppercase tracking-widest text-[#e60033] hover:text-white"
            >
              Voir tout
            </button>
          </div>

          <div className="grid grid-cols-4 border-b border-[#2a2a2a] px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 sm:px-6">
            <div className="col-span-3">Produit</div>
            <div className="text-right">Vendus</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {metrics.topPerformers.length > 0 ? metrics.topPerformers.map((item, idx) => (
              <ProductRankingRow key={entityKey(item.id ?? item["@id"]) || item.name} item={item} rank={idx + 1} compact />
            )) : (
              <div className="px-6 py-8 text-sm text-gray-500">Aucune vente de produit pour cette période.</div>
            )}
          </div>
        </div>
      </div>

      {showAllPerformers && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAllPerformers(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-ranking-title"
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#333] bg-[#151515] shadow-2xl"
          >
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a2a2a] p-4 sm:p-6">
              <div>
                <h2 id="product-ranking-title" className="text-xl font-bold text-white">Classement des ventes</h2>
                <p className="mt-1 text-xs text-gray-500">Basé sur les quantités vendues pour la période sélectionnée.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-gray-400">
                  Produits affichés
                  <select
                    value={performerLimit}
                    onChange={(event) => setPerformerLimit(Number(event.target.value))}
                    className="ml-2 rounded border border-[#333] bg-[#111] px-2 py-2 text-white"
                  >
                    {[10, 20, 30].map((limit) => <option key={limit} value={limit}>Top {limit}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAllPerformers(false)}
                  aria-label="Fermer le classement"
                  className="rounded p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </header>
            <div className="grid min-h-0 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-2">
              {[
                { title: `Les ${performerLimit} plus vendus`, items: metrics.rankedBySales.slice(0, performerLimit) },
                { title: `Les ${performerLimit} moins vendus`, items: metrics.leastPerformers.slice(0, performerLimit) },
              ].map((group) => (
                <section key={group.title} className="min-w-0 rounded-lg border border-[#2a2a2a] bg-[#111]">
                  <h3 className="border-b border-[#2a2a2a] px-4 py-3 text-sm font-bold text-white">{group.title}</h3>
                  <div className="max-h-[55vh] overflow-y-auto">
                    {group.items.length > 0 ? group.items.map((item, index) => (
                      <ProductRankingRow key={entityKey(item.id ?? item["@id"]) || `${group.title}-${index}`} item={item} rank={index + 1} />
                    )) : (
                      <p className="p-4 text-sm text-gray-500">Aucune donnée de vente pour cette période.</p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4 sm:mb-6">Category Performance Heatmap</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {metrics.heatmap.map((item) => (
            <div key={item.name} className="flex aspect-square min-h-28 flex-col justify-between rounded px-3 py-3 sm:px-4" style={{ backgroundColor: item.color }}>
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">{item.name}</span>
              <span className="text-2xl font-black text-white">{Math.round((item.value / maxHeatValue) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
