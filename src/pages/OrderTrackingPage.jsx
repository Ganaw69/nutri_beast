import React, { useState } from "react";
import { Check, Circle, Loader2, Search, Truck, XCircle } from "lucide-react";
import { orderService } from "../services/api";

const STEPS = [
  { key: "pending", label: "Commande reçue" },
  { key: "confirmed", label: "Confirmée" },
  { key: "preparing", label: "En préparation" },
  { key: "shipping", label: "Expédiée" },
  { key: "delivered", label: "Livrée" },
];

const statusKey = (value) => String(value || "").toLowerCase();
const dateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("fr-FR");
};

export const OrderTrackingPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchOrder = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      setOrder(await orderService.track(identifier));
    } catch (requestError) {
      setError(requestError?.message || "Impossible de trouver cette commande.");
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = statusKey(order?.status);
  const isCancelled = currentStatus === "cancelled";
  const currentIndex = STEPS.findIndex((step) => step.key === currentStatus);

  return (
    <section className="min-h-[65vh] bg-[#131313] px-4 py-10 text-[#e5e2e1] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff526d]">Suivi de commande</p>
          <h1 className="mt-2 text-3xl font-black uppercase text-white sm:text-5xl">Où est ma commande ?</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">Saisissez votre numéro de commande pour consulter son état.</p>
        </div>

        <form onSubmit={searchOrder} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="order-tracking-id">Numéro de commande</label>
          <input
            id="order-tracking-id"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Ex. ORD-20261011-CBB8FD ou 6"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#1c1c1c] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[#d90429]"
            required
          />
          <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d90429] px-5 py-3 text-sm font-black text-white transition hover:bg-[#b0021f] disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Rechercher
          </button>
        </form>

        {error && <div role="alert" className="mx-auto mt-5 max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {order && (
          <div className="mt-8 rounded-xl border border-white/10 bg-[#181818] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-5">
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Commande</p><h2 className="mt-1 font-mono text-lg font-black text-white">{order.reference || order.orderReference || `#${order.id}`}</h2></div>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase text-gray-300">{isCancelled ? "Annulée" : order.status || "En attente"}</span>
            </div>

            {isCancelled ? (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-200"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Commande annulée</p><p className="mt-1 text-sm">{order.cancelReason || order.cancellationReason || "Cette commande ne sera pas livrée."}</p></div></div>
            ) : (
              <ol className="mt-7 grid gap-5 sm:grid-cols-5">
                {STEPS.map((step, index) => {
                  const complete = currentIndex >= index;
                  const active = currentIndex === index;
                  return <li key={step.key} className="flex items-center gap-3 sm:block sm:text-center">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${complete ? "border-[#d90429] bg-[#d90429] text-white" : "border-white/20 text-gray-600"}`}>{complete ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</span>
                    <span className={`text-xs font-bold ${active ? "text-white" : complete ? "text-gray-300" : "text-gray-600"}`}>{step.label}</span>
                  </li>;
                })}
              </ol>
            )}
            {order.updatedAt && <p className="mt-7 text-center text-xs text-gray-500">Dernière mise à jour : {dateTime(order.updatedAt)}</p>}
          </div>
        )}
      </div>
    </section>
  );
};
