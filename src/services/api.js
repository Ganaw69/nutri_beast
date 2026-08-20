// ============================================================
// NutriBeast API Service Layer
// Base URL: https://127.0.0.1:8000/api
// NOTE: Accept the self-signed cert once by visiting
//       https://127.0.0.1:8000/api/docs in your browser.
// ============================================================

const BASE_URL = import.meta.env.DEV ? '/api' : 'https://127.0.0.1:8000/api';
const MEDIA_BASE = 'https://127.0.0.1:8000';

/** Resolve a media path to a full URL */
export const mediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return MEDIA_BASE ? `${MEDIA_BASE}/uploads/${path}` : `/uploads/${path}`;
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
  const images = Array.isArray(product?.productImages) ? product.productImages : [];

  const sortedImages = [...images].sort((a, b) => {
    const primaryScore = Number(isPrimaryProductImage(b)) - Number(isPrimaryProductImage(a));
    if (primaryScore !== 0) return primaryScore;
    const positionScore = Number(b?.position ?? 0) - Number(a?.position ?? 0);
    if (positionScore !== 0) return positionScore;
    return Number(b?.id ?? 0) - Number(a?.id ?? 0);
  });

  const primary = sortedImages.find((img) => isPrimaryProductImage(img)) || sortedImages[0];
  const source =
    typeof primary === 'string'
      ? primary
      : primary?.image ?? primary?.path ?? primary?.url ?? primary?.contentUrl ?? primary?.file ?? primary?.filename ?? primary?.name;
  const resolved = source ? productImageUrl(source) : null;
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
      v.forEach((item) => parts.push(`${encodeURIComponent(k)}[]=${encodeURIComponent(item)}`));
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
    const res = await fetch(`${BASE_URL}/login_check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      // Send email explicitly, while keeping username as a compatibility fallback
      // for backends that still map the login field to `username`.
      body: JSON.stringify({ email, username: email, password }),
    });
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
