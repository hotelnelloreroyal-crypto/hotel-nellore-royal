import React, { useState } from 'react';
import { RestaurantProvider } from './context/RestaurantContext';
import { AuthProvider } from './context/AuthContext';
import { PWAProvider } from './context/PWAContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import ProtectedRoute from './components/ProtectedRoute';
import UpdatePrompt from './components/PWA/UpdatePrompt';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BillingPage from './pages/BillingPage';
import MenuPage from './pages/MenuPage';
import TablesPage from './pages/TablesPage';
import Orders from './pages/Orders';
import Investment from './pages/Investment';
import Payroll from './pages/Payroll';
import Staff from './pages/Staff';

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <PWAProvider>
      <AuthProvider>
        <RestaurantProvider>
          <Router>
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 1500,
              style: {
                background: '#fff',
                color: '#333',
              },
              success: {
                iconTheme: {
                  primary: '#ec2b25',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            {/* Public Route - Login */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route 
                        path="/" 
                        element={
                          <ProtectedRoute menuValue="dashboard">
                            <Dashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/billing" 
                        element={
                          <ProtectedRoute menuValue="billing">
                            <BillingPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/menu" 
                        element={
                          <ProtectedRoute menuValue="menu">
                            <MenuPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/tables" 
                        element={
                          <ProtectedRoute menuValue="tables">
                            <TablesPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/orders" 
                        element={
                          <ProtectedRoute menuValue="orders">
                            <Orders />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/investment" 
                        element={
                          <ProtectedRoute menuValue="investment">
                            <Investment />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/payroll" 
                        element={
                          <ProtectedRoute menuValue="payroll">
                            <Payroll />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/staff" 
                        element={
                          <ProtectedRoute menuValue="staff">
                            <Staff />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute menuValue="settings">
                            <div>Settings Page - Coming Soon</div>
                          </ProtectedRoute>
                        } 
                      />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
          <UpdatePrompt />
        </Router>
      </RestaurantProvider>
    </AuthProvider>
  </PWAProvider>
  );
};

export default App;