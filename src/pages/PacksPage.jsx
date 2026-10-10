import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import {
  iriToId,
  hydrateProductsWithImages,
  mediaUrl,
  packProductService,
  packService,
  productService,
  resolveProductImage,
} from "../services/api";
import { ArrowLeft, Eye, Loader2, Package, ShoppingBag } from "lucide-react";

const money = (value) => `${Number(value || 0).toFixed(2)} TND`;
const entityId = (value) => {
  if (value == null) return null;
  if (typeof value === "object") return value.id ?? iriToId(value["@id"] || value.iri);
  return iriToId(value) ?? value;
};
const apiDate = (value) => value ? new Date(value) : null;
const isAvailable = (pack, now = new Date()) => {
  const active = pack.isActive ?? pack.active ?? pack.enabled ?? pack.published;
  if (active === false || active === 0 || active === "false") return false;
  const start = apiDate(pack.startDate);
  const end = apiDate(pack.endDate);
  return (!start || start <= now) && (!end || end >= now);
};
const packImageUrl = (pack) => {
  const raw = pack?.imageUrl || pack?.image;
  const value = typeof raw === "object" ? raw?.url || raw?.image || raw?.path : raw;
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const filename = String(value).replace(/^\/?uploads\/pack\//, "").replace(/^\/+/, "");
  return mediaUrl(`pack/${filename}`);
};
const packReadError = (error) => {
  if (/\b(401|403)\b|jwt token/i.test(error?.message || "")) {
    return "Le catalogue de packs est bloqué par les permissions actuelles de l’API. L’équipe doit autoriser la lecture publique de /api/packs et /api/pack_products.";
  }
  return error?.message || "Impossible de charger les packs pour le moment.";
};
const packItems = (pack) => Array.isArray(pack?.packProducts) ? pack.packProducts : [];
const typeLabel = (pack) => pack.type === "CUSTOM" ? "Personnalisable" : "Pack prédéfini";

const PackCard = ({ pack, onDetails }) => {
  const image = packImageUrl(pack);
  const count = packItems(pack).length;
  const hasConfiguredPrice = Number(pack.finalPrice) > 0 || Number(pack.basePrice) > 0;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#111111] shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-white/25">
      <button type="button" onClick={() => onDetails(pack.id)} className="relative flex aspect-square w-full items-center justify-center bg-[#f0f0f0] p-6" aria-label={`Voir le pack ${pack.name}`}>
        {image ? <img src={image} alt={pack.name} loading="lazy" decoding="async" className="h-full w-full object-contain" /> : <Package className="h-16 w-16 text-gray-400" aria-hidden="true" />}
      </button>
      <div className="flex flex-1 flex-col gap-4 p-4 text-white sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded border border-[#d90429]/40 bg-[#d90429]/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#ff7186]">{typeLabel(pack)}</span>
          <span className="text-[10px] text-gray-400">{count ? `${count} ${count === 1 ? "produit" : "produits"}` : "Composition à compléter"}</span>
        </div>
        <div className="flex-1">
          <h2 className="line-clamp-2 text-base font-black uppercase leading-5">{pack.name}</h2>
          {pack.description && <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-400">{pack.description}</p>}
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-white/10 pt-3">
          <div>
            {pack.basePrice != null && hasPrice && Number(pack.basePrice) > Number(pack.finalPrice) && <p className="text-xs text-gray-500 line-through">{money(pack.basePrice)}</p>}
            <p className="text-lg font-black">{hasConfiguredPrice ? money(pack.finalPrice) : "Prix à configurer"}</p>
            {Number(pack.discountAmount) > 0 && <p className="text-[10px] font-bold text-emerald-400">Économie : {money(pack.discountAmount)}</p>}
          </div>
          <button type="button" onClick={() => onDetails(pack.id)} className="inline-flex shrink-0 items-center gap-2 rounded bg-[#d90429] px-3 py-2.5 text-[10px] font-black uppercase text-white transition hover:bg-[#b0021f]">
            <Eye className="h-4 w-4" /> Détails
          </button>
        </div>
      </div>
    </article>
  );
};

export const PacksPage = () => {
  const { viewPackDetails } = useCart();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    packService.getAll({ itemsPerPage: 100, "order[position]": "asc" }, true)
      .then((data) => {
        if (current) setPacks((data["hydra:member"] || []).filter((pack) => isAvailable(pack)));
      })
      .catch((err) => { if (current) setError(packReadError(err)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[#131313] px-4 py-10 pb-20 text-[#e5e2e1] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff526d]">Sélection Protein Store</p><h1 className="mt-2 text-3xl font-black uppercase text-white sm:text-5xl">Nos packs</h1><p className="mt-3 max-w-2xl text-sm text-gray-400">Retrouvez la composition et le tarif enregistré de chaque pack.</p></div>
          <span className="hidden rounded-lg border border-white/10 bg-[#1b1b1b] px-4 py-3 text-xs font-bold text-gray-300 sm:block">{packs.length} pack{packs.length === 1 ? "" : "s"}</span>
        </div>

        {loading ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Chargement des packs">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-[14px] border border-white/10 bg-[#1a1a1a]" />)}</div>
          : error ? <div role="alert" className="rounded-xl border border-[#d90429]/40 bg-[#d90429]/10 p-5 text-sm text-red-100"><p className="font-bold">Impossible d’afficher les packs</p><p className="mt-2 leading-6">{error}</p></div>
            : packs.length === 0 ? <div className="rounded-xl border border-white/10 bg-[#181818] p-10 text-center"><Package className="mx-auto h-10 w-10 text-gray-500" /><h2 className="mt-4 font-black uppercase text-white">Aucun pack disponible</h2><p className="mt-2 text-sm text-gray-400">Les packs actifs seront affichés ici.</p></div>
              : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{packs.map((pack) => <PackCard key={pack.id ?? pack["@id"]} pack={pack} onDetails={viewPackDetails} />)}</div>}
      </div>
    </div>
  );
};

export const PackDetailPage = () => {
  const { selectedPackId, navigateTo } = useCart();
  const [pack, setPack] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    if (!selectedPackId) {
      setError("Ce pack n’existe pas ou son lien est incomplet.");
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError("");
    const load = async () => {
      const packData = await packService.getOne(selectedPackId, true);
      if (!isAvailable(packData)) throw new Error("Ce pack n’est pas disponible actuellement.");
      let relations = packItems(packData);
      if (relations.length === 0) {
        const data = await packProductService.getAll({ pack: selectedPackId, itemsPerPage: 100, "order[position]": "asc" }, true);
        relations = data["hydra:member"] || [];
      }
      const details = await Promise.all(relations.map(async (relation) => {
        const relationId = entityId(relation);
        const relationData = typeof relation === "object" && relation.product !== undefined
          ? relation
          : relationId != null ? await packProductService.getOne(relationId, true) : null;
        if (!relationData) return null;
        const productReference = relationData.product;
        const productId = entityId(productReference);
        const product = typeof productReference === "object" && productReference?.name
          ? productReference
          : productId != null ? await productService.getOne(productId, true) : null;
        if (!product) return null;
        const normalizedProduct = {
          ...product,
          mainImage: product.mainImage ?? product.mainImageUrl ?? product.main_image_url,
        };
        const [productWithImages] = await hydrateProductsWithImages([normalizedProduct], true);
        return { id: relationData.id ?? relationId, quantity: Number(relationData.quantity || 1), required: relationData.required !== false, product: productWithImages };
      }));
      if (current) { setPack(packData); setContents(details.filter(Boolean)); }
    };
    load().catch((err) => { if (current) setError(packReadError(err)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [selectedPackId]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center bg-[#131313]" role="status"><Loader2 className="h-8 w-8 animate-spin text-[#d90429]" /><span className="sr-only">Chargement du pack</span></div>;
  if (error || !pack) return <div className="min-h-[50vh] bg-[#131313] px-4 py-10 text-white"><div className="mx-auto max-w-4xl rounded-xl border border-[#d90429]/40 bg-[#181818] p-6"><p role="alert" className="text-sm text-red-100">{error || "Pack introuvable."}</p><button onClick={() => navigateTo("packs")} className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-white hover:text-[#ff526d]"><ArrowLeft className="h-4 w-4" /> Retour aux packs</button></div></div>;

  const image = packImageUrl(pack);
  const customizable = pack.type === "CUSTOM" && (pack.isCustomizable === true || pack.customizable === true);
  const hasConfiguredPrice = Number(pack.finalPrice) > 0 || Number(pack.basePrice) > 0;
  const isReadyToOrder = contents.length > 0 && hasConfiguredPrice;
  return (
    <div className="min-h-screen bg-[#131313] px-4 py-8 pb-20 text-[#e5e2e1] sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => navigateTo("packs")} className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Tous les packs</button>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#f0f0f0] p-5 sm:min-h-[440px] sm:p-10">{image ? <img src={image} alt={pack.name} className="max-h-[70vh] w-full object-contain" /> : <Package className="h-20 w-20 text-gray-400" />}</div>
          <div>
            <span className="inline-flex rounded border border-[#d90429]/40 bg-[#d90429]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#ff7186]">{typeLabel(pack)}</span>
            <h1 className="mt-4 text-3xl font-black uppercase leading-tight text-white sm:text-5xl">{pack.name}</h1>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              {hasConfiguredPrice && pack.basePrice != null && <span className={Number(pack.basePrice) > Number(pack.finalPrice) ? "text-sm text-gray-500 line-through" : "text-2xl font-black text-white"}>{money(pack.basePrice)}</span>}
              <strong className="text-2xl font-black text-white">{hasConfiguredPrice ? money(pack.finalPrice) : "Prix à configurer"}</strong>
              {Number(pack.discountAmount) > 0 && <span className="text-sm font-bold text-emerald-400">Économie {money(pack.discountAmount)}</span>}
            </div>
            {pack.description && <p className="mt-6 whitespace-pre-line border-y border-white/10 py-5 text-sm leading-7 text-gray-300">{pack.description}</p>}
            <div className="mt-6 rounded-xl border border-white/10 bg-[#181818] p-4 sm:p-5">
              <h2 className="font-black uppercase text-white">Composition du pack <span className="ml-1 text-gray-400">({contents.length})</span></h2>
              {contents.length ? <ul className="mt-4 divide-y divide-white/10">{contents.map((entry, index) => {
                const productImage = resolveProductImage(entry.product, null);
                return <li key={entry.id ?? index} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0f0f0] p-1.5">{productImage ? <img src={productImage} alt="" loading="lazy" className="h-full w-full object-contain" /> : <ShoppingBag className="h-5 w-5 text-gray-400" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{entry.product.name}</p><p className="mt-1 text-xs text-gray-400">Quantité : {entry.quantity}{entry.required ? " · Inclus" : " · Optionnel"}</p></div></li>;
              })}</ul> : <p className="mt-3 text-sm text-amber-200">Aucun produit n’est actuellement associé à ce pack dans le catalogue.</p>}
            </div>
            {pack.startDate || pack.endDate ? <p className="mt-4 text-xs text-gray-400">Offre valable {pack.startDate ? `à partir du ${new Date(pack.startDate).toLocaleDateString("fr-TN")}` : ""}{pack.startDate && pack.endDate ? " " : ""}{pack.endDate ? `jusqu’au ${new Date(pack.endDate).toLocaleDateString("fr-TN")}` : ""}.</p> : null}
            {customizable && <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">Ce pack est configuré comme personnalisable (minimum {pack.minProducts ?? "—"}, maximum {pack.maxProducts ?? "sans limite"}). La configuration client et le calcul de prix ne sont pas exposés par l’API actuelle.</div>}
            <button type="button" disabled className="mt-6 w-full cursor-not-allowed rounded-lg border border-white/15 bg-[#242424] px-5 py-4 text-xs font-black uppercase tracking-widest text-gray-400" title={!isReadyToOrder ? "La composition et le prix de ce pack doivent être configurés dans le back-office." : "L’API de commande actuelle ne prend pas en charge l’achat des packs prédéfinis."}>{isReadyToOrder ? "Achat en ligne indisponible pour les packs" : "Pack à compléter dans le catalogue"}</button>
            <p className="mt-2 text-center text-[11px] leading-5 text-gray-500">{isReadyToOrder ? "L’API de commande actuelle ne prend pas encore en charge l’achat des packs prédéfinis." : "Ajoutez les produits et définissez le prix de ce pack dans le back-office avant de le proposer à l’achat."}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacksPage;
