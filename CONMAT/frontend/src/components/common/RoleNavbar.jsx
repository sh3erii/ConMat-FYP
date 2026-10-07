import { useEffect, useRef, useState } from 'react';
import { Bell, ClipboardList, FileText, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, ShoppingCart, User, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getDashboardRoute, getRoleNavigation, getUserRole } from '../../config/navigation';
import { getUnreadNotificationCount } from '../../services/notificationService';
import logo from '../../assets/logo.png';
import './RoleNavbar.css';

export default function RoleNavbar({ hideNavLinks = false, hideCart = false }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { totals } = useCart();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(() => {
    try {
      return window.localStorage.getItem('conmat:desktop-sidebar-expanded') === 'true';
    } catch {
      return false;
    }
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const headerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const role = getUserRole(user);
  const isSellerRole = ['supplier', 'retailer', 'wholesaler'].includes(role);
  const baseLinks = getRoleNavigation(user).filter((link) => (
    !/analytics/i.test(link.name || '')
  ));

  const roleFilteredLinks = role === 'supplier' ? baseLinks.filter((link) => !/order/i.test(link.name || '')) : baseLinks;

  const withSalesLink = isSellerRole
    ? [...roleFilteredLinks, { name: 'Sales', path: '/supplier/incoming-orders', icon: ClipboardList }]
    : roleFilteredLinks;

  const links = withSalesLink;
  const desktopNavLinks = links.filter((link) => !/cart|invoices/i.test(link.name || ''));
  const sidebarNavLinks = links.filter((link) => !/invoices/i.test(link.name || ''));
  const dashboardPath = getDashboardRoute(role);

  useEffect(() => {
    if (hideNavLinks) return undefined;

    const root = document.documentElement;
    root.classList.add('has-role-desktop-sidebar');

    return () => {
      root.classList.remove('has-role-desktop-sidebar', 'role-desktop-sidebar-expanded');
    };
  }, [hideNavLinks]);

  useEffect(() => {
    if (hideNavLinks) return;

    document.documentElement.classList.toggle('role-desktop-sidebar-expanded', desktopSidebarExpanded);
    try {
      window.localStorage.setItem('conmat:desktop-sidebar-expanded', String(desktopSidebarExpanded));
    } catch {
      // The sidebar still works when browser storage is unavailable.
    }
  }, [desktopSidebarExpanded, hideNavLinks]);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;

    const updateHeight = () => setHeaderHeight(node.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') setSidebarOpen(false); };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setProfileMenuOpen(false);
    };
    const handleKeyDown = (event) => { if (event.key === 'Escape') setProfileMenuOpen(false); };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const refreshUnread = () => {
      getUnreadNotificationCount()
        .then((count) => { if (active) setUnreadNotifications(count); })
        .catch(() => { if (active) setUnreadNotifications(0); });
    };

    refreshUnread();
    window.addEventListener('conmat:notifications-changed', refreshUnread);
    const interval = window.setInterval(refreshUnread, 60000);
    return () => {
      active = false;
      window.removeEventListener('conmat:notifications-changed', refreshUnread);
      window.clearInterval(interval);
    };
  }, [user]);

  const handleLogout = () => {
    setSidebarOpen(false);
    setProfileMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)} Workspace` : 'ConMat Workspace';

  return (
    <>
      <header ref={headerRef} className="role-nav">
        <div className="role-nav__container">
          {!hideNavLinks && (
            <button
              type="button"
              className="role-nav__desktop-toggle d-none d-md-inline-flex"
              aria-label={desktopSidebarExpanded ? 'Collapse navigation sidebar' : 'Expand navigation sidebar'}
              aria-controls="role-desktop-sidebar"
              aria-expanded={desktopSidebarExpanded}
              title={desktopSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => setDesktopSidebarExpanded((expanded) => !expanded)}
            >
              {desktopSidebarExpanded
                ? <PanelLeftClose size={21} strokeWidth={2.2} aria-hidden="true" />
                : <PanelLeftOpen size={21} strokeWidth={2.2} aria-hidden="true" />}
            </button>
          )}

          <Link className="role-nav__brand" to={dashboardPath} aria-label="Go to dashboard">
            <span className="role-nav__logo-icon"><img src={logo} alt="ConMat" className="role-nav__logo-img" /></span>
            <span className="role-nav__logo-text">ConMat</span>
          </Link>

          <div className="role-nav__actions">
            <div className="role-nav__profile d-none d-md-inline-flex" ref={profileMenuRef}>
              <button
                type="button"
                className="role-nav__icon-action"
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
              >
                <Menu size={18} />
              </button>

              {profileMenuOpen && (
                <div className="role-nav__profile-menu" role="menu">
                  <Link to="/account/profile" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                    <User size={16} /><span>Profile</span>
                  </Link>
                  {role !== 'supplier' && (
                    <Link to="/invoices" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                      <FileText size={16} /><span>Invoices</span>
                    </Link>
                  )}
                  <Link to="/account/settings" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                    <Settings size={16} /><span>Settings</span>
                  </Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    <LogOut size={16} /><span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {!['supplier', 'admin'].includes(role) && !hideCart && (
              <Link to="/cart" className="role-nav__icon-action role-nav__cart d-none d-md-inline-flex" aria-label="Cart">
                <ShoppingCart size={18} />
                {totals.count > 0 && (
                  <span className="role-nav__cart-badge" aria-label={`${totals.count} cart items`}>{totals.count}</span>
                )}
              </Link>
            )}

            <Link to="/notifications" className="role-nav__icon-action role-nav__notifications d-none d-md-inline-flex" aria-label={`${unreadNotifications} unread notifications`}>
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="role-nav__notification-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
              )}
            </Link>

            {!hideNavLinks && (
              <button
                type="button"
                className="role-nav__burger d-inline-flex d-md-none"
                aria-label="Open navigation menu"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={22} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="role-nav__spacer" style={{ height: headerHeight }} aria-hidden="true" />

      {!hideNavLinks && (
        <aside
          id="role-desktop-sidebar"
          className={`role-desktop-sidebar ${desktopSidebarExpanded ? 'is-expanded' : ''}`}
          style={{ top: headerHeight }}
          aria-label={`${roleLabel} navigation`}
        >
          <nav className="role-desktop-sidebar__links">
            {desktopNavLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === dashboardPath || link.path === '/marketplace'}
                  title={desktopSidebarExpanded ? undefined : link.name}
                  className={({ isActive }) => `role-desktop-sidebar__link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="role-desktop-sidebar__icon" size={21} aria-hidden="true" />
                  <span className="role-desktop-sidebar__label">{link.name}</span>
                  {link.showCartCount && totals.count > 0 && (
                    <span className="role-desktop-sidebar__count" aria-label={`${totals.count} cart items`}>{totals.count}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

        </aside>
      )}

      {!hideNavLinks && (
        <>
          <button
            type="button"
            className={`role-nav__backdrop ${sidebarOpen ? 'is-open' : ''}`}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            tabIndex={sidebarOpen ? 0 : -1}
          />

          <aside className={`role-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label={`${roleLabel} mobile navigation`}>
            <div className="role-sidebar__header">
              <Link className="role-nav__brand" to={dashboardPath} onClick={() => setSidebarOpen(false)}>
                <span className="role-nav__logo-icon"><img src={logo} alt="ConMat" className="role-nav__logo-img" /></span>
                <span className="role-nav__logo-text">ConMat</span>
              </Link>
              <button type="button" className="role-sidebar__close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <div className="role-sidebar__content">
              <div className="role-sidebar__badge">
                <span>{roleLabel}</span>
              </div>

              <NavLink to="/account/profile" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `role-sidebar__link ${isActive ? 'active' : ''}`}>
                <User size={18} /><span>Profile</span>
              </NavLink>
              {role !== 'supplier' && (
                <NavLink to="/invoices" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `role-sidebar__link ${isActive ? 'active' : ''}`}>
                  <FileText size={18} /><span>Invoices</span>
                </NavLink>
              )}
              <NavLink to="/account/settings" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `role-sidebar__link ${isActive ? 'active' : ''}`}>
                <Settings size={18} /><span>Settings</span>
              </NavLink>
              <NavLink to="/notifications" onClick={() => setSidebarOpen(false)} className={({ isActive }) => `role-sidebar__link ${isActive ? 'active' : ''}`}>
                <Bell size={18} /><span>Notifications</span>
                {unreadNotifications > 0 && <span className="role-sidebar__count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
              </NavLink>

              <div className="role-sidebar__section-label">Navigation</div>
              <nav className="role-sidebar__links">
                {sidebarNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      end={link.path === dashboardPath || link.path === '/marketplace'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `role-sidebar__link ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={18} /><span>{link.name}</span>
                      {link.showCartCount && totals.count > 0 && <span className="role-sidebar__count">{totals.count}</span>}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <button type="button" className="role-sidebar__logout" onClick={handleLogout}>Logout</button>
          </aside>
        </>
      )}
    </>
  );
}
