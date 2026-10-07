import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';


import SupplierProductCard from '../../components/common/SupplierProductCard';
import ProductForm from '../../components/forms/ProductForm';

import { useAuth } from '../../context/AuthContext';
import RoleNavbar from '../../components/common/RoleNavbar';

import './ManageProducts.css';

const PRODUCT_UPLOAD_TIMEOUT_MS = 60000;

const toFormData = (values) => {
  const data = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (key === 'image') {
      if (value) {
        data.append('image', value);
      }

      return;
    }

    if (value !== undefined && value !== null) {
      data.append(key, value);
    }
  });

  return data;
};

const normalizeRole = (role) =>
  String(role || '').trim().toLowerCase();

export default function ManageProducts() {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');

  const [query, setQuery] = useState('');

  const [category, setCategory] = useState('All');

  const [showForm, setShowForm] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const role = normalizeRole(user?.role);
  useEffect(() => {
    let isMounted = true;
    api.get('/products/mine')
      .then((response) => {
        if (!isMounted) return;
        const apiProducts = response.data?.products || [];
        setProducts(Array.isArray(apiProducts) ? apiProducts : []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setProducts([]);
        setError(err?.response?.data?.message || err?.message || 'Unable to load products.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    return [
      'All',
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
      ),
    ];
  }, [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const searchText = [
        product.name,
        product.brand,
        product.category,
        product.city,
        product.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery =
        !query ||
        searchText.includes(
          query.toLowerCase()
        );

      const matchesCategory =
        category === 'All' ||
        product.category === category;

      return (
        matchesQuery &&
        matchesCategory
      );
    });
  }, [
    products,
    query,
    category,
  ]);

  const openCreateForm = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setNotice('');
    setError('');

    try {
      const payload = toFormData(values);

      if (editingProduct) {
        const response = await api.put(
          `/products/${editingProduct.id}`,
          payload,
          { timeout: PRODUCT_UPLOAD_TIMEOUT_MS }
        );

        const updatedProduct =
          response.data?.product ||
          response.data;

        setProducts((current) =>
          current.map((product) =>
            product.id === editingProduct.id
              ? updatedProduct
              : product
          )
        );

        setNotice(
          'Product updated successfully.'
        );
      }

      else {
        const response = await api.post(
          '/products',
          payload,
          { timeout: PRODUCT_UPLOAD_TIMEOUT_MS }
        );

        const newProduct =
          response.data?.product ||
          response.data;

        if (newProduct) {
          setProducts((current) => [
            newProduct,
            ...current,
          ]);
        }

        setNotice(response.data?.message || 'Product added successfully.');
      }

      closeForm();

    } catch (err) {
      setError(
        err?.code === 'ECONNABORTED'
          ? 'The product image upload took too long. Please check your connection and try again.'
          : err?.response?.data?.message || err?.message || 'Unable to save the product.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Delete ${product.name}?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/products/${product.id}`
      );

      setProducts((current) =>
        current.filter(
          (item) =>
            item.id !== product.id
        )
      );

      setNotice(
        'Product deleted successfully.'
      );

    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to delete the product.');
    }
  };

  const handleStockUpdate = async (
    product,
    stock
  ) => {
    try {
      const response = await api.patch(
        `/products/${product.id}/stock`,
        {
          stock: Number(stock),
        }
      );

      const updatedProduct =
        response.data?.product ||
        response.data;

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? updatedProduct
            : item
        )
      );

      setNotice(
        'Stock updated successfully.'
      );

    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update stock.');
    }
  };

  const handleRequestReview = async (product, note) => {
    setNotice('');
    setError('');
    try {
      const response = await api.post(`/products/${product.id}/review-request`, { note });
      const updatedProduct = response.data?.product || response.data;
      setProducts((current) => current.map((item) => (
        item.id === product.id ? updatedProduct : item
      )));
      setNotice(response.data?.message || 'Review requested successfully.');
      return updatedProduct;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to request another review.');
      throw requestError;
    }
  };

  return (
    <>
      <RoleNavbar />

      <main className="manage-products-page workspace-page">

        {/* HERO */}

        <section className="manage-products-hero conmat-page-hero workspace-hero">

          <div className="workspace-hero__content">
            <span className="manage-products-kicker">
              {user?.role || 'Workspace'}
            </span>

            <h1>
              Manage Products
            </h1>

            <p>
              Add, update and manage your
              construction material listings
              from your{' '}
              {role || 'workspace'}.
            </p>
          </div>


          <div className="manage-products-hero-card workspace-hero__side">
            <strong>
              {visibleProducts.length}
            </strong>

            <span>
              Your Products
            </span>
          </div>

        </section>


        {/* PRODUCT CONTENT */}

        <section className="manage-products-content">

          {/* HEADER */}

          <div className="manage-products-header">

            <div>
              <span>
                Product Inventory
              </span>

              <h2>
                Your Listings
              </h2>
            </div>


            <button
              type="button"
              className="btn btn-orange-cta manage-products-add-btn"
              onClick={openCreateForm}
            >
              + Add Product
            </button>

          </div>


          {/* SEARCH + CATEGORY */}

          {!loading &&
            products.length > 0 && (
              <div className="manage-products-filters">

                <input
                  type="search"
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search products..."
                  aria-label="Search products"
                />

                <select
                  className="conmat-filter-select"
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                  aria-label="Filter by category"
                >
                  {categories.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>

              </div>
            )}


          {/* ERROR / NOTICE */}

          {error && (
            <div className="manage-products-message manage-products-message-warning">
              {error}
            </div>
          )}

          {notice && (
            <div className="manage-products-message manage-products-message-success">
              {notice}
            </div>
          )}


          {/* PRODUCTS */}

          {loading ? (
            <div className="manage-products-loading">
              Loading products...
            </div>

          ) : visibleProducts.length === 0 ? (

            <div className="manage-products-empty">
              No products found.
            </div>

          ) : (

            <div className="manage-products-grid">

              {visibleProducts.map(
                (product) => (
                  <SupplierProductCard
                    key={product.id}
                    product={product}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onStockUpdate={
                      handleStockUpdate
                    }
                    onRequestReview={handleRequestReview}
                    role={role}
                  />
                )
              )}

            </div>
          )}

        </section>


        {/* PRODUCT FORM MODAL
            IMPORTANT:
            ProductForm lives in:
            components/forms/ProductForm.jsx */}

        {showForm && (
          <div
            className="manage-products-modal"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeForm();
              }
            }}
          >

            <div
              className="manage-products-modal-inner"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >

              <ProductForm
                role={role}
                defaultCity={user?.city || ''}
                mode={
                  editingProduct
                    ? 'edit'
                    : 'create'
                }

                initialValues={
                  editingProduct
                }

                submitting={
                  submitting
                }

                onSubmit={
                  handleSubmit
                }

                onCancel={
                  closeForm
                }
              />

            </div>

          </div>
        )}

      </main>
    </>
  );
}
