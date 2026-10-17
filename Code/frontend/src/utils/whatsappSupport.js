export const CONMAT_WHATSAPP_NUMBER = '923183448040';

export function whatsappDeliverySupportUrl({ orderNumber, productName } = {}) {
  const orderText = orderNumber ? ` order ${orderNumber}` : ' my order';
  const productText = productName ? ` (${productName})` : '';
  const message = `Hello ConMat support, I need help with a delivery problem for${orderText}${productText}. Automatic payment release has been paused while I resolve this.`;
  return `https://wa.me/${CONMAT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
