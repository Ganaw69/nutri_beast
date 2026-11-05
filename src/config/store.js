/** Store-wide checkout rules. Keep these values shared by every cart view. */
export const FREE_SHIPPING_THRESHOLD = 320;
export const STANDARD_SHIPPING_FEE = 7;
export const FREE_SHIPPING_LABEL = "Livraison offerte dès 320 DT d'achat";

export const shippingFeeForSubtotal = (subtotal) => {
  const amount = Number(subtotal) || 0;
  if (amount <= 0 || amount >= FREE_SHIPPING_THRESHOLD) return 0;
  return STANDARD_SHIPPING_FEE;
};

export const freeShippingRemaining = (subtotal) => Math.max(
  0,
  FREE_SHIPPING_THRESHOLD - (Number(subtotal) || 0),
);

export const hasFreeShipping = (subtotal) => freeShippingRemaining(subtotal) === 0;
