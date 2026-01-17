import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';
import { Users } from 'lucide-react';

const Tables = () => {
  const { tables, orders } = useRestaurant();

  const getTableOrder = (tableId) => {
    return orders.find(order => order.tableId === tableId && order.status !== 'completed');
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 border-green-300 hover:border-green-400',
      occupied: 'bg-red-100 border-red-300 hover:border-red-400',
      reserved: 'bg-orange-100 border-orange-300 hover:border-orange-400',
    };
    return colors[status] || colors.available;
  };

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Table Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage restaurant tables</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="elevated">
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">Total Tables</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
        </Card>
        <Card variant="elevated">
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">Available</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.available}</p>
          </div>
        </Card>
        <Card variant="elevated">
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">Occupied</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.occupied}</p>
          </div>
        </Card>
        <Card variant="elevated">
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">Reserved</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.reserved}</p>
          </div>
        </Card>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((table) => {
          const order = getTableOrder(table.id);
          return (
            <div
              key={table.id}
              className={`border-2 rounded-xl p-6 transition-all cursor-pointer ${getStatusColor(table.status)}`}
            >
              <div className="text-center">
                {/* Table Number */}
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-md mb-3">
                  <span className="text-2xl font-bold text-gray-900">{table.number}</span>
                </div>

                {/* Table Info */}
                <h3 className="font-bold text-gray-900 mb-2">Table {table.number}</h3>
                
                <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-3">
                  <Users size={16} />
                  <span>{table.capacity} seats</span>
                </div>

                {/* Status Badge */}
                <Badge variant={table.status} className="mb-3">
                  {table.status}
                </Badge>

                {/* Order Info */}
                {order && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-xs text-gray-600 mb-1">Order #{order.id}</p>
                    <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-gray-600 mt-1">{order.items.length} items</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <Card variant="elevated">
        <h3 className="font-bold text-gray-900 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className="text-sm text-gray-700">Available - Ready for customers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span className="text-sm text-gray-700">Occupied - Currently serving</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
            <span className="text-sm text-gray-700">Reserved - Booking confirmed</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Tables;
