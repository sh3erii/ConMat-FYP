import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';

import api from '../../services/api';
import getApiAssetUrl from '../../utils/getApiAssetUrl';
import ProductCard from '../../components/common/ProductCard';
import ProductDetailModal from '../../components/common/ProductDetailModal';
import ProfileSummaryCard from '../../components/account/ProfileSummaryCard';
import RoleNavbar from '../../components/common/RoleNavbar';
import PublicFooter from '../../components/common/PublicFooter';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

import './SellerProfile.css';

export default function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(Boolean(sellerId));
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sellerId) return;

    let mounted = true;

    const loadSeller = async () => {
      try {
        const { data } = await api.get(`/users/${sellerId}`);

        if (!mounted) return;

        const sellerData = data?.user || data?.seller || data;

        setSeller(sellerData);
        setProducts(data?.products || sellerData?.products || []);
      } catch {
        if (mounted) {
          setSeller(null);
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSeller();

    return () => {
      mounted = false;
    };
  }, [sellerId]);

  const handleViewProduct = (product) => setSelectedProduct(product);

  const handleAddToCart = (product, quantity = 1, pricingMode = 'retail') => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!['Customer', 'Retailer', 'Wholesaler'].includes(user.role)) {
      setMessage('Use a Customer, Retailer, or Wholesaler account to place marketplace orders.');
      return;
    }
    const sellerId = product.sellerId || product.seller?.id;
    if (sellerId && String(user.id) === String(sellerId)) {
      setMessage('This is your product. You cannot add your own listing to the cart.');
      return;
    }
    const result = addToCart(product, quantity, pricingMode);
    if (result?.ok === false) {
      setMessage(result.message);
      return;
    }
    setMessage(`${product.name} added to cart.`);
  };

  if (loading) {
    return (
      <>
        <RoleNavbar />
        <main className="seller-profile-page">
          <div className="seller-profile-container">
            <div className="seller-profile-loading">
              Loading seller profile...
            </div>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  if (!seller) {
    return (
      <>
        <RoleNavbar />
        <main className="seller-profile-page">
          <div className="seller-profile-container">
            <div className="seller-profile-empty">
              <h2>Seller not found</h2>

              <button
                type="button"
                onClick={() => navigate('/marketplace')}
              >
                Back to Marketplace
              </button>
            </div>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const businessName =
    seller.businessName ||
    seller.companyName ||
    seller.name ||
    'Business';

  const sellerLocation =
    seller.city ||
    seller.location ||
    'Location not available';

  const numericLatitude = Number(seller.latitude);
  const numericLongitude = Number(seller.longitude);
  const hasLiveLocation = seller.latitude !== null && seller.latitude !== undefined && seller.latitude !== '' &&
    seller.longitude !== null && seller.longitude !== undefined && seller.longitude !== '' &&
    Number.isFinite(numericLatitude) && numericLatitude >= -90 && numericLatitude <= 90 &&
    Number.isFinite(numericLongitude) && numericLongitude >= -180 && numericLongitude <= 180;
  const liveLocationUrl = hasLiveLocation
    ? `https://www.google.com/maps?q=${numericLatitude},${numericLongitude}`
    : '';

  const logo = getApiAssetUrl(
    seller.businessLogo ||
    seller.logo ||
    seller.logoUrl ||
    seller.profilePhoto
  );

  const phone =
    seller.phone ||
    seller.contactNumber ||
    'Not available';

  return (
    <>
      <RoleNavbar />
      <main className="seller-profile-page">
        <div className="seller-profile-container">

          {/* Seller Header */}
          <ProfileSummaryCard
            profile={{
              name: businessName,
              avatar: logo,
              city: sellerLocation,
              phone,
              liveLocationUrl,
            }}
          />

          <div className="seller-profile-actions">
            <button type="button" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
              Back
            </button>
          </div>

          {message && <div className="seller-profile-message">{message}</div>}

          {/* Products */}
          <section className="seller-profile-products">

            <div className="seller-profile-section-heading">

              <div>
                <span className="seller-profile-eyebrow">
                  Marketplace
                </span>

                <h2>Products Listed</h2>

                <p>
                  Products currently listed by this seller.
                </p>
              </div>

              <span className="seller-profile-product-count">
                <Package size={16} />
                {products.length} Products
              </span>

            </div>

            {products.length > 0 ? (
              <div className="seller-profile-product-grid">

                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pricingMode="retail"
                    onView={handleViewProduct}
                    onAddToCart={handleAddToCart}
                  />
                ))}

              </div>
            ) : (
              <div className="seller-profile-no-products">
                <Package size={32} />

                <h3>No products listed</h3>

                <p>
                  This seller has not listed any products yet.
                </p>
              </div>
            )}

          </section>

          {selectedProduct && (
            <ProductDetailModal
              product={selectedProduct}
              pricingMode="retail"
              onClose={() => setSelectedProduct(null)}
              onAddToCart={handleAddToCart}
            />
          )}

        </div>
      </main>
      <PublicFooter />
    </>
  );
}
