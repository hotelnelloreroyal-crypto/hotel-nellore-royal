// Sample data for the restaurant management system

export const categories = [
  { id: 1, name: 'Starters', icon: '🥗', color: '#FF6B6B' },
  { id: 2, name: 'Main Course', icon: '🍛', color: '#4ECDC4' },
  { id: 3, name: 'Breads', icon: '🍞', color: '#FFE66D' },
  { id: 4, name: 'Beverages', icon: '🥤', color: '#95E1D3' },
  { id: 5, name: 'Desserts', icon: '🍰', color: '#F38181' },
];

export const menuItems = [
  // Starters
  { id: 1, categoryId: 1, name: 'Paneer Tikka', price: 250, image: '🧀', available: true, description: 'Grilled cottage cheese with spices' },
  { id: 2, categoryId: 1, name: 'Veg Spring Roll', price: 180, image: '🥟', available: true, description: 'Crispy vegetable rolls' },
  { id: 3, categoryId: 1, name: 'Chicken Wings', price: 320, image: '🍗', available: true, description: 'Spicy chicken wings' },
  { id: 4, categoryId: 1, name: 'French Fries', price: 120, image: '🍟', available: true, description: 'Crispy golden fries' },
  
  // Main Course
  { id: 5, categoryId: 2, name: 'Butter Chicken', price: 380, image: '🍗', available: true, description: 'Creamy tomato-based curry' },
  { id: 6, categoryId: 2, name: 'Paneer Butter Masala', price: 320, image: '🧀', available: true, description: 'Rich cottage cheese curry' },
  { id: 7, categoryId: 2, name: 'Dal Makhani', price: 280, image: '🍲', available: true, description: 'Creamy black lentils' },
  { id: 8, categoryId: 2, name: 'Veg Biryani', price: 250, image: '🍚', available: true, description: 'Aromatic rice with vegetables' },
  { id: 9, categoryId: 2, name: 'Chicken Biryani', price: 350, image: '🍚', available: true, description: 'Aromatic rice with chicken' },
  
  // Breads
  { id: 10, categoryId: 3, name: 'Butter Naan', price: 50, image: '🫓', available: true, description: 'Soft leavened bread' },
  { id: 11, categoryId: 3, name: 'Garlic Naan', price: 60, image: '🫓', available: true, description: 'Naan with garlic' },
  { id: 12, categoryId: 3, name: 'Tandoori Roti', price: 30, image: '🫓', available: true, description: 'Whole wheat bread' },
  { id: 13, categoryId: 3, name: 'Laccha Paratha', price: 70, image: '🫓', available: true, description: 'Layered flatbread' },
  
  // Beverages
  { id: 14, categoryId: 4, name: 'Mango Lassi', price: 80, image: '🥤', available: true, description: 'Sweet yogurt drink' },
  { id: 15, categoryId: 4, name: 'Fresh Lime Soda', price: 60, image: '🍋', available: true, description: 'Refreshing lime drink' },
  { id: 16, categoryId: 4, name: 'Masala Chai', price: 40, image: '☕', available: true, description: 'Spiced tea' },
  { id: 17, categoryId: 4, name: 'Cold Coffee', price: 100, image: '☕', available: true, description: 'Chilled coffee' },
  
  // Desserts
  { id: 18, categoryId: 5, name: 'Gulab Jamun', price: 80, image: '🍡', available: true, description: 'Sweet milk dumplings' },
  { id: 19, categoryId: 5, name: 'Ice Cream', price: 90, image: '🍨', available: true, description: 'Assorted flavors' },
  { id: 20, categoryId: 5, name: 'Rasmalai', price: 100, image: '🍮', available: true, description: 'Cottage cheese in cream' },
];

export const tables = [
  { id: 1, number: 1, capacity: 2, status: 'available', currentOrder: null },
  { id: 2, number: 2, capacity: 4, status: 'occupied', currentOrder: 1 },
  { id: 3, number: 3, capacity: 4, status: 'available', currentOrder: null },
  { id: 4, number: 4, capacity: 6, status: 'occupied', currentOrder: 2 },
  { id: 5, number: 5, capacity: 2, status: 'available', currentOrder: null },
  { id: 6, number: 6, capacity: 4, status: 'reserved', currentOrder: null },
  { id: 7, number: 7, capacity: 8, status: 'available', currentOrder: null },
  { id: 8, number: 8, capacity: 2, status: 'occupied', currentOrder: 3 },
  { id: 9, number: 9, capacity: 4, status: 'available', currentOrder: null },
  { id: 10, number: 10, capacity: 6, status: 'available', currentOrder: null },
];

export const initialOrders = [
  {
    id: 1,
    tableId: 2,
    items: [
      { id: 5, name: 'Butter Chicken', price: 380, quantity: 2 },
      { id: 10, name: 'Butter Naan', price: 50, quantity: 4 },
      { id: 14, name: 'Mango Lassi', price: 80, quantity: 2 },
    ],
    status: 'preparing',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    subtotal: 1020,
    tax: 102,
    total: 1122,
    paymentMethod: 'cash',
  },
  {
    id: 2,
    tableId: 4,
    items: [
      { id: 8, name: 'Veg Biryani', price: 250, quantity: 3 },
      { id: 6, name: 'Paneer Butter Masala', price: 320, quantity: 1 },
      { id: 15, name: 'Fresh Lime Soda', price: 60, quantity: 3 },
    ],
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    subtotal: 1250,
    tax: 125,
    total: 1375,
    paymentMethod: 'card',
  },
  {
    id: 3,
    tableId: 8,
    items: [
      { id: 1, name: 'Paneer Tikka', price: 250, quantity: 1 },
      { id: 9, name: 'Chicken Biryani', price: 350, quantity: 1 },
      { id: 11, name: 'Garlic Naan', price: 60, quantity: 2 },
      { id: 17, name: 'Cold Coffee', price: 100, quantity: 2 },
    ],
    status: 'ready',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    subtotal: 920,
    tax: 92,
    total: 1012,
    paymentMethod: 'upi',
  },
];

export const completedOrders = [
  {
    id: 4,
    tableId: 1,
    items: [
      { id: 2, name: 'Veg Spring Roll', price: 180, quantity: 2 },
      { id: 16, name: 'Masala Chai', price: 40, quantity: 2 },
    ],
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    subtotal: 440,
    tax: 44,
    total: 484,
    paymentMethod: 'cash',
  },
  {
    id: 5,
    tableId: 3,
    items: [
      { id: 7, name: 'Dal Makhani', price: 280, quantity: 2 },
      { id: 12, name: 'Tandoori Roti', price: 30, quantity: 6 },
      { id: 18, name: 'Gulab Jamun', price: 80, quantity: 2 },
    ],
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    subtotal: 900,
    tax: 90,
    total: 990,
    paymentMethod: 'card',
  },
];
