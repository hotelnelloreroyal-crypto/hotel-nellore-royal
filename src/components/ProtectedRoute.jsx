import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, menuValue }) => {
  const { isAuthenticated, loading, hasAccess } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ec2b25] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check access permission for specific routes
  if (menuValue) {
    if (!hasAccess(menuValue)) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="bg-white border-2 border-red-200 p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. Please contact your administrator for access.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-[#ec2b25] text-white font-semibold hover:bg-[#d12620] transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  // Render the protected content
  return children;
};

export default ProtectedRoute;
