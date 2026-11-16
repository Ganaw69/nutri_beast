const SEARCH_UNITS = new Set(['g', 'gr', 'gram', 'grams', 'kg', 'kgs', 'l', 'lb', 'lbs', 'liter', 'liters', 'ml', 'oz']);

export const normalizeProductSearchText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr')
  .replace(/([a-z])(\d)/g, '$1 $2')
  .replace(/(\d)([a-z])/g, '$1 $2')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const getProductSearchTerms = (query) => [
  ...new Set(normalizeProductSearchText(query)
    .split(/\s+/)
    .filter((term) => term && !SEARCH_UNITS.has(term))),
];

const productSearchText = (product) => {
  const brand = typeof product?.brand === 'object'
    ? product.brand?.name
    : product?.brand;
  const category = typeof product?.category === 'object'
    ? product.category?.name
    : product?.category;
  const flavorNames = Array.isArray(product?.flavors)
    ? product.flavors.map((flavor) => typeof flavor === 'object' ? flavor?.name : flavor)
    : [];
  const sizes = Array.isArray(product?.productOptions?.sizes) ? product.productOptions.sizes : [];
  const weightUnit = product?.weightUnit ?? product?.weight_unit ?? (product?.weight ? 'kg' : '');

  return normalizeProductSearchText([
    product?.name,
    brand,
    product?.brandName,
    product?.brand_name,
    category,
    product?.categoryName,
    product?.sku,
    product?.barcode,
    product?.shortDescription,
    product?.description,
    product?.weight,
    weightUnit,
    product?.productOptions?.type,
    ...sizes,
    ...flavorNames,
  ].filter(Boolean).join(' '));
};

export const productMatchesSearch = (product, query) => {
  const terms = getProductSearchTerms(query);
  if (terms.length === 0) return !normalizeProductSearchText(query);
  const searchableText = productSearchText(product);
  return terms.every((term) => searchableText.includes(term));
};
