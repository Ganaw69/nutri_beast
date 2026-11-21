const firstValue = (...values) => values.find(
  (value) => value !== null && value !== undefined && String(value).trim() !== ""
);

const displayValue = (value) => {
  if (value && typeof value === "object") {
    return value.name ?? value.label ?? value.title ?? "";
  }
  return String(value ?? "").trim();
};

const capacityLabel = (value, appendLiters) => {
  const label = displayValue(value);
  if (!label || !appendLiters || /(?:ml|milliliters?|millilitres?|l|liters?|litres?)$/i.test(label)) return label;
  return `${label} L`;
};

const getVariantOptionData = (variant) => {
  const options = variant?.options && typeof variant.options === "object" ? variant.options : {};
  const design = displayValue(firstValue(
    options.design,
    options.model,
    options.style,
    options.pattern,
    variant?.design,
    variant?.model,
    variant?.style
  ));
  const color = displayValue(firstValue(options.color, options.colour, variant?.color, variant?.colour));
  const size = displayValue(firstValue(options.size, variant?.size));
  const weight = displayValue(firstValue(options.weight, variant?.weight));
  const genericCapacity = firstValue(options.capacity, variant?.capacity);
  const capacity = firstValue(
    genericCapacity,
    options.capacityLiters,
    options.capacity_liters,
    options.liters,
    options.volume,
    variant?.capacityLiters,
    variant?.capacity_liters
  );
  const isAccessory = Boolean(
    options.accessoryType
    || options.variantKind === "accessory"
    || design
    || color
    || capacity
  );

  return {
    design,
    color,
    size,
    weight: weight && `${weight}${/kg$/i.test(weight) ? "" : " kg"}`,
    capacity: capacity && capacityLabel(capacity, genericCapacity == null),
    isAccessory,
  };
};

export const getVariantOptionValues = (variant) => {
  const { design, color, size, weight, capacity } = getVariantOptionData(variant);
  return [
    { key: "design", label: "Design", value: design },
    { key: "color", label: "Couleur", value: color },
    { key: "size", label: "Taille", value: size },
    { key: "weight", label: "Poids", value: weight },
    { key: "capacity", label: "Contenance", value: capacity },
  ].filter((option) => option.value);
};

export const getVariantOptionLabels = (variant) => {
  const { design, color, size, weight, capacity, isAccessory } = getVariantOptionData(variant);
  return [
    design && `Design : ${design}`,
    color && `Couleur : ${color}`,
    size && (isAccessory ? `Taille : ${size}` : size),
    !size && weight,
    capacity && `Contenance : ${capacity}`,
  ].filter(Boolean);
};
