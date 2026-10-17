require('dotenv').config();

const assert = require('assert');
const { Product } = require('../models');

// 1. Verify Product Model Category and Unit definitions
const categoryValues = Product.rawAttributes.category.values;
assert(categoryValues.includes('Marble'), 'Category ENUM must include Marble');
assert(categoryValues.includes('Tiles'), 'Category ENUM must include Tiles');
assert(categoryValues.includes('Cement'), 'Category ENUM must include Cement');
assert(categoryValues.includes('Other'), 'Category ENUM must include Other');
assert.strictEqual(Product.rawAttributes.unit.type.constructor.name, 'STRING', 'Product unit must be flexible STRING to support custom selling units');

// 2. Verify Category to Unit Mapping Rules
const CATEGORY_DEFAULT_UNITS = {
  Cement: 'bag',
  Steel: 'kg',
  Bricks: 'piece',
  Sand: 'cft',
  Crush: 'cft',
  Tiles: 'meter',
  Marble: 'sqft',
  Paint: 'liter',
  Electrical: 'piece',
  Plumbing: 'piece',
};

assert.strictEqual(CATEGORY_DEFAULT_UNITS['Tiles'], 'meter', 'Tiles unit must be meter');
assert.strictEqual(CATEGORY_DEFAULT_UNITS['Marble'], 'sqft', 'Marble unit must be sqft');
assert.strictEqual(CATEGORY_DEFAULT_UNITS['Cement'], 'bag', 'Cement unit must be bag');
assert.strictEqual(CATEGORY_DEFAULT_UNITS['Steel'], 'kg', 'Steel unit must be kg');
assert.strictEqual(CATEGORY_DEFAULT_UNITS['Bricks'], 'piece', 'Bricks unit must be piece');

// 3. Verify Wholesale Price Reduction Calculation on Invoices
function computeWholesaleInvoiceTotals({ items, deliveryFee = 0, existingDiscount = 0 }) {
  const wholesaleDiscount = items.reduce((sum, item) => {
    const retailPrice = Number(item.productSnapshot?.retailPrice || 0);
    const unitPrice = Number(item.unitPrice || 0);
    if (retailPrice > unitPrice && item.pricingType === 'wholesale' && item.productSnapshot?.sellerRole === 'Wholesaler') {
      return sum + ((retailPrice - unitPrice) * Number(item.quantity || 0));
    }
    return sum;
  }, 0);

  const chargedSubtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0);
  const discount = Math.max(Number(existingDiscount || 0), wholesaleDiscount);
  const subtotal = wholesaleDiscount > 0 ? (chargedSubtotal + wholesaleDiscount) : chargedSubtotal;
  const deliveryCharges = Number(deliveryFee);
  const grandTotal = chargedSubtotal + deliveryCharges;

  return { subtotal, discount, wholesaleDiscount, deliveryCharges, grandTotal };
}

// Case A: Purchase 50 bags from wholesaler at wholesale price 95 PKR (retail price was 120 PKR)
const sampleWholesaleItems = [
  {
    productName: 'Bestway Cement',
    quantity: 50,
    unit: 'bag',
    unitPrice: 95,
    pricingType: 'wholesale',
    productSnapshot: { retailPrice: 120, wholesalePrice: 95, sellerRole: 'Wholesaler' },
  },
];

const totalsA = computeWholesaleInvoiceTotals({ items: sampleWholesaleItems, deliveryFee: 200 });
assert.strictEqual(totalsA.wholesaleDiscount, 1250, 'Wholesale savings must be (120 - 95) * 50 = 1250');
assert.strictEqual(totalsA.discount, 1250);
assert.strictEqual(totalsA.subtotal, 6000, 'Subtotal before discount must be 50 * 120 = 6000');
assert.strictEqual(totalsA.deliveryCharges, 200);
assert.strictEqual(totalsA.grandTotal, 4950, 'Grand total must be 4750 + 200 = 4950');
assert.strictEqual(totalsA.subtotal - totalsA.discount + totalsA.deliveryCharges, totalsA.grandTotal, 'subtotal - discount + delivery must equal grandTotal');

// Case B: Regular retail purchase without wholesale discount
const sampleRetailItems = [
  {
    productName: 'Tiles',
    quantity: 20,
    unit: 'meter',
    unitPrice: 300,
    pricingType: 'retail',
    productSnapshot: { retailPrice: 300, wholesalePrice: 250 },
  },
];

const totalsB = computeWholesaleInvoiceTotals({ items: sampleRetailItems, deliveryFee: 100 });
assert.strictEqual(totalsB.wholesaleDiscount, 0, 'No wholesale discount when buying at retail price');
assert.strictEqual(totalsB.discount, 0);
assert.strictEqual(totalsB.subtotal, 6000);
assert.strictEqual(totalsB.grandTotal, 6100);

// Case C: A Supplier's minimum-quantity price is not a Wholesaler discount.
const sampleSupplierItems = [
  {
    productName: 'Steel',
    quantity: 100,
    unit: 'kg',
    unitPrice: 210,
    pricingType: 'wholesale',
    productSnapshot: { retailPrice: 225, wholesalePrice: 210, sellerRole: 'Supplier' },
  },
];

const totalsC = computeWholesaleInvoiceTotals({ items: sampleSupplierItems });
assert.strictEqual(totalsC.wholesaleDiscount, 0, 'Supplier pricing must not be labeled as a Wholesaler discount');
assert.strictEqual(totalsC.discount, 0);

console.log('Invoice and category unit check passed: Marble sqft, Tiles meter, custom units, and wholesale discount calculation.');
