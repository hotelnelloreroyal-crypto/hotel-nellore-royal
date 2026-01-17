import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { Calendar, Download, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

const Reports = () => {
  const { orders, getTopSellingItems } = useRestaurant();
  const [dateRange, setDateRange] = useState('today');

  const filterOrdersByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      
      switch (dateRange) {
        case 'today':
          return orderDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return orderDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const filteredOrders = filterOrdersByDate();
  const completedOrders = filteredOrders.filter(order => order.status === 'completed');

  const stats = {
    totalRevenue: completedOrders.reduce((sum, order) => sum + order.total, 0),
    totalOrders: completedOrders.length,
    avgOrderValue: completedOrders.length > 0 
      ? completedOrders.reduce((sum, order) => sum + order.total, 0) / completedOrders.length 
      : 0,
    totalItems: completedOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    ),
  };

  const paymentMethodStats = {
    cash: completedOrders.filter(o => o.paymentMethod === 'cash').length,
    card: completedOrders.filter(o => o.paymentMethod === 'card').length,
    upi: completedOrders.filter(o => o.paymentMethod === 'upi').length,
  };

  const topItems = getTopSellingItems(10);

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getDateRangeLabel = () => {
    const labels = {
      today: "Today's",
      week: 'This Week\'s',
      month: 'This Month\'s',
      all: 'All Time',
    };
    return labels[dateRange] || 'All Time';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Track your restaurant's performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <Button variant="outline" icon={<Download size={20} />}>
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="elevated" className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-100 font-medium">Total Revenue</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats.totalRevenue)}</h3>
              <p className="text-sm text-green-100 mt-2">{getDateRangeLabel()} sales</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 font-medium">Total Orders</p>
              <h3 className="text-3xl font-bold mt-2">{stats.totalOrders}</h3>
              <p className="text-sm text-blue-100 mt-2">Completed orders</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ShoppingBag size={24} />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-100 font-medium">Avg Order Value</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(stats.avgOrderValue)}</h3>
              <p className="text-sm text-purple-100 mt-2">Per order</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-100 font-medium">Items Sold</p>
              <h3 className="text-3xl font-bold mt-2">{stats.totalItems}</h3>
              <p className="text-sm text-orange-100 mt-2">Total quantity</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar size={24} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card variant="elevated">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Selling Items</h2>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No sales data available</p>
            ) : (
              topItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500' :
                    'bg-gradient-to-br from-blue-400 to-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="text-2xl">{item.image}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.totalQuantity} sold • {formatCurrency(item.totalRevenue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp size={16} />
                      <span className="text-sm font-semibold">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Payment Methods */}
        <Card variant="elevated">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Methods</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Cash</span>
                <span className="font-semibold text-gray-900">
                  {paymentMethodStats.cash} orders ({stats.totalOrders > 0 ? ((paymentMethodStats.cash / stats.totalOrders) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${stats.totalOrders > 0 ? (paymentMethodStats.cash / stats.totalOrders) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Card</span>
                <span className="font-semibold text-gray-900">
                  {paymentMethodStats.card} orders ({stats.totalOrders > 0 ? ((paymentMethodStats.card / stats.totalOrders) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${stats.totalOrders > 0 ? (paymentMethodStats.card / stats.totalOrders) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">UPI</span>
                <span className="font-semibold text-gray-900">
                  {paymentMethodStats.upi} orders ({stats.totalOrders > 0 ? ((paymentMethodStats.upi / stats.totalOrders) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all"
                  style={{ width: `${stats.totalOrders > 0 ? (paymentMethodStats.upi / stats.totalOrders) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Revenue Chart Placeholder */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Revenue Trend</h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">Chart visualization would appear here</p>
              <p className="text-sm text-gray-400 mt-1">Integration with charting library needed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Completed Orders */}
      <Card variant="elevated">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Completed Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Table</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Items</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {completedOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold text-gray-900">#{order.id}</td>
                  <td className="py-3 px-4 text-gray-700">Table {order.tableId}</td>
                  <td className="py-3 px-4 text-gray-700">{order.items.length} items</td>
                  <td className="py-3 px-4">
                    <span className="capitalize text-gray-700">{order.paymentMethod}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {new Date(order.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {completedOrders.length === 0 && (
            <p className="text-center text-gray-500 py-8">No completed orders</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Reports;
