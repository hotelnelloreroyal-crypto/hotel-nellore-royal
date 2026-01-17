import React from 'react';
import Card from '../components/UI/Card';
import { Settings as SettingsIcon, User, Bell, Lock, Palette } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
          <SettingsIcon className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your restaurant settings</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Profile Settings</h3>
              <p className="text-sm text-gray-600">Manage your account information and preferences</p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Notifications</h3>
              <p className="text-sm text-gray-600">Configure notification preferences and alerts</p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock className="text-purple-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Security</h3>
              <p className="text-sm text-gray-600">Update password and security settings</p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Palette className="text-orange-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Appearance</h3>
              <p className="text-sm text-gray-600">Customize theme and display preferences</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Restaurant Info */}
      <Card variant="elevated">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Restaurant Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Restaurant Name</label>
            <input
              type="text"
              defaultValue="RestaurantPOS"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
            <textarea
              defaultValue="123 Main Street, City, State 12345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                defaultValue="+1 234 567 8900"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                defaultValue="contact@restaurant.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
