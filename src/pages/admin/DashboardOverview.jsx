import React, { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { orderService, productService } from "../../services/api";
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, MoreVertical, Dumbbell, Zap, Droplet, Package, Coffee, Loader2 } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatMoney = (value) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} TND`;

export const DashboardOverview = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      orderService.getAll({ itemsPerPage: 100 }).catch(() => ({ "hydra:member": [] })),
      productService.getAll({ itemsPerPage: 100 }).catch(() => ({ "hydra:member": [] })),
    ]).then(([orderData, productData]) => {
      setOrders(orderData["hydra:member"] || []);
      setProducts(productData["hydra:member"] || []);
      setLoading(false);
    });
  }, []);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalNetSales = orders.reduce((sum, order) => sum + Number(order.subtotal || order.total || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    const monthly = MONTHS.map((name, monthIndex) => {
      const monthOrders = orders.filter((order) => {
        if (!order.createdAt) return false;
        return new Date(order.createdAt).getMonth() === monthIndex;
      });
      return {
        name,
        gross: monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        net: monthOrders.reduce((sum, order) => sum + Number(order.subtotal || order.total || 0), 0),
      };
    });

    const topPerformers = [...products]
      .sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))
      .slice(0, 5)
      .map((product) => ({
        name: product.name,
        revenue: formatMoney(product.sales || 0),
        icon:
          /creatine/i.test(product.name) ? Zap :
          /water|drink|boisson/i.test(product.name) ? Droplet :
          /shaker|accessoire|bottle/i.test(product.name) ? Coffee :
          /gain|mass/i.test(product.name) ? Package :
          Dumbbell,
      }));

    const categoryMap = new Map();
    products.forEach((product) => {
      const category = product.category?.name || "Other";
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + Number(product.sales || 0) + Number(product.stock || 0));
    });

    const heatmap = [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: index === 0 ? "#e60033" : index === 1 ? "#990022" : index === 2 ? "#59111c" : "#222",
      }));

    return { totalRevenue, totalNetSales, totalOrders, avgOrderValue, monthly, topPerformers, heatmap };
  }, [orders, products]);

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
          <button className="shrink-0 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors sm:px-5">Today</button>
          <button className="shrink-0 border-l border-[#2a2a2a] px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors sm:px-5">Month</button>
          <button className="shrink-0 border-l border-[#e60033] bg-[#e60033] px-4 py-2 text-xs font-bold text-white sm:px-5">Year</button>
          <button className="flex shrink-0 items-center gap-2 border-l border-[#2a2a2a] px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors sm:px-5">
            Custom <CalendarIcon size={14} />
          </button>
        </div>
      </div>

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
            <h2 className="text-lg font-bold text-white">Top Performers</h2>
            <button className="text-[10px] font-bold text-[#e60033] tracking-widest uppercase">View All</button>
          </div>

          <div className="grid grid-cols-4 border-b border-[#2a2a2a] px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 sm:px-6">
            <div className="col-span-3">Product</div>
            <div className="text-right">Revenue</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {metrics.topPerformers.length > 0 ? metrics.topPerformers.map((item, idx) => (
              <div key={idx} className="flex cursor-pointer items-center justify-between border-b border-[#2a2a2a] px-4 py-4 last:border-0 hover:bg-[#1a1a1a] sm:px-6">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="w-8 h-8 rounded border border-[#333] bg-[#111] flex items-center justify-center text-gray-400">
                    <item.icon size={16} />
                  </div>
                  <span className="text-sm font-bold text-gray-300 truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="shrink-0 text-xs font-mono text-gray-400 sm:text-sm">{item.revenue}</span>
              </div>
            )) : (
              <div className="px-6 py-8 text-gray-500 text-sm">No product sales data yet.</div>
            )}
          </div>
        </div>
      </div>

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
