import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RESTAURANT_NAME, MENU_ITEMS } from '../data/menuData';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    setLoading(true);
    try {
      const staffData = await login(email, password);
      
      // If admin, redirect to dashboard
      if (staffData?.isAdmin === true) {
        navigate('/');
        return;
      }
      
      // For non-admin, redirect to first accessible page in their access array
      if (staffData?.access && staffData.access.length > 0) {
        const firstAccessibleItem = MENU_ITEMS.find(item => staffData.access.includes(item.value));
        if (firstAccessibleItem) {
          navigate(firstAccessibleItem.path);
        } else {
          // If no matching menu item found, show error
          toast.error('No accessible pages found');
        }
      } else {
        // If access array is empty and not admin, show error
        toast.error('No access permissions assigned');
      }
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-[#ec2b25] mb-4">
            <LogIn className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{RESTAURANT_NAME}</h1>
          <p className="text-gray-600">Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border-2 border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Login</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] transition-colors"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25] transition-colors pr-12"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ec2b25] text-white py-3 font-semibold hover:bg-[#d12620] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2026 {RESTAURANT_NAME}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
