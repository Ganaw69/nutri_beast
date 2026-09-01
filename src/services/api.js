// ============================================================
// NutriBeast API Service Layer
// Base URL: https://127.0.0.1:8000/api
// NOTE: Accept the self-signed cert once by visiting
//       https://127.0.0.1:8000/api/docs in your browser.
// ============================================================

import { PRODUCTS as DEMO_PRODUCTS_SOURCE } from '../data/products';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'https://127.0.0.1:8000/api');
const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE_URL || (import.meta.env.DEV ? '' : 'https://127.0.0.1:8000');
const USE_DEMO_API = import.meta.env.DEV && import.meta.env.VITE_FORCE_LIVE_API !== 'true';
const DEMO_JWT = 'eyJhbGciOiJub25lIn0.eyJleHAiOjQ3OTk5OTk5OTl9.';

const clone = (value) => {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
};

const makeIri = (resource, id) => `/api/${resource}/${id}`;

const buildHydraCollection = (items) => ({
  'hydra:member': clone(items),
  'hydra:totalItems': items.length,
});

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isNaN(next) ? fallback : next;
};

const demoBrands = [];
const demoCategories = [];
const demoGoals = [
  { id: 1, name: 'Muscle', slug: 'muscle', isActive: true, position: 1 },
  { id: 2, name: 'Performance', slug: 'performance', isActive: true, position: 2 },
  { id: 3, name: 'Wellness', slug: 'wellness', isActive: true, position: 3 },
];
const demoFlavors = [];
const demoProducts = DEMO_PRODUCTS_SOURCE.map((product, index) => {
  const categoryName = String(product.category || 'OTHER').trim();
  const brandName = String(product.brand || 'Brand').trim();
  let category = demoCategories.find((item) => item.name === categoryName);
  if (!category) {
    category = {
      id: demoCategories.length + 1,
      name: categoryName,
      slug: slugify(categoryName),
      description: '',
      position: demoCategories.length + 1,
      isActive: true,
      parent: null,
    };
    demoCategories.push(category);
  }

  let brand = demoBrands.find((item) => item.name === brandName);
  if (!brand) {
    brand = {
      id: demoBrands.length + 1,
      name: brandName,
      slug: slugify(brandName),
      isActive: true,
      position: demoBrands.length + 1,
    };
    demoBrands.push(brand);
  }

  const productId = index + 1;
  const flavorList = Array.isArray(product.flavors) ? product.flavors : [];
  flavorList.forEach((flavor) => {
    if (!demoFlavors.some((item) => item.name === flavor)) {
      demoFlavors.push({
        id: demoFlavors.length + 1,
        name: flavor,
        slug: slugify(flavor),
        isActive: true,
      });
    }
  });

  const salesSeed = [7800, 2250, 6400, 12450, 3100, 1980, 9300, 5600, 1450][index] ?? (2200 + index * 750);
  const stockSeed = [38, 24, 45, 12, 33, 18, 52, 26, 14][index] ?? (20 + index * 2);

  return {
    id: productId,
    '@id': makeIri('products', productId),
    name: product.name,
    slug: product.id,
    sku: `${brand.slug?.toUpperCase?.() || 'NB'}-${String(productId).padStart(3, '0')}`,
    price: product.price,
    salePrice: product.originalPrice && product.originalPrice > product.price ? product.price : null,
    originalPrice: product.originalPrice ?? null,
    category,
    brand,
    stock: stockSeed,
    sales: salesSeed,
    isActive: true,
    isFeatured: index % 3 === 0,
    isNew: index % 4 === 2,
    isOnSale: !!product.originalPrice,
    createdAt: new Date(Date.now() - index * 86400000 * 11).toISOString(),
    productImages: [
      { id: productId * 10 + 1, image: product.image, isPrimary: true, position: 0 },
    ],
    flavors: flavorList.map((name, flavorIndex) => ({
      id: productId * 100 + flavorIndex + 1,
      name,
    })),
    goals: product.category && /creatine|performance|gainer/i.test(product.category)
      ? [demoGoals[1]]
      : [demoGoals[0]],
    description: product.description,
    shortDescription: product.description,
    nutritionFact: product.macros,
  };
});

const demoBlogCategories = [
  { id: 1, '@id': makeIri('blog_categories', 1), name: 'Nutrition', slug: 'nutrition', active: true, isActive: true, position: 1 },
  { id: 2, '@id': makeIri('blog_categories', 2), name: 'Training', slug: 'training', active: true, isActive: true, position: 2 },
  { id: 3, '@id': makeIri('blog_categories', 3), name: 'Recettes', slug: 'recettes', active: true, isActive: true, position: 3 },
];

const demoBlogArticles = [
  {
    id: 1,
    '@id': makeIri('blog_articles', 1),
    title: 'Pourquoi les protéines sont essentielles pour la musculation ?',
    summary: 'Découvrez pourquoi les protéines jouent un rôle essentiel dans la récupération musculaire et le développement de la masse musculaire.',
    content: 'Les protéines sont indispensables pour les personnes qui pratiquent la musculation et les sports de force. Elles participent à la réparation et à la construction des fibres musculaires après l\'entraînement.',
    category: demoBlogCategories[0],
    seoTitle: 'Protéines et musculation : guide complet',
    seoDescription: 'Découvrez le rôle des protéines dans la musculation, la récupération et le développement musculaire.',
    published: true,
    featured: true,
    publishedAt: '2026-08-10T08:30:00Z',
    image: '',
  },
  {
    id: 2,
    '@id': makeIri('blog_articles', 2),
    title: 'Comment structurer un entraînement efficace en prise de masse',
    summary: 'Les bases simples pour progresser régulièrement sans se disperser.',
    content: 'Un bon programme combine surcharge progressive, récupération et alimentation cohérente.',
    category: demoBlogCategories[1],
    seoTitle: 'Programme musculation prise de masse',
    seoDescription: 'Les principes clés pour organiser un entraînement efficace.',
    published: true,
    featured: false,
    publishedAt: '2026-08-08T14:00:00Z',
    image: '',
  },
  {
    id: 3,
    '@id': makeIri('blog_articles', 3),
    title: 'Recette rapide post-entraînement : bowl protéiné',
    summary: 'Une idée simple à préparer en quelques minutes après la séance.',
    content: 'Mélangez une source de protéines, des glucides rapides et un peu de bons gras pour récupérer intelligemment.',
    category: demoBlogCategories[2],
    seoTitle: 'Recette post-training protéinée',
    seoDescription: 'Une recette simple et rapide pour la récupération.',
    published: true,
    featured: false,
    publishedAt: '2026-08-05T10:15:00Z',
    image: '',
  },
];

const demoRecipes = [
  {
    id: 1,
    '@id': makeIri('recipes', 1),
    title: 'Pancakes protéinés',
    description: 'Pancakes moelleux riches en protéines pour un petit-déjeuner sportif.',
    difficulty: 'easy',
    preparationTime: 10,
    cookingTime: 5,
    calories: 380,
    protein: 32,
    carbs: 34,
    fat: 11,
    metaTitle: 'Pancakes protéinés',
    metaDescription: 'Recette simple et riche en protéines.',
    image: '',
    ingredients: [
      { product: { id: 1, name: 'Pure Titanium Whey' }, quantity: '30', unit: 'g' },
      { product: { id: 2, name: 'NitroTech Crunch' }, quantity: '1', unit: 'barre' },
    ],
  },
  {
    id: 2,
    '@id': makeIri('recipes', 2),
    title: 'Bowl énergie post-training',
    description: 'Une assiette complète pour refaire le plein après l\'entraînement.',
    difficulty: 'easy',
    preparationTime: 12,
    cookingTime: 0,
    calories: 520,
    protein: 41,
    carbs: 55,
    fat: 14,
    metaTitle: 'Bowl énergie post-training',
    metaDescription: 'Recette rapide pour la récupération.',
    image: '',
    ingredients: [
      { product: { id: 7, name: 'Gold Standard 100% Whey' }, quantity: '35', unit: 'g' },
      { product: { id: 4, name: 'Mass Tech Extreme' }, quantity: '80', unit: 'g' },
    ],
  },
];

// Orders must come from the backend. Keep the demo store empty so development
// fallback responses never display fabricated customer orders.
const demoOrders = [];

const demoReviews = [
  {
    id: 1,
    '@id': makeIri('reviews', 1),
    product: demoProducts[0],
    customerName: 'Yassine',
    rating: 5,
    comment: 'Très bon goût et livraison rapide.',
    approved: true,
  },
];

const demoBanners = [
  {
    id: 1,
    '@id': makeIri('banners', 1),
    enabled: true,
    text: 'Livraison rapide partout en Tunisie',
    ctaText: 'Voir les offres',
    backgroundColor: '#d90429',
    textColor: '#ffffff',
    position: 1,
  },
];

const demoStore = {
  products: demoProducts,
  categories: demoCategories,
  brands: demoBrands,
  goals: demoGoals,
  flavors: demoFlavors,
  orders: demoOrders,
  reviews: demoReviews,
  coupons: [],
  blogCategories: demoBlogCategories,
  blogArticles: demoBlogArticles,
  banners: demoBanners,
  recipes: demoRecipes,
  settings: { 1: { id: 1, siteName: 'NutriBeast', currency: 'TND' } },
  users: [],
  stockMovements: [],
  promotions: [],
};

const readBody = async (body) => {
  if (!body) return {};
  if (body instanceof FormData) {
    return Object.fromEntries(body.entries());
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (_) {
      return {};
    }
  }
  return body;
};

const getCollectionFromStore = (resource) => demoStore[resource] || [];
const setCollectionInStore = (resource, items) => {
  demoStore[resource] = items;
};

const nextNumericId = (items) => items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

function applyFilters(items, path) {
  const url = new URL(path, 'http://local');
  const params = url.searchParams;
  let next = [...items];

  const isTrue = (value) => ['1', 'true', 'yes'].includes(String(value).toLowerCase());
  const idsFrom = (...keys) => keys.flatMap((key) => params.getAll(key)).map((value) => Number(value)).filter((value) => !Number.isNaN(value));

  if (params.has('isActive')) {
    next = next.filter((item) => (item.isActive ?? item.active ?? true) === isTrue(params.get('isActive')));
  }
  if (params.has('active')) {
    next = next.filter((item) => (item.active ?? item.isActive ?? true) === isTrue(params.get('active')));
  }
  if (params.has('published')) {
    next = next.filter((item) => !!item.published === isTrue(params.get('published')));
  }
  if (params.has('featured')) {
    next = next.filter((item) => !!item.featured === isTrue(params.get('featured')));
  }
  if (params.has('title')) {
    const needle = String(params.get('title')).toLowerCase();
    next = next.filter((item) => String(item.title || item.name || '').toLowerCase().includes(needle));
  }
  if (params.has('name')) {
    const needle = String(params.get('name')).toLowerCase();
    next = next.filter((item) => String(item.name || '').toLowerCase().includes(needle));
  }
  if (params.has('price[lte]')) {
    const max = toNumber(params.get('price[lte]'), Infinity);
    next = next.filter((item) => toNumber(item.price, 0) <= max);
  }

  if (params.has('category')) {
    const categoryValue = params.get('category');
    next = next.filter((item) => {
      const itemCategoryId = item.category?.id ?? item.categoryId ?? null;
      const itemCategoryIri = item.category?.['@id'] ?? item.category?.iri ?? '';
      return String(itemCategoryId) === String(categoryValue).split('/').pop() || itemCategoryIri === categoryValue;
    });
  }

  const categoryIds = idsFrom('category.id[]', 'category.id', 'category[]');
  if (categoryIds.length) {
    next = next.filter((item) => {
      const itemCategoryId = toNumber(item.category?.id ?? item.categoryId ?? item.category?.['@id']?.split('/').pop(), NaN);
      return categoryIds.includes(itemCategoryId);
    });
  }

  const brandIds = idsFrom('brand.id[]', 'brand.id', 'brand[]');
  if (brandIds.length) {
    next = next.filter((item) => {
      const itemBrandId = toNumber(item.brand?.id ?? item.brandId ?? item.brand?.['@id']?.split('/').pop(), NaN);
      return brandIds.includes(itemBrandId);
    });
  }

  const goalIds = idsFrom('goals.id[]', 'goals.id', 'goal.id[]', 'goal.id');
  if (goalIds.length) {
    next = next.filter((item) => {
      const itemGoalIds = Array.isArray(item.goals) ? item.goals.map((goal) => toNumber(goal.id ?? goal, NaN)) : [];
      return itemGoalIds.some((goalId) => goalIds.includes(goalId));
    });
  }

  const orderPrice = params.get('order[price]');
  if (orderPrice === 'asc' || orderPrice === 'desc') {
    next.sort((a, b) => orderPrice === 'asc' ? toNumber(a.price, 0) - toNumber(b.price, 0) : toNumber(b.price, 0) - toNumber(a.price, 0));
  }

  const orderCreatedAt = params.get('order[createdAt]');
  if (orderCreatedAt === 'asc' || orderCreatedAt === 'desc') {
    next.sort((a, b) => orderCreatedAt === 'asc'
      ? new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      : new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  const orderPosition = params.get('order[position]');
  if (orderPosition === 'asc' || orderPosition === 'desc') {
    next.sort((a, b) => orderPosition === 'asc'
      ? toNumber(a.position, 0) - toNumber(b.position, 0)
      : toNumber(b.position, 0) - toNumber(a.position, 0));
  }

  const itemsPerPage = toNumber(params.get('itemsPerPage'), 0);
  if (itemsPerPage > 0) {
    const page = Math.max(1, toNumber(params.get('page'), 1));
    const start = (page - 1) * itemsPerPage;
    next = next.slice(start, start + itemsPerPage);
  }

  return next;
}

function findDemoEntity(resource, id) {
  const collection = getCollectionFromStore(resource);
  return collection.find((item) => String(item.id) === String(id) || String(item.slug) === String(id) || String(item.name) === String(id));
}

function upsertDemoEntity(resource, item) {
  const collection = getCollectionFromStore(resource);
  const idx = collection.findIndex((entry) => String(entry.id) === String(item.id));
  if (idx >= 0) {
    collection[idx] = item;
  } else {
    collection.unshift(item);
  }
  setCollectionInStore(resource, collection);
  return item;
}

async function mockApiFetch(path, opts = {}, isMultipart = false, skipAuth = false) {
  const method = String(opts.method || 'GET').toUpperCase();
  const url = new URL(path, 'http://local');
  const pathname = url.pathname;

  if (pathname === '/login_check' && method === 'POST') {
    return { token: DEMO_JWT };
  }

  const body = await readBody(opts.body);

  if (pathname === '/products' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.products, path));
  if (pathname.startsWith('/products/') && method === 'GET') {
    const id = pathname.split('/').pop();
    return clone(findDemoEntity('products', id));
  }
  if (pathname === '/product_images' && method === 'GET') return buildHydraCollection([]);

  if (pathname === '/categories' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.categories, path));
  if (pathname.startsWith('/categories/') && method === 'GET') return clone(findDemoEntity('categories', pathname.split('/').pop()));
  if (pathname === '/brands' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.brands, path));
  if (pathname.startsWith('/brands/') && method === 'GET') return clone(findDemoEntity('brands', pathname.split('/').pop()));
  if (pathname === '/goals' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.goals, path));
  if (pathname === '/flavors' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.flavors, path));

  if (pathname === '/orders' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.orders, path));
  if (pathname.startsWith('/orders/') && method === 'GET') return clone(findDemoEntity('orders', pathname.split('/').pop()));
  if (pathname === '/order_status_histories' && method === 'GET') return buildHydraCollection([]);

  if (pathname === '/reviews' && method === 'GET') {
    const productId = url.searchParams.get('product.id');
    const filtered = productId
      ? demoStore.reviews.filter((review) => String(review.product?.id) === String(productId))
      : demoStore.reviews;
    return buildHydraCollection(filtered);
  }
  if (pathname.startsWith('/reviews/') && method === 'GET') return clone(findDemoEntity('reviews', pathname.split('/').pop()));

  if (pathname === '/coupons' && method === 'GET') return buildHydraCollection([]);
  if (pathname.startsWith('/coupons/') && method === 'GET') return null;

  if (pathname === '/blog_categories' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.blogCategories, path));
  if (pathname.startsWith('/blog_categories/') && method === 'GET') return clone(findDemoEntity('blogCategories', pathname.split('/').pop()));
  if (pathname === '/blog_articles' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.blogArticles, path));
  if (pathname.startsWith('/blog_articles/') && method === 'GET') return clone(findDemoEntity('blogArticles', pathname.split('/').pop()));

  if (pathname === '/banners/active' && method === 'GET') return buildHydraCollection(demoStore.banners.filter((banner) => banner.enabled !== false));
  if (pathname === '/banners' && method === 'GET') return buildHydraCollection(demoStore.banners);
  if (pathname.startsWith('/banners/') && method === 'GET') return clone(findDemoEntity('banners', pathname.split('/').pop()));

  if (pathname === '/recipes' && method === 'GET') return buildHydraCollection(applyFilters(demoStore.recipes, path));
  if (pathname.startsWith('/recipes/') && method === 'GET') return clone(findDemoEntity('recipes', pathname.split('/').pop()));

  if (pathname === '/settings/1' && method === 'GET') return clone(demoStore.settings[1]);
  if (pathname === '/users' && method === 'GET') return buildHydraCollection([]);
  if (pathname === '/stock_movements' && method === 'GET') return buildHydraCollection([]);
  if (pathname === '/promotions' && method === 'GET') return buildHydraCollection([]);

  if (pathname === '/blog_categories' && method === 'POST') {
    const id = nextNumericId(demoStore.blogCategories);
    const item = {
      id,
      '@id': makeIri('blog_categories', id),
      name: body.name || 'Nouvelle Catégorie',
      slug: body.slug || slugify(body.name || 'nouvelle-categorie'),
      active: true,
      isActive: true,
      position: toNumber(body.position, demoStore.blogCategories.length + 1),
      description: body.description || '',
      parent: null,
    };
    demoStore.blogCategories.unshift(item);
    return clone(item);
  }
  if (pathname.startsWith('/blog_categories/') && method === 'PATCH') {
    const id = pathname.split('/').pop();
    const item = findDemoEntity('blogCategories', id);
    if (!item) return null;
    Object.assign(item, body);
    return clone(item);
  }
  if (pathname.startsWith('/blog_categories/') && method === 'DELETE') {
    const id = pathname.split('/').pop();
    demoStore.blogCategories = demoStore.blogCategories.filter((item) => String(item.id) !== String(id));
    return null;
  }

  if (pathname === '/blog_articles' && method === 'POST') {
    const nextId = nextNumericId(demoStore.blogArticles);
    const categoryId = body.categoryId || body.category;
    const category = demoStore.blogCategories.find((item) => String(item.id) === String(categoryId)) || demoStore.blogCategories[0] || null;
    const item = {
      id: nextId,
      '@id': makeIri('blog_articles', nextId),
      title: body.title || 'Nouvel article',
      summary: body.summary || '',
      content: body.content || '',
      seoTitle: body.seoTitle || '',
      seoDescription: body.seoDescription || '',
      published: String(body.published) === 'true' || body.published === true,
      featured: String(body.featured) === 'true' || body.featured === true,
      category,
      publishedAt: new Date().toISOString(),
      image: '',
    };
    demoStore.blogArticles.unshift(item);
    return clone(item);
  }
  if (pathname.startsWith('/blog_articles/') && method === 'PATCH') {
    const id = pathname.split('/').pop();
    const item = findDemoEntity('blogArticles', id);
    if (!item) return null;
    Object.assign(item, {
      ...body,
      category: body.category ? demoStore.blogCategories.find((cat) => String(cat.id) === String(body.category.split('/').pop())) || item.category : item.category,
    });
    return clone(item);
  }
  if (pathname.endsWith('/publish') && method === 'PATCH') {
    const id = pathname.split('/').slice(-2, -1)[0];
    const item = findDemoEntity('blogArticles', id);
    if (!item) return null;
    item.published = true;
    return clone(item);
  }
  if (pathname.endsWith('/unpublish') && method === 'PATCH') {
    const id = pathname.split('/').slice(-2, -1)[0];
    const item = findDemoEntity('blogArticles', id);
    if (!item) return null;
    item.published = false;
    return clone(item);
  }
  if (pathname.endsWith('/featured') && method === 'PATCH') {
    const id = pathname.split('/').slice(-2, -1)[0];
    const item = findDemoEntity('blogArticles', id);
    if (!item) return null;
    item.featured = !item.featured;
    return clone(item);
  }
  if (pathname.startsWith('/blog_articles/') && method === 'DELETE') {
    const id = pathname.split('/').pop();
    demoStore.blogArticles = demoStore.blogArticles.filter((item) => String(item.id) !== String(id));
    return null;
  }

  if (pathname === '/recipes' && method === 'POST') {
    const nextId = nextNumericId(demoStore.recipes);
    const rawIngredients = body.ingredients ? JSON.parse(body.ingredients) : [];
    const item = {
      id: nextId,
      '@id': makeIri('recipes', nextId),
      title: body.title || 'Nouvelle recette',
      description: body.description || '',
      difficulty: body.difficulty || 'easy',
      preparationTime: toNumber(body.preparationTime, 0),
      cookingTime: toNumber(body.cookingTime, 0),
      calories: toNumber(body.calories, 0),
      protein: toNumber(body.protein, 0),
      carbs: toNumber(body.carbs, 0),
      fat: toNumber(body.fat, 0),
      metaTitle: body.metaTitle || '',
      metaDescription: body.metaDescription || '',
      image: '',
      ingredients: rawIngredients.map((ingredient) => {
        const product = demoStore.products.find((entry) => String(entry.id) === String(ingredient.productId)) || null;
        return {
          product,
          quantity: String(ingredient.quantity || ''),
          unit: String(ingredient.unit || 'g'),
        };
      }),
    };
    demoStore.recipes.unshift(item);
    return clone(item);
  }
  if (pathname.startsWith('/recipes/') && method === 'PATCH') {
    const id = pathname.split('/').pop();
    const item = findDemoEntity('recipes', id);
    if (!item) return null;
    Object.assign(item, {
      title: body.title ?? item.title,
      description: body.description ?? item.description,
      difficulty: body.difficulty ?? item.difficulty,
      preparationTime: body.preparationTime != null ? toNumber(body.preparationTime, item.preparationTime) : item.preparationTime,
      cookingTime: body.cookingTime != null ? toNumber(body.cookingTime, item.cookingTime) : item.cookingTime,
      calories: body.calories != null ? toNumber(body.calories, item.calories) : item.calories,
      protein: body.protein != null ? toNumber(body.protein, item.protein) : item.protein,
      carbs: body.carbs != null ? toNumber(body.carbs, item.carbs) : item.carbs,
      fat: body.fat != null ? toNumber(body.fat, item.fat) : item.fat,
      metaTitle: body.metaTitle ?? item.metaTitle,
      metaDescription: body.metaDescription ?? item.metaDescription,
      ingredients: Array.isArray(body.ingredients)
        ? body.ingredients.map((ingredient) => ({
            product: demoStore.products.find((entry) => String(entry.id) === String(ingredient.productId)) || null,
            quantity: String(ingredient.quantity || ''),
            unit: String(ingredient.unit || 'g'),
          }))
        : item.ingredients,
    });
    return clone(item);
  }
  if (pathname.startsWith('/recipes/') && method === 'DELETE') {
    const id = pathname.split('/').pop();
    demoStore.recipes = demoStore.recipes.filter((item) => String(item.id) !== String(id));
    return null;
  }

  if (pathname === '/orders' && method !== 'GET') return clone({ success: true });
  if (pathname === '/reviews' && method === 'POST') {
    const nextId = nextNumericId(demoStore.reviews);
    const productId = body.product?.split('/').pop?.() || body.productId || 1;
    const product = demoStore.products.find((entry) => String(entry.id) === String(productId)) || demoStore.products[0];
    const item = {
      id: nextId,
      '@id': makeIri('reviews', nextId),
      product,
      customerName: body.customerName || 'Client',
      email: body.email || '',
      rating: toNumber(body.rating, 5),
      comment: body.comment || '',
      approved: false,
    };
    demoStore.reviews.unshift(item);
    return clone(item);
  }
  if (pathname === '/banners/active' && method === 'PATCH') return buildHydraCollection(demoStore.banners.filter((banner) => banner.enabled !== false));

  if (pathname === '/settings/1' && method === 'PATCH') {
    demoStore.settings[1] = { ...demoStore.settings[1], ...body };
    return clone(demoStore.settings[1]);
  }

  return clone({ success: true });
}

/** Resolve a media path to a full URL */
export const mediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return MEDIA_BASE ? `${MEDIA_BASE}/uploads/${path}` : `/uploads/${path}`;
};

const resolveUploadUrl = (folder, input) => {
  if (!input) return null;

  if (typeof input === 'object') {
    return resolveUploadUrl(
      folder,
      input.image ??
      input.path ??
      input.url ??
      input.contentUrl ??
      input.file ??
      input.filename ??
      input.name
    );
  }

  const value = String(input).trim();
  if (!value) return null;
  if (value.startsWith('http')) return value;
  if (value.startsWith('/api/') || value.startsWith('api/')) return null;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  if (normalized.startsWith(`/uploads/${folder}/`)) return MEDIA_BASE ? `${MEDIA_BASE}${normalized}` : normalized;
  if (normalized.startsWith('/uploads/')) return MEDIA_BASE ? `${MEDIA_BASE}${normalized}` : normalized;

  return MEDIA_BASE
    ? `${MEDIA_BASE}/uploads/${folder}/${value.replace(/^\/+/, '')}`
    : `/uploads/${folder}/${value.replace(/^\/+/, '')}`;
};

const getProductImageSource = (img) => {
  if (!img) return null;
  if (typeof img === 'string') return img;
  return (
    img.image ??
    img.path ??
    img.url ??
    img.contentUrl ??
    img.file ??
    img.filename ??
    img.name ??
    null
  );
};

const getProductImageProductId = (img) => {
  if (!img || typeof img === 'string') return null;
  const product = img.product;
  if (typeof product === 'number') return product;
  if (typeof product === 'string') return iriToId(product);
  if (product && typeof product === 'object') {
    return product.id ?? iriToId(product['@id']) ?? iriToId(product.iri);
  }
  return img.productId ?? iriToId(img.productIri) ?? null;
};

export const buildProductImageLookup = (images = []) => {
  const lookup = new Map();
  images.forEach((img) => {
    const productId = getProductImageProductId(img);
    if (productId == null) return;
    const key = String(productId);
    const current = lookup.get(key) || [];
    current.push(img);
    lookup.set(key, current);
  });
  return lookup;
};

/** Resolve a product image filename to a full URL */
const normalizeProductImagePath = (input) => {
  if (!input) return null;

  if (typeof input === 'object') {
    return normalizeProductImagePath(
      input.image ??
      input.path ??
      input.url ??
      input.contentUrl ??
      input.file ??
      input.filename ??
      input.name
    );
  }

  const value = String(input).trim();
  if (!value) return null;
  if (value.startsWith('http')) return value;
  if (value.startsWith('/api/') || value.startsWith('api/')) return null;
  if (value.startsWith('/uploads/products/') || value.startsWith('uploads/products/')) {
    return value.startsWith('/') ? value : `/${value}`;
  }
  if (value.startsWith('/')) return value;
  return value;
};

export const productImageUrl = (filename) => {
  const normalized = normalizeProductImagePath(filename);
  if (!normalized) return null;
  if (normalized.startsWith('http')) return normalized;
  if (normalized.startsWith('/uploads/products/')) return MEDIA_BASE ? `${MEDIA_BASE}${normalized}` : normalized;
  return MEDIA_BASE ? `${MEDIA_BASE}/uploads/products/${normalized}` : `/uploads/products/${normalized}`;
};

/** Pick the primary product image if present, otherwise the first image. */
export const isPrimaryProductImage = (img) =>
  typeof img === 'string' ||
  img?.isPrimary === true ||
  img?.is_primary === true ||
  img?.primary === true ||
  img?.isMain === true ||
  img?.is_main === true ||
  img?.main === true;

export const resolveProductImage = (product, fallback = null) => {
  const productId = product?.id ?? iriToId(product?.['@id']) ?? iriToId(product?.iri) ?? null;
  const pooledImages = product?.imageLookup instanceof Map && productId != null
    ? product.imageLookup.get(String(productId)) || []
    : Array.isArray(product?.imageLookup) && productId != null
      ? product.imageLookup.filter((img) => getProductImageProductId(img) === productId)
      : [];
  const images = [
    ...(Array.isArray(product?.productImages) ? product.productImages : []),
    ...pooledImages,
    ...(Array.isArray(product?.images) ? product.images : []),
    ...(Array.isArray(product?.media) ? product.media : []),
  ];

  const sortedImages = [...images].sort((a, b) => {
    const primaryScore = Number(isPrimaryProductImage(b)) - Number(isPrimaryProductImage(a));
    if (primaryScore !== 0) return primaryScore;
    const positionScore = Number(b?.position ?? 0) - Number(a?.position ?? 0);
    if (positionScore !== 0) return positionScore;
    return Number(b?.id ?? 0) - Number(a?.id ?? 0);
  });

  const primary = sortedImages.find((img) => isPrimaryProductImage(img)) || sortedImages[0];
  const source = getProductImageSource(primary);
  const resolved = source
    ? productImageUrl(source)
    : resolveUploadUrl('products', product?.image ?? product?.imagePath ?? product?.mainImage ?? product?.mainImagePath ?? product?.thumbnail ?? product?.thumbnailPath);
  return resolved && !resolved.includes('/api/') ? resolved : fallback;
};

/** Get the stored JWT token */
const getToken = () => sessionStorage.getItem('admin_jwt') || localStorage.getItem('admin_jwt');

/**
 * Core fetch wrapper.
 * @param {string} path  - e.g. '/products'
 * @param {object} opts  - standard fetch options
 * @param {boolean} isMultipart - skip Content-Type header (let browser set boundary)
 */
async function apiFetch(path, opts = {}, isMultipart = false, skipAuth = false) {
  if (USE_DEMO_API) {
    return mockApiFetch(path, opts, isMultipart, skipAuth);
  }

  const headers = {
    Accept: 'application/ld+json',
    ...opts.headers,
  };

  const token = skipAuth ? null : getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isMultipart && opts.body && typeof opts.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/ld+json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      errMsg = json['hydra:description'] || json.detail || json.message || errMsg;
    } catch (_) {}

    if (res.status === 401 && !skipAuth) {
      // A rejected JWT must end the admin session. Falling back to demo data
      // here keeps a stale dashboard mounted and causes repeated 401 requests.
      sessionStorage.removeItem('admin_jwt');
      sessionStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_jwt');
      localStorage.removeItem('admin_authenticated');
      window.dispatchEvent(new CustomEvent('admin-auth-expired', { detail: errMsg }));
    }
    throw new Error(errMsg);
  }

  if (res.status === 204) return null; // No Content
  return res.json();
}

function normalizeCollectionResponse(data) {
  if (Array.isArray(data)) {
    return {
      'hydra:member': data,
      'hydra:totalItems': data.length,
    };
  }

  const members = data?.['hydra:member'] || data?.member || data?.items || [];
  const totalItems = data?.['hydra:totalItems'] ?? data?.totalItems ?? members.length;

  return {
    ...data,
    'hydra:member': members,
    'hydra:totalItems': totalItems,
  };
}

/** Build a query string from a plain object (skips undefined/null) */
function buildQuery(params = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      v.forEach((item) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// ============================================================
// AUTH
// ============================================================
export const authService = {
  /** POST /api/login_check — returns JWT token string */
  async login(email, password) {
    if (USE_DEMO_API) {
      return DEMO_JWT;
    }

    let res;
    try {
      res = await fetch(`${BASE_URL}/login_check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        // Send email explicitly, while keeping username as a compatibility fallback
        // for backends that still map the login field to `username`.
        body: JSON.stringify({ email, username: email, password }),
      });
    } catch (networkError) {
      // If the live backend is unavailable during local development, fall back
      // to the demo admin token so the admin UI remains usable.
      if (import.meta.env.DEV) {
        return DEMO_JWT;
      }
      throw networkError;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Identifiants invalides.');
    }
    const data = await res.json();
    return data.token; // standard Lexik JWT format
  },
};

// ============================================================
// PRODUCTS
// ============================================================
export const productService = {
  async getAll(params = {}, skipAuth = false) {
    const data = await apiFetch(`/products${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async getOne(id, skipAuth = false) {
    return apiFetch(`/products/${id}`, {}, false, skipAuth);
  },
  async getImages(params = {}, skipAuth = false) {
    const data = await apiFetch(`/product_images${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async create(data) {
    return apiFetch('/products', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/products/${id}`, { method: 'DELETE' });
  },
  async activate(id) {
    return apiFetch(`/products/${id}/activate`, { method: 'PATCH' });
  },
  async deactivate(id) {
    return apiFetch(`/products/${id}/deactivate`, { method: 'PATCH' });
  },
  async duplicate(id) {
    return apiFetch(`/products/${id}/duplicate`, { method: 'POST' });
  },
  async adjustStock(id, operation, quantity, reason = '') {
    // operation: 'add' | 'remove' | 'adjust' | 'return'
    return apiFetch(`/products/${id}/stock/${operation}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, reason }),
    });
  },
  async uploadImage(productId, file, position = 0, isPrimary = false) {
    const fd = new FormData();
    fd.append('productId', String(productId));
    fd.append('position', String(position));
    fd.append('isPrimary', isPrimary ? 'true' : 'false');
    fd.append('is_primary', isPrimary ? 'true' : 'false');
    fd.append('imageFile', file);
    return apiFetch('/product_images', { method: 'POST', body: fd }, true);
  },
  async deleteImage(imageId) {
    return apiFetch(`/product_images/${imageId}`, { method: 'DELETE' });
  },
  async setImagePrimary(imageId) {
    return apiFetch(`/product_images/${imageId}/primary`, { method: 'PATCH' });
  },
};

// ============================================================
// CATEGORIES
// ============================================================
export const categoryService = {
  async getAll(params = {}, skipAuth = false) {
    const data = await apiFetch(`/categories${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async getOne(id, skipAuth = false) {
    return apiFetch(`/categories/${id}`, {}, false, skipAuth);
  },
  async create(data) {
    return apiFetch('/categories', { method: 'POST', body: JSON.stringify(data) });
  },
  async importArchitecture(architecture) {
    const response = await this.getAll({ itemsPerPage: 100 });
    const existing = response['hydra:member'] || [];
    const byName = new Map(existing.map((item) => [String(item.name || '').trim().toLocaleLowerCase('fr'), item]));
    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const [parentIndex, parentSpec] of architecture.entries()) {
      let parent = byName.get(parentSpec.name.toLocaleLowerCase('fr'));
      if (!parent) {
        parent = await this.create({ name: parentSpec.name, slug: slugify(parentSpec.name), position: parentIndex + 1, isActive: true, parent: null });
        byName.set(parentSpec.name.toLocaleLowerCase('fr'), parent);
        created += 1;
      } else {
        skipped += 1;
      }

      const parentId = parent.id || String(parent['@id'] || '').split('/').pop();
      for (const [childIndex, childName] of parentSpec.children.entries()) {
        const key = childName.toLocaleLowerCase('fr');
        if (byName.has(key)) {
          const existingChild = byName.get(key);
          const existingParentId = String(existingChild.parent?.['@id'] || existingChild.parent || existingChild.parentId || '').split('/').pop();
          if (String(existingParentId) !== String(parentId)) {
            await this.update(existingChild.id || String(existingChild['@id'] || '').split('/').pop(), { parent: `/api/categories/${parentId}` });
            updated += 1;
          }
          skipped += 1;
          continue;
        }
        const child = await this.create({ name: childName, slug: slugify(childName), position: childIndex + 1, isActive: true, parent: `/api/categories/${parentId}` });
        byName.set(key, child);
        created += 1;
      }
    }

    return { created, skipped, updated };
  },
  async update(id, data) {
    return apiFetch(`/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/categories/${id}`, { method: 'DELETE' });
  },
  async uploadImage(id, file) {
    const fd = new FormData();
    fd.append('image', file);
    return apiFetch(`/categories/${id}/upload-image`, { method: 'POST', body: fd }, true);
  },
};

// ============================================================
// BRANDS
// ============================================================
export const brandService = {
  async getAll(params = {}, skipAuth = false) {
    const data = await apiFetch(`/brands${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async getOne(id, skipAuth = false) {
    return apiFetch(`/brands/${id}`, {}, false, skipAuth);
  },
  async create(data) {
    return apiFetch('/brands', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/brands/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/brands/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// GOALS
// ============================================================
export const goalService = {
  async getAll(params = {}, skipAuth = false) {
    const data = await apiFetch(`/goals${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async create(data) {
    return apiFetch('/goals', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/goals/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// FLAVORS
// ============================================================
export const flavorService = {
  async getAll(skipAuth = false) {
    const data = await apiFetch('/flavors', {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async create(data) {
    return apiFetch('/flavors', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/flavors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/flavors/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// ORDERS
// ============================================================
export const orderService = {
  async getAll(params = {}) {
    return apiFetch(`/orders${buildQuery(params)}`);
  },
  async getOne(id) {
    return apiFetch(`/orders/${id}`);
  },
  /** POST /orders — public, no JWT needed */
  async create(orderInput) {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/ld+json', Accept: 'application/ld+json' },
      body: JSON.stringify(orderInput),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err['hydra:description'] || err.detail || 'Erreur lors de la commande.');
    }
    return res.json();
  },
  async transition(id, action) {
    // action: 'confirm' | 'prepare' | 'ship' | 'deliver' | 'cancel'
    return apiFetch(`/orders/${id}/${action}`, { method: 'PATCH' });
  },
  async getStatusHistories(params = {}) {
    return apiFetch(`/order_status_histories${buildQuery(params)}`);
  },
};

// ============================================================
// REVIEWS
// ============================================================
export const reviewService = {
  async getAll(params = {}) {
    return apiFetch(`/reviews${buildQuery(params)}`);
  },
  /** POST /reviews — public */
  async create(data) {
    const res = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/ld+json', Accept: 'application/ld+json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err['hydra:description'] || 'Erreur lors de l\'envoi de l\'avis.');
    }
    return res.json();
  },
  async approve(id) {
    return apiFetch(`/reviews/${id}/approve`, { method: 'PATCH' });
  },
  async reject(id) {
    return apiFetch(`/reviews/${id}/reject`, { method: 'PATCH' });
  },
  async delete(id) {
    return apiFetch(`/reviews/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// COUPONS
// ============================================================
export const couponService = {
  async getAll(params = {}) {
    return apiFetch(`/coupons${buildQuery(params)}`);
  },
  async getOne(id) {
    return apiFetch(`/coupons/${id}`);
  },
  async findByCode(code) {
    const res = await apiFetch(`/coupons${buildQuery({ code })}`);
    return res?.['hydra:member']?.[0] || null;
  },
  async create(data) {
    return apiFetch('/coupons', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/coupons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/coupons/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// BLOG CATEGORIES
// ============================================================
export const blogCategoryService = {
  async getAll(params = {}, skipAuth = false) {
    const data = await apiFetch(`/blog_categories${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async create(data) {
    return apiFetch('/blog_categories', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/blog_categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/blog_categories/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// BLOG ARTICLES
// ============================================================
export const blogArticleService = {
  async getAll(params = {}, skipAuth = false) {
    const data = await apiFetch(`/blog_articles${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async getOne(id, skipAuth = false) {
    return apiFetch(`/blog_articles/${id}`, {}, false, skipAuth);
  },
  /** POST /blog_articles — multipart */
  async create(formData) {
    return apiFetch('/blog_articles', { method: 'POST', body: formData }, true);
  },
  async update(id, data) {
    return apiFetch(`/blog_articles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/blog_articles/${id}`, { method: 'DELETE' });
  },
  async publish(id) {
    return apiFetch(`/blog_articles/${id}/publish`, { method: 'PATCH' });
  },
  async unpublish(id) {
    return apiFetch(`/blog_articles/${id}/unpublish`, { method: 'PATCH' });
  },
  async featured(id) {
    return apiFetch(`/blog_articles/${id}/featured`, { method: 'PATCH' });
  },
};

// ============================================================
// BANNERS
// ============================================================
export const bannerService = {
  async getActive() {
    return apiFetch('/banners/active', {}, false, true);
  },
  async getAll() {
    return apiFetch('/banners');
  },
  async getOne(id) {
    return apiFetch(`/banners/${id}`);
  },
  async create(formData) {
    return apiFetch('/banners', { method: 'POST', body: formData }, true);
  },
  async update(id, formData) {
    return apiFetch(`/banners/${id}`, { method: 'PATCH', body: formData }, true);
  },
  async delete(id) {
    return apiFetch(`/banners/${id}`, { method: 'DELETE' });
  },
  async setPosition(id, position) {
    return apiFetch(`/banners/${id}/position`, {
      method: 'PATCH',
      body: JSON.stringify({ position }),
    });
  },
};

// ============================================================
// RECIPES
// ============================================================
export const recipeService = {
  async getAll(params = {}, skipAuth = false) {
    const data = await apiFetch(`/recipes${buildQuery(params)}`, {}, false, skipAuth);
    return normalizeCollectionResponse(data);
  },
  async getOne(id, skipAuth = false) {
    return apiFetch(`/recipes/${id}`, {}, false, skipAuth);
  },
  async create(formData) {
    return apiFetch('/recipes', { method: 'POST', body: formData }, true);
  },
  async update(id, data) {
    return apiFetch(`/recipes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/recipes/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// SETTINGS
// ============================================================
export const settingsService = {
  async get(id = 1) {
    return apiFetch(`/settings/${id}`);
  },
  async update(id = 1, data) {
    return apiFetch(`/settings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
};

// ============================================================
// USERS
// ============================================================
export const userService = {
  async getAll(params = {}) {
    return apiFetch(`/users${buildQuery(params)}`);
  },
  async getOne(id) {
    return apiFetch(`/users/${id}`);
  },
  async create(data) {
    return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/users/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// STOCK MOVEMENTS
// ============================================================
export const stockMovementService = {
  async getAll(params = {}) {
    return apiFetch(`/stock_movements${buildQuery(params)}`);
  },
};

// ============================================================
// PROMOTIONS
// ============================================================
export const promotionService = {
  async getAll(params = {}) {
    return apiFetch(`/promotions${buildQuery(params)}`);
  },
  async create(data) {
    return apiFetch('/promotions', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiFetch(`/promotions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify(data),
    });
  },
  async delete(id) {
    return apiFetch(`/promotions/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// HELPERS — extract id number from IRI string "/api/products/3"
// ============================================================
export const iriToId = (iri) => {
  if (!iri) return null;
  const parts = iri.split('/');
  return parseInt(parts[parts.length - 1], 10);
};

export const idToIri = (resource, id) => `/api/${resource}/${id}`;

export const resolveFlavorName = (flavor, flavorCatalog = []) => {
  if (!flavor) return '';

  if (typeof flavor === 'string') {
    const catalogMatch = flavorCatalog.find((item) => {
      const itemId = item?.id ?? iriToId(item?.['@id']) ?? iriToId(item?.iri);
      return String(itemId) === String(iriToId(flavor)) || item?.name === flavor;
    });
    return catalogMatch?.name || flavor;
  }

  if (typeof flavor === 'number') {
    const catalogMatch = flavorCatalog.find((item) => String(item?.id) === String(flavor));
    return catalogMatch?.name || '';
  }

  if (typeof flavor === 'object') {
    return (
      flavor.name ||
      flavor.label ||
      flavor.title ||
      flavor.value ||
      flavorCatalog.find((item) => {
        const itemId = item?.id ?? iriToId(item?.['@id']) ?? iriToId(item?.iri);
        const flavorId = flavor?.id ?? iriToId(flavor?.['@id']) ?? iriToId(flavor?.iri);
        return String(itemId) === String(flavorId);
      })?.name ||
      ''
    );
  }

  return '';
};

export const resolveProductFlavors = (product, flavorCatalog = []) => {
  const rawFlavors = Array.isArray(product?.flavors) ? product.flavors : [];
  return rawFlavors
    .map((flavor) => resolveFlavorName(flavor, flavorCatalog))
    .filter(Boolean);
};
