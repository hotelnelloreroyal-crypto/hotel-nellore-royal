import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

const POS = () => {
  const { categories, menuItems, tables, createOrder } = useRestaurant();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || null);
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const filteredItems = menuItems.filter(
    (item) => item.categoryId === selectedCategory && item.available
  );

  const addToCart = (item) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(
      cart
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1; // 10% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    if (!selectedTable) {
      alert('Please select a table!');
      return;
    }

    const orderData = {
      tableId: selectedTable,
      items: cart.map(({ id, name, price, quantity }) => ({
        id,
        name,
        price,
        quantity,
      })),
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal(),
      paymentMethod,
    };

    createOrder(orderData);
    setCart([]);
    setSelectedTable(null);
    alert('Order placed successfully!');
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const availableTables = tables.filter((table) => table.status === 'available');

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 font-bold tracking-wide uppercase whitespace-nowrap transition-all border-2 ${
                selectedCategory === category.id
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-black border-black hover:bg-black hover:text-white'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                variant="elevated"
                onClick={() => addToCart(item)}
                className="cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="text-center">
                  <div className="text-5xl mb-3">{item.image}</div>
                  <h3 className="font-black text-black tracking-wide uppercase text-sm mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-lg font-black text-red-600">
                    {formatCurrency(item.price)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 flex flex-col">
        <Card variant="elevated" className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b-2 border-black">
            <ShoppingCart className="text-red-600" size={24} strokeWidth={2.5} />
            <h2 className="text-2xl font-black text-black tracking-tight uppercase">Current Order</h2>
            <Badge variant="default">{cart.length}</Badge>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border-2 border-gray-200"
                >
                  <div className="text-2xl">{item.image}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 bg-gray-200 hover:bg-black hover:text-white border-2 border-black flex items-center justify-center transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 bg-gray-200 hover:bg-black hover:text-white border-2 border-black flex items-center justify-center transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 flex items-center justify-center ml-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table Selection */}
          <div className="mb-4 pb-4 border-t border-gray-200 pt-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Table
            </label>
            <select
              value={selectedTable || ''}
              onChange={(e) => setSelectedTable(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Choose a table...</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  Table {table.number} (Capacity: {table.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div className="mb-4 pb-4 border-t border-gray-200 pt-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'card', 'upi'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`px-3 py-2 font-bold tracking-wide uppercase transition-all border-2 ${
                    paymentMethod === method
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-black border-black hover:bg-black hover:text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 mb-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (10%)</span>
              <span className="font-semibold">{formatCurrency(calculateTax())}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-orange-600">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {/* Place Order Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handlePlaceOrder}
            className="w-full"
          >
            Place Order
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default POS;
