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

const normalizeOptionKey = (key) => String(key).replace(/([a-z0-9])([A-Z])/g, "$1$2").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

const optionEntries = (options) => (
  Array.isArray(options)
    ? options.map((option, index) => [
      option?.name ?? option?.label ?? `Option ${index + 1}`,
      option?.value ?? option?.valueName ?? option,
    ])
    : Object.entries(options)
);

const readOption = (options, aliases) => {
  const keys = new Set(aliases.map(normalizeOptionKey));
  const entry = optionEntries(options).find(([key]) => keys.has(normalizeOptionKey(key)));
  return entry?.[1];
};

const optionLabel = (key) => {
  const normalized = normalizeOptionKey(key);
  const labels = {
    pointure: "Pointure",
    shoesize: "Pointure",
    waist: "Tour de taille",
    material: "Matière",
    fabric: "Matière",
    length: "Longueur",
    width: "Largeur",
  };
  if (labels[normalized]) return labels[normalized];
  const words = String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toLocaleUpperCase() + words.slice(1).toLocaleLowerCase() : "Option";
};

const getVariantOptionData = (variant) => {
  const options = variant?.options && typeof variant.options === "object" ? variant.options : {};
  const design = displayValue(firstValue(
    readOption(options, ["design", "model", "modele", "style", "pattern"]),
    variant?.design,
    variant?.model,
    variant?.style
  ));
  const color = displayValue(firstValue(
    readOption(options, ["color", "colour", "couleur"]),
    variant?.color,
    variant?.colour
  ));
  const shoeSize = firstValue(
    readOption(options, ["pointure", "shoeSize", "shoe_size"]),
    variant?.pointure,
    variant?.shoeSize,
    variant?.shoe_size
  );
  const size = displayValue(firstValue(shoeSize, readOption(options, ["size", "taille"]), variant?.size, variant?.taille));
  const weight = displayValue(firstValue(readOption(options, ["weight", "poids"]), variant?.weight));
  const genericCapacity = firstValue(readOption(options, ["capacity", "contenance"]), variant?.capacity);
  const capacity = firstValue(
    genericCapacity,
    readOption(options, ["capacityLiters", "capacity_liters", "liters", "volume"]),
    variant?.capacityLiters,
    variant?.capacity_liters
  );
  const knownOptionKeys = new Set([
    "design", "model", "modele", "style", "pattern",
    "color", "colour", "couleur",
    "size", "taille", "pointure", "shoesize",
    "weight", "poids",
    "capacity", "contenance", "capacityliters", "liters", "volume",
    "accessorytype", "variantkind", "id", "sku", "barcode", "stock", "price",
    "saleprice", "isactive", "name", "label",
  ]);
  const additionalOptions = optionEntries(options)
    .filter(([key]) => !knownOptionKeys.has(normalizeOptionKey(key)))
    .map(([key, value]) => ({
      key: `option:${normalizeOptionKey(key)}`,
      label: optionLabel(key),
      value: displayValue(value),
    }))
    .filter((option) => option.value);
  const isAccessory = Boolean(
    options.accessoryType
    || options.variantKind === "accessory"
    || design
    || color
    || shoeSize
    || capacity
  );

  return {
    design,
    color,
    size,
    sizeLabel: shoeSize != null ? "Pointure" : "Taille",
    weight: weight && `${weight}${/kg$/i.test(weight) ? "" : " kg"}`,
    capacity: capacity && capacityLabel(capacity, genericCapacity == null),
    additionalOptions,
    isAccessory,
  };
};

export const getVariantOptionValues = (variant) => {
  const { design, color, size, sizeLabel, weight, capacity, additionalOptions } = getVariantOptionData(variant);
  return [
    { key: "design", label: "Design", value: design },
    { key: "color", label: "Couleur", value: color },
    { key: "size", label: sizeLabel, value: size },
    { key: "weight", label: "Poids", value: weight },
    { key: "capacity", label: "Contenance", value: capacity },
    ...additionalOptions,
  ].filter((option) => option.value);
};

export const getVariantOptionLabels = (variant) => {
  const { design, color, size, sizeLabel, weight, capacity, additionalOptions, isAccessory } = getVariantOptionData(variant);
  return [
    design && `Design : ${design}`,
    color && `Couleur : ${color}`,
    size && (isAccessory ? `${sizeLabel} : ${size}` : size),
    !size && weight,
    capacity && `Contenance : ${capacity}`,
    ...additionalOptions.map((option) => `${option.label} : ${option.value}`),
  ].filter(Boolean);
};
