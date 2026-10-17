import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute } from '../config/navigation';

export default function DashboardRedirect() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <Navigate
      to={getDashboardRoute(user?.role)}
      replace
      state={location.state}
    />
  );
}
