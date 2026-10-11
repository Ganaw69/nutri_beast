import { productService, resolveProductImage } from "./api";

const MAX_DESCRIPTION_LENGTH = 1_500;

const normalizeText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase();

const firstText = (...values) => values
  .map((value) => String(value || "").trim())
  .find(Boolean) || "";

const productTerms = [
  "proteine", "protein", "whey", "isolate", "caseine", "creatine", "pre workout",
  "preworkout", "gainer", "mass gainer", "bcaa", "eaa", "amino", "collagene",
  "omega", "vitamine", "supplement", "complement alimentaire",
];

// A product name on its own is often enough ("whey isolate"), but a broad
// nutrition question ("combien de protéines par jour ?") must not create a
// shop recommendation. Keep the two kinds of signal separate for that reason.
const hasProductIntent = (message) => {
  const text = normalizeText(message);
  const mentionsProductType = productTerms.some((term) => text.includes(term));
  const asksToChooseOrUse = /\b(quel|quelle|quels|quelles|recommand|conseil|suggest|meilleur|best|acheter|buy|prendre|utiliser|use|choisir|cherche|besoin|need|pour une seche|prise de masse)\b/.test(text);
  const namesAProductFormat = /\b(whey|isolate|creatine|pre[ -]?workout|gainer|bcaa|eaa|protein powder|poudre proteinee)\b/.test(text);

  return mentionsProductType && (asksToChooseOrUse || namesAProductFormat);
};

const searchableProductText = (product) => normalizeText([
  product?.name,
  product?.brand?.name,
  product?.brand,
  product?.category?.name,
  product?.category,
  product?.shortDescription,
  product?.description,
  product?.longDescription,
  ...(Array.isArray(product?.goals) ? product.goals.map((goal) => goal?.name || goal) : []),
].join(" "));

const productScore = (product, message) => {
  const query = normalizeText(message);
  const searchableText = searchableProductText(product);
  let score = 0;

  for (const term of productTerms) {
    if (query.includes(term) && searchableText.includes(term)) score += 12;
  }

  if (/\b(whey|isolate|protein|proteine)\b/.test(query) && /\b(whey|isolate|protein|proteine)\b/.test(searchableText)) score += 20;
  if (/\bcreatine\b/.test(query) && /\bcreatine\b/.test(searchableText)) score += 28;
  if (/\b(pre[ -]?workout)\b/.test(query) && /\b(pre[ -]?workout)\b/.test(searchableText)) score += 28;
  if (/\b(gainer|prise de masse)\b/.test(query) && /\b(gainer|mass|prise de masse)\b/.test(searchableText)) score += 24;
  if (Number(product?.stock) > 0) score += 2;

  return score;
};

const productDetailsUrl = (productId) => `#product/${encodeURIComponent(productId)}`;

const toRecommendation = (product, message) => {
  const description = firstText(product.shortDescription, product.description, product.longDescription)
    .slice(0, MAX_DESCRIPTION_LENGTH);
  const price = Number(product.salePrice ?? product.price);
  const productId = product.id;

  return {
    id: productId,
    name: firstText(product.name, "Produit Nutri Beast"),
    brand: firstText(product.brand?.name, product.brand),
    category: firstText(product.category?.name, product.category),
    description,
    price: Number.isFinite(price) ? price : null,
    currency: "TND",
    stock: product.stock ?? null,
    image: resolveProductImage(product),
    href: productDetailsUrl(productId),
    // This object is deliberately compact and serializable: it is passed to
    // the Coach API, not rendered as an untrusted API response.
    context: {
      id: productId,
      name: firstText(product.name, "Produit Nutri Beast"),
      brand: firstText(product.brand?.name, product.brand),
      category: firstText(product.category?.name, product.category),
      description,
      price: Number.isFinite(price) ? price : null,
      currency: "TND",
      stock: product.stock ?? null,
      nutrition_facts: product.nutritionFact || product.macros || null,
      product_url: productDetailsUrl(productId),
      selection_reason: `Matched the customer's request: ${String(message).trim()}`,
      coach_instruction: "Confirm or correct whether this exact catalogue product fits the customer's request. Refer to it by name, use only the supplied product facts, and do not invent availability, ingredients, or health claims.",
    },
  };
};

/**
 * Return one live-catalogue product only when the visitor is asking for a
 * product recommendation. Catalogue lookup failure is intentionally allowed
 * to fall back to the normal Coach conversation.
 */
export const findCoachProductRecommendation = async (message) => {
  if (!hasProductIntent(message)) return null;

  const response = await productService.getAllPages({ isActive: true });
  const products = response?.["hydra:member"] || response?.member || response?.items || [];
  const activeProducts = products.filter((product) => product?.isActive !== false && product?.active !== false);
  if (!activeProducts.length) return null;

  const rankedProducts = activeProducts
    .map((product) => ({ product, score: productScore(product, message) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return Number(right.product?.stock || 0) - Number(left.product?.stock || 0);
    });

  const bestMatch = rankedProducts[0];
  return bestMatch && bestMatch.score > 0 ? toRecommendation(bestMatch.product, message) : null;
};
