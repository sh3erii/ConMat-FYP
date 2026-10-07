import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import LandingNavbar from '../components/common/LandingNavbar';
import RoleNavbar from '../components/common/RoleNavbar';
import ProductCard from '../components/common/ProductCard';
import ProductDetailModal from '../components/common/ProductDetailModal';
import PublicFooter from '../components/common/PublicFooter';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { buyerRoles, getUserRole } from '../config/navigation';
import {
  PAKISTAN_MAJOR_CITIES,
  canonicalizePakistanCity,
  cityOptionsWithCurrent,
  normalizeCity,
} from '../config/pakistanCities';
import './Marketplace.css';

const categories = ['All', 'Cement', 'Steel', 'Bricks', 'Sand', 'Crush', 'Tiles', 'Marble', 'Paint', 'Electrical', 'Plumbing', 'Other'];

const initialFilters = {
  search: '',
  category: 'All',
  city: 'All',
  pricing: 'retail',
  sort: 'newest'
};

const getFiltersFromSearch = (searchString = '') => {
  const params = new URLSearchParams(searchString);
  const pricing = params.get('pricing');
  const category = params.get('category');
  const city = params.get('city');
  const sort = params.get('sort');

  return {
    ...initialFilters,
    search: params.get('search') || '',
    category: categories.includes(category) ? category : initialFilters.category,
    city: !city || normalizeCity(city) === 'all' ? initialFilters.city : canonicalizePakistanCity(city),
    pricing: pricing === 'wholesale' ? 'wholesale' : initialFilters.pricing,
    sort: ['newest', 'price_low', 'price_high', 'stock'].includes(sort) ? sort : initialFilters.sort,
  };
};

export default function Marketplace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [prevSearch, setPrevSearch] = useState(location.search);
  const [filters, setFilters] = useState(() => getFiltersFromSearch(location.search));
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState('');
  const { addToCart } = useCart();
  const canPlaceOrders = buyerRoles.includes(getUserRole(user));
  const cityOptions = useMemo(() => [
    'All',
    ...cityOptionsWithCurrent(filters.city === 'All' ? '' : filters.city),
  ], [filters.city]);

  if (location.search !== prevSearch) {
    setPrevSearch(location.search);
    const nextFilters = getFiltersFromSearch(location.search);
    setFilters((current) => (
      Object.keys(nextFilters).every((key) => current[key] === nextFilters[key])
        ? current
        : nextFilters
    ));
  }

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get('/products', { params: filters });
        if (!active) return;
        setProducts(data.products || []);
      } catch (err) {
        if (!active) return;
        setProducts([]);
        setError(err.response?.data?.message || 'Unable to load marketplace products.');
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(loadProducts, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters]);

  const filteredProducts = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const rows = products.filter((product) => {
      const matchSearch = !search || [product.name, product.brand, product.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));
      const matchCategory = filters.category === 'All' || product.category === filters.category;
      const matchCity = filters.city === 'All' || normalizeCity(product.city) === normalizeCity(filters.city);
      return matchSearch && matchCategory && matchCity;
    });

    const getActivePrice = (product) => {
      const role = String(product.sellerRole || product.seller?.role || '').toLowerCase();
      if (role === 'supplier' || product.pricingModel === 'minimum') {
        return Number(product.price ?? product.wholesalePrice ?? product.retailPrice ?? 0);
      }
      if (role === 'retailer' || product.pricingModel === 'retail') {
        return Number(product.retailPrice ?? product.price ?? 0);
      }
      return Number(filters.pricing === 'wholesale'
        ? product.wholesalePrice ?? product.retailPrice ?? 0
        : product.retailPrice ?? product.wholesalePrice ?? 0);
    };

    if (filters.sort === 'price_low') rows.sort((a, b) => getActivePrice(a) - getActivePrice(b));
    if (filters.sort === 'price_high') rows.sort((a, b) => getActivePrice(b) - getActivePrice(a));
    if (filters.sort === 'stock') rows.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));

    return rows;
  }, [products, filters]);

  const handleFilterChange = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleAddToCart = (product, quantity = 1, pricingType = filters.pricing) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!buyerRoles.includes(getUserRole(user))) {
      setToast('Use a Customer, Retailer, or Wholesaler account to place marketplace orders.');
      setTimeout(() => setToast(''), 2600);
      return;
    }
    const sellerId = product.sellerId || product.seller?.id;
    if (sellerId && String(user.id) === String(sellerId)) {
      setToast('This is your product. You cannot add your own listing to the cart.');
      setTimeout(() => setToast(''), 2600);
      return;
    }

    const result = addToCart(product, quantity, pricingType);
    if (result?.ok === false) {
      setToast(result.message);
      setTimeout(() => setToast(''), 3200);
      return;
    }
    setToast(`${product.name} added to cart.`);
    setTimeout(() => setToast(''), 2200);
  };

  return (
    <main className="marketplace-page">
      {user ? <RoleNavbar /> : <LandingNavbar />}

      <section className="marketplace-hero conmat-page-hero workspace-hero workspace-hero--detached workspace-hero--after-nav">
        <div className="workspace-hero__content">
          <span className="marketplace-hero__eyebrow">Industrial Marketplace</span>
          <h1>Browse admin-approved construction materials across Pakistan.</h1>
          <p>
            {canPlaceOrders || !user
              ? 'Compare retail and wholesale pricing, check stock, and add materials to cart for direct order placement.'
              : 'Review approved listings, seller details, pricing, and stock in browse-only mode.'}
          </p>
        </div>

        <div className="marketplace-hero__stats workspace-hero__side">
          <div><strong>{filteredProducts.length}</strong><span>Products</span></div>
          <div><strong>{categories.length - 1}</strong><span>Categories</span></div>
          <div><strong>{PAKISTAN_MAJOR_CITIES.length}</strong><span>Cities</span></div>
        </div>
      </section>

      <section className="marketplace-filters" aria-label="Marketplace filters">
        <label>
          <span>Search</span>
          <input
            type="search"
            placeholder="Search cement, steel, bricks..."
            value={filters.search}
            onChange={(event) => handleFilterChange('search', event.target.value)}
          />
        </label>

        <label>
          <span>Category</span>
          <select className="conmat-filter-select" value={filters.category} onChange={(event) => handleFilterChange('category', event.target.value)}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>

        <label>
          <span>City</span>
          <select className="conmat-filter-select" value={filters.city} onChange={(event) => handleFilterChange('city', event.target.value)}>
            {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>

        <label>
          <span>Pricing</span>
          <select className="conmat-filter-select" value={filters.pricing} onChange={(event) => handleFilterChange('pricing', event.target.value)}>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </label>

        <label>
          <span>Sort</span>
          <select className="conmat-filter-select" value={filters.sort} onChange={(event) => handleFilterChange('sort', event.target.value)}>
            <option value="newest">Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="stock">Stock</option>
          </select>
        </label>
      </section>

      {error && <div className="marketplace-alert">{error}</div>}
      {toast && <div className="marketplace-toast">{toast}</div>}

      {loading ? (
        <section className="marketplace-grid">
          {Array.from({ length: 6 }).map((_, index) => <div className="marketplace-skeleton" key={index} />)}
        </section>
      ) : filteredProducts.length ? (
        <section className="marketplace-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={`${product.id}-${filters.pricing}-${product.stock}-${product.minimumOrderQty || product.minWholesaleQty || 1}`}
              product={product}
              pricingMode={filters.pricing}
              onView={setSelectedProduct}
              onAddToCart={handleAddToCart}
            />
          ))}
        </section>
      ) : (
        <section className="marketplace-empty">
          <h2>No products found</h2>
          <p>Try clearing filters or search for another construction material.</p>
          <button type="button" className="btn btn-orange-cta fw-bold" onClick={() => setFilters(initialFilters)}>Reset Filters</button>
        </section>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          pricingMode={filters.pricing}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <PublicFooter />
    </main>
  );
}
