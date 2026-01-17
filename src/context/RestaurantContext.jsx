import React, { createContext, useContext, useState, useEffect } from 'react';
import { categories as initialCategories, menuItems as initialMenuItems, tables as initialTables, initialOrders, completedOrders } from '../data/sampleData';

const RestaurantContext = createContext();

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within RestaurantProvider');
  }
  return context;
};

export const RestaurantProvider = ({ children }) => {
  const [categories, setCategories] = useState(initialCategories);
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [tables, setTables] = useState(initialTables);
  const [orders, setOrders] = useState([...initialOrders, ...completedOrders]);
  const [nextOrderId, setNextOrderId] = useState(6);

  // Category operations
  const addCategory = (category) => {
    const newCategory = { ...category, id: Date.now() };
    setCategories([...categories, newCategory]);
    return newCategory;
  };

  const updateCategory = (id, updates) => {
    setCategories(categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat));
  };

  const deleteCategory = (id) => {
    setCategories(categories.filter(cat => cat.id !== id));
    // Also delete associated menu items
    setMenuItems(menuItems.filter(item => item.categoryId !== id));
  };

  // Menu item operations
  const addMenuItem = (item) => {
    const newItem = { ...item, id: Date.now() };
    setMenuItems([...menuItems, newItem]);
    return newItem;
  };

  const updateMenuItem = (id, updates) => {
    setMenuItems(menuItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteMenuItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  // Order operations
  const createOrder = (orderData) => {
    const newOrder = {
      ...orderData,
      id: nextOrderId,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    setOrders([...orders, newOrder]);
    setNextOrderId(nextOrderId + 1);

    // Update table status
    if (orderData.tableId) {
      setTables(tables.map(table => 
        table.id === orderData.tableId 
          ? { ...table, status: 'occupied', currentOrder: newOrder.id }
          : table
      ));
    }

    return newOrder;
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));

    // If order is completed, free up the table
    if (newStatus === 'completed') {
      const order = orders.find(o => o.id === orderId);
      if (order && order.tableId) {
        setTables(tables.map(table => 
          table.id === order.tableId 
            ? { ...table, status: 'available', currentOrder: null }
            : table
        ));
      }
    }
  };

  const deleteOrder = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.tableId) {
      setTables(tables.map(table => 
        table.id === order.tableId 
          ? { ...table, status: 'available', currentOrder: null }
          : table
      ));
    }
    setOrders(orders.filter(order => order.id !== orderId));
  };

  // Table operations
  const updateTableStatus = (tableId, status) => {
    setTables(tables.map(table => 
      table.id === tableId ? { ...table, status } : table
    ));
  };

  // Analytics
  const getTodayStats = () => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
      new Date(order.timestamp).toDateString() === today
    );

    const completedToday = todayOrders.filter(order => order.status === 'completed');
    const totalSales = completedToday.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = completedToday.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      pendingOrders: todayOrders.filter(o => o.status === 'pending').length,
      preparingOrders: todayOrders.filter(o => o.status === 'preparing').length,
    };
  };

  const getTopSellingItems = (limit = 5) => {
    const itemSales = {};
    
    orders.forEach(order => {
      if (order.status === 'completed') {
        order.items.forEach(item => {
          if (!itemSales[item.id]) {
            itemSales[item.id] = { ...item, totalQuantity: 0, totalRevenue: 0 };
          }
          itemSales[item.id].totalQuantity += item.quantity;
          itemSales[item.id].totalRevenue += item.price * item.quantity;
        });
      }
    });

    return Object.values(itemSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  };

  const value = {
    // State
    categories,
    menuItems,
    tables,
    orders,
    
    // Category operations
    addCategory,
    updateCategory,
    deleteCategory,
    
    // Menu operations
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    
    // Order operations
    createOrder,
    updateOrderStatus,
    deleteOrder,
    
    // Table operations
    updateTableStatus,
    
    // Analytics
    getTodayStats,
    getTopSellingItems,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};
