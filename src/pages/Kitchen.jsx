import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import { Clock, ChefHat } from 'lucide-react';

const Kitchen = () => {
  const { orders, updateOrderStatus, tables } = useRestaurant();

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');

  const getTableNumber = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    return table ? table.number : tableId;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 1000 / 60);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeColor = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 1000 / 60);
    
    if (diffMinutes < 10) return 'text-green-600';
    if (diffMinutes < 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const OrderCard = ({ order, onStatusChange }) => (
    <Card variant="elevated" className="hover:shadow-xl transition-shadow">
      {/* Order Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Order #{order.id}</h3>
          <p className="text-sm text-gray-600">Table {getTableNumber(order.tableId)}</p>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-sm font-semibold ${getTimeColor(order.timestamp)}`}>
            <Clock size={16} />
            {formatTime(order.timestamp)}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-2 mb-4">
        {order.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center text-white font-bold flex-shrink-0">
              {item.quantity}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-600">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      {order.status === 'pending' && (
        <Button
          variant="primary"
          size="md"
          onClick={() => onStatusChange(order.id, 'preparing')}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          Start Preparing
        </Button>
      )}
      {order.status === 'preparing' && (
        <Button
          variant="success"
          size="md"
          onClick={() => onStatusChange(order.id, 'ready')}
          className="w-full"
        >
          Mark as Ready
        </Button>
      )}
      {order.status === 'ready' && (
        <Button
          variant="secondary"
          size="md"
          onClick={() => onStatusChange(order.id, 'completed')}
          className="w-full"
        >
          Complete Order
        </Button>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
          <ChefHat className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kitchen Display</h1>
          <p className="text-gray-600">Manage order preparation workflow</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="elevated" className="bg-yellow-50 border-yellow-200">
          <div className="text-center">
            <p className="text-sm text-yellow-800 font-medium">Pending</p>
            <p className="text-4xl font-bold text-yellow-600 mt-2">{pendingOrders.length}</p>
          </div>
        </Card>
        <Card variant="elevated" className="bg-blue-50 border-blue-200">
          <div className="text-center">
            <p className="text-sm text-blue-800 font-medium">Preparing</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">{preparingOrders.length}</p>
          </div>
        </Card>
        <Card variant="elevated" className="bg-green-50 border-green-200">
          <div className="text-center">
            <p className="text-sm text-green-800 font-medium">Ready</p>
            <p className="text-4xl font-bold text-green-600 mt-2">{readyOrders.length}</p>
          </div>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-gray-900">Pending</h2>
            <Badge variant="pending">{pendingOrders.length}</Badge>
          </div>
          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <Card variant="outlined" className="text-center py-8 text-gray-500">
                No pending orders
              </Card>
            ) : (
              pendingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                />
              ))
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-gray-900">Preparing</h2>
            <Badge variant="preparing">{preparingOrders.length}</Badge>
          </div>
          <div className="space-y-3">
            {preparingOrders.length === 0 ? (
              <Card variant="outlined" className="text-center py-8 text-gray-500">
                No orders in preparation
              </Card>
            ) : (
              preparingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                />
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-gray-900">Ready</h2>
            <Badge variant="ready">{readyOrders.length}</Badge>
          </div>
          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <Card variant="outlined" className="text-center py-8 text-gray-500">
                No orders ready
              </Card>
            ) : (
              readyOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateOrderStatus}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kitchen;
