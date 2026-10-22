import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { homePathForRole, useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { needsRegistration } from '../config/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  /** The registration page itself: members who are not approved yet may open it. */
  allowUnapproved?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, allowUnapproved = false }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gym-bg text-gym-primary font-heading text-2xl uppercase tracking-widest">
        Loading Portal...
      </div>
    );
  }

  // No signed-in user (or no profile row for them): send to login and come back afterwards.
  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Signed in but not allowed here (e.g. a member opening /admin): send to their own area.
    if (profile.role === 'visitor') return <Navigate to="/" replace />;
    return <Navigate to={homePathForRole(profile.role)} replace />;
  }

  // New members see only the registration / waiting page until the owner approves them.
  if (!allowUnapproved && needsRegistration(profile)) {
    return <Navigate to="/register" replace />;
  }

  return <>{children}</>;
};
