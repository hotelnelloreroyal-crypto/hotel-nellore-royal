import React from 'react';
import { Bell, User, Search, Phone, LogOut, Menu, RefreshCw } from 'lucide-react';
import { RESTAURANT_NAME, SUPPORT_PHONE } from '../../data/menuData';
import { useAuth } from '../../context/AuthContext';
import InstallButton from '../PWA/InstallButton';

const Header = ({ onMenuClick }) => {
  const { staffData, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Mobile Menu Button + Restaurant Name */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-[#ec2b25] whitespace-nowrap">{RESTAURANT_NAME}</h1>
        </div>

        {/* Search Bar - Hidden on small mobile */}
        {/* <div className="hidden sm:flex items-center flex-1 max-w-xs lg:max-w-md mx-2 md:mx-6">
          <div className="relative w-full">
            <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-7 md:pl-10 pr-2 md:pr-4 py-1.5 md:py-2 border border-gray-200 focus:outline-none focus:border-primary text-xs md:text-sm"
            />
          </div>
        </div> */}

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          {/* Support Button - Simplified on mobile */}
          <a 
            href={`tel:${SUPPORT_PHONE}`}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer"
          >
            <Phone className="w-3 md:w-4 h-3 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Support</span>
            <span className="hidden lg:inline text-sm">{SUPPORT_PHONE}</span>
          </a>

          {/* PWA Install Button */}
          <InstallButton variant="default" showStatus={true} />
          
          {/* Reload Button */}
          <button
            onClick={handleReload}
            className="p-2 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Reload App"
          >
            <RefreshCw className="w-4 md:w-5 h-4 md:h-5 text-gray-700" />
          </button>
          
          {/* Notifications - Hidden on mobile */}
          {/* <button className="hidden md:block p-2 hover:bg-gray-100 transition-colors cursor-pointer">
            <Bell className="w-4 md:w-5 h-4 md:h-5 text-gray-700" />
          </button> */}
          
          {/* User Section */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 pl-2 md:pl-3 border-l border-gray-200">
            <div className="hidden sm:flex items-center gap-1 md:gap-2">
              <User className="w-4 md:w-5 h-4 md:h-5 text-gray-700" />
              <span className="text-xs md:text-sm font-medium text-gray-700 max-w-[80px] md:max-w-none truncate">
                {staffData?.name || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 md:p-2 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 md:w-5 h-4 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
