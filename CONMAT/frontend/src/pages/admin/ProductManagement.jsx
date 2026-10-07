import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  CheckCircle,
  EyeOff,
  Flag,
  Search,
  XCircle,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import RoleNavbar from '../../components/common/RoleNavbar';
import AdminProductTable from '../../components/admin/AdminProductTable';
import StatusFilterTabs from '../../components/admin/StatusFilterTabs';

const productStatusOptions = ['All', 'Reported', 'Visible', 'Hidden', 'Rejected'];

import {
  fetchAdminProducts,
  updateAdminProductStatus,
} from '../../services/adminManagementService';

import './ProductManagement.css';

export default function ProductManagement() {
  const location = useLocation();
  const reportedProductId = new URLSearchParams(location.search).get('reported') || '';
  const reviewProductId = new URLSearchParams(location.search).get('review') || '';
  const [products, setProducts] = useState([]);
  const [activeStatus, setActiveStatus] = useState(reportedProductId ? 'Reported' : reviewProductId ? 'Hidden' : 'All');
  const [searchTerm, setSearchTerm] = useState(reportedProductId || reviewProductId);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);

      const productList = await fetchAdminProducts();

      if (mounted) {
        setProducts(productList);
        setLoading(false);
      }
    }

    loadProducts();

    return () => {
      mounted = false;
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

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesStatus = activeStatus === 'All' ||
        (activeStatus === 'Reported'
          ? product.pendingReportCount > 0 && product.status !== 'Hidden'
          : product.status === activeStatus);

      const matchesCategory =
        category === 'All' ||
        product.category === category;

      const matchesKeyword =
        !keyword ||
        product.name?.toLowerCase().includes(keyword) ||
        product.sellerName?.toLowerCase().includes(keyword) ||
        product.city?.toLowerCase().includes(keyword) ||
        product.id?.toLowerCase().includes(keyword);

      return (
        matchesStatus &&
        matchesCategory &&
        matchesKeyword
      );
    });
  }, [activeStatus, category, products, searchTerm]);

  const stats = useMemo(
    () => ({
      total: products.length,

      visible: products.filter(
        (product) => product.status === 'Visible'
      ).length,

      hidden: products.filter(
        (product) => product.status === 'Hidden'
      ).length,

      rejected: products.filter(
        (product) => product.status === 'Rejected'
      ).length,

      reported: products.filter(
        (product) => product.pendingReportCount > 0 && product.status !== 'Hidden'
      ).length,
    }),
    [products]
  );

  async function handleStatusChange(product, status, { source = 'visibility' } = {}) {
    const note = window.prompt(
      `Add admin note for ${status}:`,
      source === 'report' && status === 'Approved'
        ? 'Reported listing approved after admin review.'
        : source === 'report-hide'
          ? 'Listing hidden while the customer report is reviewed.'
        : source === 'report-info'
          ? 'Please provide more information and update the listing details for admin review.'
        : status === 'Rejected'
        ? 'Rejected after admin review.'
        : status === 'Hidden'
          ? 'Please update the listing details and request another review.'
          : product.reviewRequestNote
            ? "Approved after reviewing the seller's adjustments."
            : `Marked as ${status}.`
    );

    if (note === null) return;

    try {
      const updatedProduct = await updateAdminProductStatus(product.id, {
        status,
        adminNote: note,
        reportDecision: source === 'report',
        requestInfo: source === 'report-info',
      });
      setProducts((current) => current.map((item) => (
        item.id === product.id ? { ...item, ...updatedProduct } : item
      )));
      setNotice(source === 'report-info'
        ? `Information was requested from the seller of ${product.name}.`
        : `${product.name} has been marked as ${status} and the seller was notified.`);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to update the product status.');
    }
  }

  return (
    <>
      <RoleNavbar />

      <main className="product-management-page workspace-page">

        {/* HERO */}
        <section className="product-management-hero conmat-page-hero workspace-hero">
          <div className="workspace-hero__content">
            <span className="product-management-kicker">
              Admin Workspace
            </span>

            <h1>Product Management</h1>

            <p>
              Review seller listings, control product visibility,
              send adjustment notes, and approve corrected inventory
              before buyers see it again.
            </p>
          </div>

          <div className="product-management-hero-card workspace-hero__side">
            <Boxes />
            <strong>{stats.total}</strong>
            <span>Total Listings</span>
          </div>
        </section>

        {/* STATS */}
        <section className="product-management-stats">

          <button
            type="button"
            onClick={() => setActiveStatus('Reported')}
          >
            <Flag />
            <span>Reported</span>
            <strong>{stats.reported}</strong>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('Visible')}
          >
            <CheckCircle />
            <span>Visible</span>
            <strong>{stats.visible}</strong>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('Hidden')}
          >
            <EyeOff />
            <span>Hidden</span>
            <strong>{stats.hidden}</strong>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('Rejected')}
          >
            <XCircle />
            <span>Rejected</span>
            <strong>{stats.rejected}</strong>
          </button>

        </section>

        {/* PRODUCT MANAGEMENT */}
        <section className="product-management-panel">

          <div className="product-management-toolbar">

            <div className="product-management-search">
              <Search />

              <input
                type="search"
                placeholder="Search product, seller, city, or ID..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            <select
              className="conmat-filter-select"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              {categories.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
            </select>

          </div>

          <div className="product-management-filters">
            <StatusFilterTabs
              options={productStatusOptions}
              active={activeStatus}
              onChange={setActiveStatus}
            />
          </div>

          {notice && (
            <div className="product-management-notice">
              {notice}
            </div>
          )}

          {loading && (
            <div className="product-management-loading">
              Loading product listings...
            </div>
          )}

          <AdminProductTable
            products={filteredProducts}
            onStatusChange={handleStatusChange}
          />

        </section>
      </main>
    </>
  );
}
