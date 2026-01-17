export const MENU_ITEMS = [
  { label: 'Dashboard', value: 'dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Billing', value: 'billing', path: '/billing', icon: 'FileText' },
  { label: 'Menu', value: 'menu', path: '/menu', icon: 'UtensilsCrossed' },
  { label: 'Tables', value: 'tables', path: '/tables', icon: 'Grid3x3' },
  { label: 'Orders', value: 'orders', path: '/orders', icon: 'ChefHat' },
  { label: 'Investment', value: 'investment', path: '/investment', icon: 'Package' },
  { label: 'Payroll', value: 'payroll', path: '/payroll', icon: 'Wallet' },
  { label: 'Staff', value: 'staff', path: '/staff', icon: 'Users' }
];

// Restaurant details from environment variables
export const RESTAURANT_NAME = import.meta.env.VITE_RESTAURANT_NAME || 'HR FOOD COURT';
export const SUPPORT_PHONE = import.meta.env.VITE_RESTAURANT_MOBILE || '+91 9966850426';
export const RESTAURANT_ADDRESS = import.meta.env.VITE_RESTAURANT_ADDRESS || '';
export const RESTAURANT_GST = import.meta.env.VITE_RESTAURANT_GST || '';
