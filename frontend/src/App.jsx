import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import RegisterPage from './pages/RegisterPage';
import DashboardRedirect from './pages/DashboardRedirect';
import Marketplace from './pages/Marketplace';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import FAQPage from './pages/FAQPage';
import CartPage from './pages/CartPage';
import NotFoundPage from './pages/NotFoundPage';

import SupplierDashboard from './pages/supplier/SupplierDashboard';
import ManageProducts from './pages/supplier/ManageProducts';
import IncomingOrders from './pages/supplier/IncomingOrders';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerInvoicesPage from './pages/customer/CustomerInvoicesPage';

import CheckoutPage from './pages/orders/CheckoutPage';
import OrderHistory from './pages/orders/OrderHistory';
import OrderDetail from './pages/orders/OrderDetail';
import OrderTracking from './pages/orders/OrderTracking';

import WholesalerDashboard from './pages/wholesaler/WholesalerDashboard';
import RetailerDashboard from './pages/retailer/RetailerDashboard';

import BidsWorkspace from './pages/bids/BidsWorkspace';
import BidComparison from './pages/bids/BidComparison';
import BidParticipationDenied from './pages/bids/BidParticipationDenied';

import AdminDashboard from './pages/admin/AdminDashboard';
import SellerVerification from './pages/admin/SellerVerification';
import UserManagement from './pages/admin/UserManagement';
import AdminReports from './pages/admin/AdminReports';
import ProductManagement from './pages/admin/ProductManagement';
import OrderManagement from './pages/admin/OrderManagement';
import AdminBids from './pages/admin/AdminBids';

import ProfilePage from './pages/account/ProfilePage';
import SellerProfile from './pages/account/SellerProfile';
import SettingPage from './pages/account/SettingPage';
import NotificationsPage from './pages/notification/NotificationsPage';

import PaymentCheckout from './pages/payments/PaymentCheckout';
import PaymentSuccess from './pages/payments/PaymentSuccess';
import PaymentFailed from './pages/payments/PaymentFailed';
import InvoiceViewer from './pages/invoices/InvoiceViewer';

import ProtectedRoute from './components/common/ProtectedRoute';
import PublicFooter from './components/common/PublicFooter';
import RouteEffects from './components/common/RouteEffects';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import './App.css';
import './styles/responsive.css';
import './styles/hero-actions.css';
import './styles/workspace-heroes.css';

const guard = (element, allowedRoles = [], requireVerifiedForRoles = []) => (
  <ProtectedRoute
    allowedRoles={allowedRoles}
    requireVerifiedForRoles={requireVerifiedForRoles}
  >
    {element}
  </ProtectedRoute>
);

const rolePage = (element, allowedRoles = [], requireVerifiedForRoles = []) => guard(
  <>
    {element}
    <PublicFooter />
  </>,
  allowedRoles,
  requireVerifiedForRoles
);

const requesters = ['Customer', 'Retailer', 'Wholesaler'];
const buyers = ['Customer', 'Retailer', 'Wholesaler'];
const productSellers = ['Supplier', 'Retailer', 'Wholesaler'];
const bidUsers = ['Customer', 'Retailer', 'Wholesaler', 'Supplier'];

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <RouteEffects />

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/faq" element={<FAQPage />} />

            <Route path="/dashboard" element={guard(<DashboardRedirect />)} />
            <Route path="/cart" element={guard(<CartPage />, buyers)} />

            <Route path="/manage-products" element={rolePage(<ManageProducts />, productSellers, ['Supplier'])} />
            <Route path="/supplier/products" element={<Navigate to="/manage-products" replace />} />

            <Route path="/orders" element={rolePage(<OrderHistory />, buyers)} />
            <Route path="/orders/:orderId" element={guard(<OrderDetail />, buyers)} />
            <Route path="/orders/tracking" element={guard(<OrderTracking />, buyers)} />
            <Route path="/orders/:orderId/tracking" element={guard(<OrderTracking />, buyers)} />
            <Route path="/checkout" element={guard(<CheckoutPage />, buyers)} />

            <Route path="/invoices" element={rolePage(<CustomerInvoicesPage />, buyers)} />
            <Route path="/customer/invoices" element={<Navigate to="/invoices" replace />} />
            <Route path="/invoices/:invoiceId" element={guard(<InvoiceViewer />, buyers)} />

            <Route path="/bids" element={rolePage(<BidsWorkspace />, bidUsers)} />
            <Route path="/bulk-request" element={<Navigate to="/bids?view=create" replace />} />
            <Route path="/bulk-order-request" element={<Navigate to="/bids?view=create" replace />} />
            <Route path="/bidding" element={<Navigate to="/bids" replace />} />
            <Route path="/bids/my-requests" element={<Navigate to="/bids?view=requests" replace />} />
            <Route path="/bids/opportunities" element={<Navigate to="/bids?view=opportunities" replace />} />
            <Route path="/customer/bids" element={<Navigate to="/bids?view=requests" replace />} />
            <Route path="/retailer/bids" element={<Navigate to="/bids?view=requests" replace />} />
            <Route path="/wholesaler/bids" element={<Navigate to="/bids?view=requests" replace />} />
            <Route path="/supplier/bids" element={<Navigate to="/bids?view=opportunities" replace />} />

            <Route path="/bids/participation-not-allowed" element={rolePage(<BidParticipationDenied />, ['Retailer'])} />
            <Route path="/bids/compare/:requestId" element={rolePage(<BidComparison />, requesters)} />
            <Route path="/bids/compare" element={<Navigate to="/bids?view=requests" replace />} />

            <Route path="/supplier/dashboard" element={rolePage(<SupplierDashboard />, ['Supplier'])} />
            <Route path="/supplier" element={<Navigate to="/supplier/dashboard" replace />} />
            <Route path="/supplier/incoming-orders" element={rolePage(<IncomingOrders />, ['Supplier', 'Retailer', 'Wholesaler'])} />
            <Route path="/supplier/orders" element={<Navigate to="/supplier/incoming-orders" replace />} />
    

            <Route path="/customer/dashboard" element={rolePage(<CustomerDashboard />, ['Customer'])} />
            <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />

            <Route path="/retailer/dashboard" element={rolePage(<RetailerDashboard />, ['Retailer'])} />
            <Route path="/retailer" element={<Navigate to="/retailer/dashboard" replace />} />

            <Route path="/wholesaler/dashboard" element={rolePage(<WholesalerDashboard />, ['Wholesaler'])} />
            <Route path="/wholesaler" element={<Navigate to="/wholesaler/dashboard" replace />} />

            <Route path="/admin/dashboard" element={rolePage(<AdminDashboard />, ['Admin'])} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/seller-verification" element={rolePage(<SellerVerification />, ['Admin'])} />
            <Route path="/admin/users" element={rolePage(<UserManagement />, ['Admin'])} />
            <Route path="/admin/reports" element={rolePage(<AdminReports />, ['Admin'])} />
            <Route path="/admin/products" element={rolePage(<ProductManagement />, ['Admin'])} />
            <Route path="/admin/orders" element={rolePage(<OrderManagement />, ['Admin'])} />
            <Route path="/admin/bids" element={rolePage(<AdminBids />, ['Admin'])} />
          

            {/* Account */}
            <Route path="/account/profile" element={rolePage(<ProfilePage />)} />

            {/* Public seller profile */}
            <Route path="/seller/:sellerId" element={<SellerProfile />} />

            <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
            <Route path="/account/settings" element={rolePage(<SettingPage />)} />
            <Route path="/settings" element={<Navigate to="/account/settings" replace />} />
            <Route path="/notifications" element={rolePage(<NotificationsPage />)} />
            <Route path="/notifications/:notificationId" element={<Navigate to="/notifications" replace />} />
            <Route path="/notification" element={<Navigate to="/notifications" replace />} />

            <Route path="/payments/checkout/:orderId" element={guard(<PaymentCheckout />, buyers)} />
            <Route path="/payment-success" element={guard(<PaymentSuccess />, buyers)} />
            <Route path="/payment-failed" element={guard(<PaymentFailed />, buyers)} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
