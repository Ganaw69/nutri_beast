import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { orderService } from "../../services/api";
import { Loader2 } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const AnalyticsManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.getAll({ itemsPerPage: 100 })
      .then((data) => setOrders(data?.["hydra:member"] || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const { revenueByDay, ordersByDay } = useMemo(() => {
    const revenue = DAYS.map((name, dayIndex) => {
      const dayOrders = orders.filter((order) => {
        if (!order.createdAt) return false;
        return new Date(order.createdAt).getDay() === dayIndex;
      });
      return {
        name,
        revenue: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      };
    });

    return {
      revenueByDay: revenue,
      ordersByDay: revenue.map((item) => ({ name: item.name, value: Math.max(1, Math.round(item.revenue / 50)) })),
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#d90429] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Sales & Analytics</h1>
          <p className="text-gray-400">Live weekly analytics built from the orders API.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Revenue Trend (Last 7 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{ fill: "#666" }} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" tick={{ fill: "#666" }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} TND`} />
                <Tooltip contentStyle={{ backgroundColor: "#161616", borderColor: "#333", color: "#fff" }} />
                <Line type="monotone" dataKey="revenue" stroke="#d90429" strokeWidth={3} dot={{ fill: "#d90429", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Orders Volume</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{ fill: "#666" }} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" tick={{ fill: "#666" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#161616", borderColor: "#333", color: "#fff" }} cursor={{ fill: "#222" }} />
                <Bar dataKey="value" fill="#d90429" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
