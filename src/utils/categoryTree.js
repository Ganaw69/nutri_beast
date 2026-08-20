const parseCategoryId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') {
    return parseCategoryId(value.id ?? value['@id'] ?? value['iri']);
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const iriMatch = value.match(/\/categories\/(\d+)$/);
    if (iriMatch) return Number(iriMatch[1]);
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
  return value;
};

export const getCategoryParentId = (category) => parseCategoryId(category?.parent);

export const normalizeCategoryRecord = (category = {}) => ({
  ...category,
  id: parseCategoryId(category.id ?? category['@id'] ?? category.iri),
  name: category.name ?? category.label ?? '',
  slug: category.slug ?? '',
  description: category.description ?? '',
  position: Number(category.position ?? 0),
  isActive: category.isActive ?? category.is_active ?? true,
  parent: category.parent ?? category.parent_id ?? category.parentId ?? null,
});

export const extractCategoryItems = (data) => {
  const items = Array.isArray(data)
    ? data
    : data?.member || data?.['hydra:member'] || data?.items || [];

  return items.map(normalizeCategoryRecord).filter((category) => category.id !== null && category.id !== undefined);
};

const sortCategories = (items = []) =>
  [...items].sort((a, b) => {
    const positionA = Number(a?.position ?? 0);
    const positionB = Number(b?.position ?? 0);
    if (positionA !== positionB) return positionA - positionB;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'fr', {
      sensitivity: 'base',
    });
  });

export const buildCategoryTree = (categories = []) => {
  const nodes = new Map();
  const roots = [];

  categories.forEach((category) => {
    if (!category?.id) return;
    nodes.set(Number(category.id), { ...category, children: [] });
  });

  nodes.forEach((node) => {
    const parentId = getCategoryParentId(node);
    const parentKey = parentId === null ? null : Number(parentId);
    if (parentKey && nodes.has(parentKey)) {
      nodes.get(parentKey).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (items) =>
    sortCategories(items).map((item) => ({
      ...item,
      children: sortTree(item.children || []),
    }));

  return sortTree(roots);
};

export const collectCategoryAndDescendantIds = (categoryId, categories = []) => {
  const targetId = Number(categoryId);
  if (Number.isNaN(targetId)) return [];

  const byParent = new Map();
  categories.forEach((category) => {
    const parentId = getCategoryParentId(category);
    const key = parentId === null ? null : Number(parentId);
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(category);
  });

  const result = new Set();
  const visit = (id) => {
    const key = Number(id);
    if (Number.isNaN(key) || result.has(key)) return;
    result.add(key);
    (byParent.get(key) || []).forEach((child) => visit(child.id));
  };

  visit(targetId);
  return [...result];
};

export const collectExpandedCategoryIds = (selectedIds = [], categories = []) => {
  const expanded = new Set();
  selectedIds.forEach((id) => {
    collectCategoryAndDescendantIds(id, categories).forEach((nextId) => expanded.add(nextId));
  });
  return [...expanded];
};
