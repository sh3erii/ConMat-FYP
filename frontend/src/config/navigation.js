import {
  BarChart3,
  FileText,
  Gavel,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Users,
} from 'lucide-react';

export const normalizeRole = (role) => String(role || '').trim().toLowerCase();
export const getUserRole = (user) => normalizeRole(user?.role || user?.userRole || user?.user_role);

export const dashboardRoutes = {
  admin: '/admin/dashboard',
  supplier: '/supplier/dashboard',
  wholesaler: '/wholesaler/dashboard',
  retailer: '/retailer/dashboard',
  customer: '/customer/dashboard',
};

export const getDashboardRoute = (role) => dashboardRoutes[normalizeRole(role)] || '/';

export const bulkRequesterRoles = ['customer', 'retailer', 'wholesaler'];
export const productSellerRoles = ['supplier', 'retailer', 'wholesaler'];
export const buyerRoles = ['customer', 'retailer', 'wholesaler'];

export const isUserVerified = (user) => {
  if (!user) return false;
  if (user.isVerified === true || user.is_verified === true || user.verified === true) return true;

  const status = String(
    user.verificationStatus ||
    user.verification_status ||
    user.approvalStatus ||
    user.approval_status ||
    user.sellerStatus ||
    user.seller_status ||
    ''
  ).trim().toLowerCase();

  return ['approved', 'verified', 'active'].includes(status);
};

const commonBuyerLinks = [
  { name: 'Marketplace', path: '/marketplace', icon: Store },
  { name: 'Cart', path: '/cart', icon: ShoppingCart, showCartCount: true },
  { name: 'Orders', path: '/orders', icon: Truck },
  { name: 'Invoices', path: '/invoices', icon: FileText },
];

const bidsLink = { name: 'Bids', path: '/bids', icon: Gavel };

export const getRoleNavigation = (user) => {
  const role = getUserRole(user);

  switch (role) {
    case 'admin':
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Marketplace', path: '/marketplace', icon: Store },
        { name: 'Users', path: '/admin/users', icon: Users },
        { name: 'Verification', path: '/admin/seller-verification', icon: ShieldCheck },
        { name: 'Products', path: '/admin/products', icon: Package },
        { name: 'Orders', path: '/admin/orders', icon: Truck },
        { name: 'Bids', path: '/admin/bids', icon: Gavel },
        { name: 'Reports', path: '/admin/reports', icon: ReceiptText },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      ];

    case 'supplier':
      return [
        { name: 'Dashboard', path: '/supplier/dashboard', icon: LayoutDashboard },
        { name: 'Marketplace', path: '/marketplace', icon: Store },
        { name: 'Products', path: '/manage-products', icon: Package },
        { name: 'Incoming Orders', path: '/supplier/incoming-orders', icon: Truck },
        bidsLink,
        { name: 'Analytics', path: '/supplier/analytics', icon: BarChart3 },
      ];

    case 'wholesaler':
      return [
        { name: 'Dashboard', path: '/wholesaler/dashboard', icon: LayoutDashboard },
        ...commonBuyerLinks,
        { name: 'Products', path: '/manage-products', icon: Package },
        bidsLink,
      ];

    case 'retailer':
      return [
        { name: 'Dashboard', path: '/retailer/dashboard', icon: LayoutDashboard },
        ...commonBuyerLinks,
        { name: 'Products', path: '/manage-products', icon: Package },
        bidsLink,
      ];

    case 'customer':
      return [
        { name: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
        ...commonBuyerLinks,
        bidsLink,
      ];

    default:
      return [];
  }
};

/** Always begin a newly authenticated session on the user's role dashboard. */
export const getPostLoginRoute = (user) => getDashboardRoute(getUserRole(user));
