const firstValue = (...values) => values.find(
  (value) => value !== null && value !== undefined && String(value).trim() !== ""
);

const displayValue = (value) => {
  if (value && typeof value === "object") {
    return value.name ?? value.label ?? value.title ?? "";
  }
  return String(value ?? "").trim();
};

const capacityLabel = (value) => {
  const label = displayValue(value);
  return !label || /(?:l|litre|liter)s?$/i.test(label) ? label : `${label} L`;
};

export const getVariantOptionLabels = (variant) => {
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
  const capacity = firstValue(
    options.capacityLiters,
    options.capacity_liters,
    options.capacity,
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

  return [
    design && `Design : ${design}`,
    color && `Couleur : ${color}`,
    size && (isAccessory ? `Taille : ${size}` : size),
    !size && weight && `${weight}${/kg$/i.test(weight) ? "" : " kg"}`,
    capacity && `Contenance : ${capacityLabel(capacity)}`,
  ].filter(Boolean);
};
