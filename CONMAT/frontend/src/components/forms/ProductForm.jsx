import { useEffect, useState } from 'react';
import './ProductForm.css';

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  price: '',
  retailPrice: '',
  wholesalePrice: '',
  minWholesaleQty: '50',
  deliveryCharge: '0',
  freeDeliveryMinQuantity: '',
  stock: '',
  unit: 'piece',
  brand: '',
  city: '',
  image: null,
};

const isNonNegativeNumber = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
const isPositiveInteger = (value) => value !== '' && Number.isInteger(Number(value)) && Number(value) >= 1;

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

const getInitialFormData = (values, role = '', defaultCity = '') => {
  if (!values) return { ...EMPTY_FORM, city: defaultCity || '' };
  const isSupplier = String(role).toLowerCase() === 'supplier';
  const category = values.category || '';
  const defaultUnit = CATEGORY_DEFAULT_UNITS[category] || 'piece';
  return {
    name: values.name || '',
    category,
    description: values.description || '',
    price: values.price ?? (isSupplier ? values.wholesalePrice : values.retailPrice) ?? '',
    retailPrice: values.retailPrice ?? values.price ?? '',
    wholesalePrice: values.wholesalePrice ?? values.price ?? '',
    minWholesaleQty: values.minWholesaleQty ?? 50,
    deliveryCharge: values.deliveryCharge ?? 0,
    freeDeliveryMinQuantity: values.freeDeliveryMinQuantity ?? '',
    stock: values.stock ?? '',
    unit: values.unit || defaultUnit,
    brand: values.brand || '',
    city: values.city || defaultCity || '',
    image: null,
  };
};

export default function ProductForm({
  mode = 'create',
  initialValues = null,
  submitting = false,
  role = '',
  defaultCity = '',
  onSubmit,
  onCancel,
}) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const isRetailer = normalizedRole === 'retailer';
  const isWholesaler = normalizedRole === 'wholesaler';
  const isSupplier = normalizedRole === 'supplier';
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);
  const [formData, setFormData] = useState(() => getInitialFormData(initialValues, normalizedRole, defaultCity));
  const [imagePreview, setImagePreview] = useState(() => initialValues?.imageUrl || initialValues?.image || '');
  const [formError, setFormError] = useState('');

  const isEdit = mode === 'edit';

  // Synchronize state when initialValues changes
  if (initialValues !== prevInitialValues) {
    setPrevInitialValues(initialValues);
    setFormData(getInitialFormData(initialValues, normalizedRole, defaultCity));
    setImagePreview(initialValues?.imageUrl || initialValues?.image || '');
  }

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormError('');
    setFormData((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (name === 'category') {
        if (CATEGORY_DEFAULT_UNITS[value]) {
          next.unit = CATEGORY_DEFAULT_UNITS[value];
        } else if (value === 'Other') {
          next.unit = previous.unit && !CATEGORY_DEFAULT_UNITS[previous.category] ? previous.unit : '';
        }
      }

      return next;
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFormError('');
    setFormData((previous) => ({
      ...previous,
      image: file,
    }));

    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    if (!formData.category.trim()) {
      setFormError('Product category is required.');
      return;
    }

    if ((isRetailer || isWholesaler) && !isNonNegativeNumber(formData.retailPrice)) {
      setFormError('Enter a valid retail price.');
      return;
    }

    if (isWholesaler && !isNonNegativeNumber(formData.wholesalePrice)) {
      setFormError('Enter a valid wholesale price.');
      return;
    }

    if (isSupplier && !isNonNegativeNumber(formData.price)) {
      setFormError('Enter a valid product price.');
      return;
    }

    if ((isWholesaler || isSupplier) && !isPositiveInteger(formData.minWholesaleQty)) {
      setFormError(`${isSupplier ? 'Minimum order' : 'Minimum wholesale'} quantity must be at least 1.`);
      return;
    }

    if (!isNonNegativeNumber(formData.deliveryCharge)) {
      setFormError('Delivery charge must be zero or greater.');
      return;
    }

    if (formData.freeDeliveryMinQuantity !== '' && !isPositiveInteger(formData.freeDeliveryMinQuantity)) {
      setFormError('Free delivery minimum quantity must be at least 1.');
      return;
    }

    if (!formData.city.trim()) {
      setFormError('Seller city is required.');
      return;
    }

    if (formData.stock === '' || !Number.isInteger(Number(formData.stock)) || Number(formData.stock) < 0) {
      setFormError('Enter a valid stock quantity.');
      return;
    }

    if (!formData.unit || !formData.unit.trim()) {
      setFormError('Selling unit is required.');
      return;
    }

    setFormError('');
    const pricing = isRetailer
      ? {
          retailPrice: Number(formData.retailPrice),
          wholesalePrice: Number(formData.retailPrice),
          minWholesaleQty: 1,
        }
      : isSupplier
        ? {
            price: Number(formData.price),
            retailPrice: Number(formData.price),
            wholesalePrice: Number(formData.price),
            minWholesaleQty: Number(formData.minWholesaleQty),
          }
        : {
            retailPrice: Number(formData.retailPrice),
            wholesalePrice: Number(formData.wholesalePrice),
            minWholesaleQty: Number(formData.minWholesaleQty),
          };

    onSubmit({
      ...formData,
      ...pricing,
      deliveryCharge: Number(formData.deliveryCharge),
      freeDeliveryMinQuantity: Number(formData.deliveryCharge) === 0 || formData.freeDeliveryMinQuantity === ''
        ? ''
        : Number(formData.freeDeliveryMinQuantity),
      stock: Number(formData.stock),
      city: formData.city.trim(),
    });
  };

  return (
    <div className="product-form">

      {/* HEADER */}

      <div className="product-form__head">

        <div>
          <span>
            {isEdit
              ? 'Product Management'
              : 'New Listing'}
          </span>

          <h2>
            {isEdit
              ? 'Update Product'
              : 'Add Product'}
          </h2>

          <p>
            {isEdit
              ? 'Update your construction material listing.'
              : 'Add a new construction material to your inventory.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close product form"
        >
          ×
        </button>

      </div>


      {/* FORM */}

      <form onSubmit={handleSubmit}>

        {formError && (
          <p className="product-form__error" role="alert" aria-live="polite">
            {formError}
          </p>
        )}

        <div className="product-form__grid">

          {/* PRODUCT NAME */}

          <label>
            Product Name

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Portland Cement"
              required
            />
          </label>


          {/* CATEGORY */}

          <label>
            Category

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">
                Select category
              </option>

              <option value="Cement">
                Cement
              </option>

              <option value="Steel">
                Steel
              </option>

              <option value="Bricks">
                Bricks
              </option>

              <option value="Sand">
                Sand
              </option>

              <option value="Crush">
                Crush / Aggregate
              </option>

              <option value="Tiles">
                Tiles
              </option>

              <option value="Marble">
                Marble
              </option>

              <option value="Paint">
                Paint
              </option>

              <option value="Electrical">
                Electrical
              </option>

              <option value="Plumbing">
                Plumbing
              </option>

              <option value="Other">
                Other
              </option>
            </select>
          </label>


          {/* BRAND */}

          <label>
            Brand

            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. Bestway"
            />
          </label>


          {/* SELLING UNIT */}

          <label>
            Selling Unit

            {formData.category === 'Other' ? (
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="Enter selling unit (e.g. roll, box, bundle)"
                required
              />
            ) : (
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
              >
                <option value="piece">
                  Piece
                </option>

                <option value="bag">
                  Bag
                </option>

                <option value="kg">
                  Kilogram
                </option>

                <option value="ton">
                  Ton
                </option>

                <option value="meter">
                  Meter
                </option>

                <option value="sqft">
                  Square Foot
                </option>

                <option value="cft">
                  Cubic Foot
                </option>

                <option value="bundle">
                  Bundle
                </option>

                <option value="liter">
                  Liter
                </option>
              </select>
            )}
          </label>


          {/* PRICING */}

          {(isRetailer || isWholesaler) && (
            <label>
              Retail Price

              <input
                type="number"
                name="retailPrice"
                min="0"
                step="0.01"
                value={formData.retailPrice}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </label>
          )}

          {isWholesaler && (
            <label>
              Wholesale Price

              <input
                type="number"
                name="wholesalePrice"
                min="0"
                step="0.01"
                value={formData.wholesalePrice}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </label>
          )}

          {isSupplier && (
            <label>
              Product Price

              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </label>
          )}

          {(isWholesaler || isSupplier) && (
            <label>
              {isSupplier ? 'Minimum Order Quantity' : 'Minimum Wholesale Quantity'}

              <input
                type="number"
                name="minWholesaleQty"
                min="1"
                step="1"
                value={formData.minWholesaleQty}
                onChange={handleChange}
                placeholder="50"
                required
              />
            </label>
          )}

          <label>
            Delivery Charge (PKR)

            <input
              type="number"
              name="deliveryCharge"
              min="0"
              step="0.01"
              value={formData.deliveryCharge}
              onChange={handleChange}
              placeholder="0 for free delivery"
              required
            />
            <small className="product-form__field-help">Set this to 0 to offer free delivery for every order.</small>
          </label>

          <label>
            Free Delivery From Quantity (Optional)

            <input
              type="number"
              name="freeDeliveryMinQuantity"
              min="1"
              step="1"
              value={formData.freeDeliveryMinQuantity}
              onChange={handleChange}
              placeholder="e.g. 500"
              disabled={Number(formData.deliveryCharge) === 0}
            />
            <small className="product-form__field-help">Leave empty to charge delivery at every quantity.</small>
          </label>

          {/* STOCK */}

          <label>
            Stock Quantity

            <input
              type="number"
              name="stock"
              min="0"
              step="1"
              value={formData.stock}
              onChange={handleChange}
              placeholder="0"
              required
            />
          </label>

        </div>


        {/* DESCRIPTION */}

        <label className="product-form__description">
          Description

          <textarea
            name="description"
            rows="5"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the product, quality, specifications, available sizes, etc."
          />
        </label>


        {/* IMAGE */}

        <div className="product-form__upload">

          <label>
            Product Image

            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
            />
          </label>

          <div className="product-form__preview">

            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Product preview"
              />
            ) : (
              <span>
                Image Preview
              </span>
            )}

          </div>

        </div>


        {/* ACTIONS */}

        <div className="product-form__actions">

          <button
            type="button"
            className="product-form__ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? isEdit
                ? 'Updating...'
                : 'Adding...'
              : isEdit
                ? 'Update Product'
                : 'Add Product'}
          </button>

        </div>

      </form>

    </div>
  );
}
