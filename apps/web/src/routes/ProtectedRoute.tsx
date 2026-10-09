import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gym-bg text-gym-primary font-heading text-2xl uppercase tracking-widest">
        Loading Portal...
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // If trainer tries to access admin or vice versa, redirect appropriately
    if (profile.role === 'member') return <Navigate to="/portal/dashboard" replace />;
    if (profile.role === 'trainer') return <Navigate to="/trainer/dashboard" replace />;
    if (['receptionist', 'manager', 'owner'].includes(profile.role)) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
