import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  const getRedirectPath = () => {
    if (role === 'admin') return '/admin';
    if (role === 'user') return '/dashboard';
    return '/login';
  };

  if (!token || !role || !userId) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={getRedirectPath()} replace />;
  }
  
  return children;
};

export default ProtectedRoute;
