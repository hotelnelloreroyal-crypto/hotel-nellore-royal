import React, { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Loader2, CheckCircle, Clock, Volume2 } from 'lucide-react';
import NotifyAudio from '../assets/notification.mp3'
import { ENABLE_AGGREGATORS } from '../config/features';

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// Type options - Swiggy/Zomato only shown when ENABLE_AGGREGATORS is true
const BASE_TYPE_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Dine In', value: 'dine-in' },
  { label: 'Take Away', value: 'take-away' },
];
const AGGREGATOR_OPTIONS = [
  { label: 'Swiggy', value: 'swiggy' },
  { label: 'Zomato', value: 'zomato' },
];
const TYPE_OPTIONS = ENABLE_AGGREGATORS 
  ? [...BASE_TYPE_OPTIONS, ...AGGREGATOR_OPTIONS] 
  : BASE_TYPE_OPTIONS;

const Orders = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  // Refs to track initial load and known order IDs
  const isInitialLoad = useRef(true);
  const knownOrderIds = useRef(new Set());
  const audioRef = useRef(null);

  // Initialize audio and unlock on user interaction (for mobile)
  useEffect(() => {
    audioRef.current = new Audio(NotifyAudio);
    audioRef.current.preload = 'auto';
    audioRef.current.load();

    // Function to unlock audio on mobile
    const unlockAudio = () => {
      if (audioRef.current && !audioUnlocked) {
        // Play and immediately pause to unlock audio on mobile
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setAudioUnlocked(true);
        }).catch(() => {
          // Silently fail if autoplay is blocked
        });
      }
    };

    // Add event listeners for user interaction to unlock audio
    const events = ['touchstart', 'touchend', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, [audioUnlocked]);

  // Play notification sound function
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log('Audio play failed:', err);
        });
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Check for new orders (only after initial load)
      if (isInitialLoad.current) {
        // First load - just store all order IDs without playing sound
        data.forEach(order => knownOrderIds.current.add(order.id));
        isInitialLoad.current = false;
      } else {
        // Check if there are any new orders
        const newOrders = data.filter(order => !knownOrderIds.current.has(order.id));
        
        if (newOrders.length > 0) {
          // Play notification sound for new orders
          playNotificationSound();
          
          // Add new order IDs to known set
          newOrders.forEach(order => knownOrderIds.current.add(order.id));
        }
      }
      
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [playNotificationSound]);

  const markAsComplete = async (orderId) => {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: 'completed',
        updatedAt: new Date().toISOString()
      });
      setOrders(orders => orders.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
    } catch {}
    setUpdatingId(null);
  };

  // Filter orders client-side
  const filteredOrders = orders.filter(order => {
    const orderDate = order.createdAt?.slice(0, 10);
    const statusMatch = !status || order.status === status;
    const typeMatch = !type || order.type === type;
    const fromMatch = !fromDate || orderDate >= fromDate;
    const toMatch = !toDate || orderDate <= toDate;
    return statusMatch && typeMatch && fromMatch && toMatch;
  });

  const getOrderTypeColor = (type) => {
    switch(type) {
      case 'dine-in': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'take-away': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'swiggy': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'zomato': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getOrderTypeLabel = (type) => {
    switch(type) {
      case 'dine-in': return 'Dine In';
      case 'take-away': return 'Take Away';
      case 'swiggy': return 'Swiggy';
      case 'zomato': return 'Zomato';
      default: return type;
    }
  };

  // Calculate today's order stats
  const getOrderStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    return {
      total: todayOrders.length,
      pending: todayOrders.filter(o => o.status === 'pending').length,
      completed: todayOrders.filter(o => o.status === 'completed').length,
      cancelled: todayOrders.filter(o => o.status === 'cancelled').length,
      dineIn: todayOrders.filter(o => o.type === 'dine-in').length,
      takeAway: todayOrders.filter(o => o.type === 'take-away').length,
      swiggy: todayOrders.filter(o => o.type === 'swiggy').length,
      zomato: todayOrders.filter(o => o.type === 'zomato').length,
    };
  };

  const orderStats = getOrderStats();

  return (
    <div className="space-y-6">
      {/* Today's Order Stats */}
      <div className="bg-white border border-gray-200 p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-bold text-gray-900">Today's Order Summary</h2>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
          <div className="bg-gray-50 border border-gray-200 p-2 md:p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Total</p>
            <p className="text-lg md:text-xl font-bold text-gray-900">{orderStats.total}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-2 md:p-3 text-center">
            <p className="text-xs text-yellow-600 mb-1">Pending</p>
            <p className="text-lg md:text-xl font-bold text-yellow-700">{orderStats.pending}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-2 md:p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Completed</p>
            <p className="text-lg md:text-xl font-bold text-green-700">{orderStats.completed}</p>
          </div>
          <div className="bg-red-50 border border-red-200 p-2 md:p-3 text-center">
            <p className="text-xs text-red-600 mb-1">Cancelled</p>
            <p className="text-lg md:text-xl font-bold text-red-700">{orderStats.cancelled}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-2 md:p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Dine In</p>
            <p className="text-lg md:text-xl font-bold text-blue-700">{orderStats.dineIn}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-2 md:p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">Take Away</p>
            <p className="text-lg md:text-xl font-bold text-purple-700">{orderStats.takeAway}</p>
          </div>
          {ENABLE_AGGREGATORS && (
            <>
              <div className="bg-orange-50 border border-orange-200 p-2 md:p-3 text-center">
                <p className="text-xs text-orange-600 mb-1">Swiggy</p>
                <p className="text-lg md:text-xl font-bold text-orange-700">{orderStats.swiggy}</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-2 md:p-3 text-center">
                <p className="text-xs text-red-600 mb-1">Zomato</p>
                <p className="text-lg md:text-xl font-bold text-red-700">{orderStats.zomato}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Orders</h1>
        <div className="flex items-center space-x-3">
          {/* Sound Enable Button for Mobile */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().then(() => {
                  setAudioUnlocked(true);
                }).catch(err => console.log('Audio play failed:', err));
              }
            }}
            className={`flex items-center space-x-1 px-2 py-1 text-xs border transition-colors ${
              audioUnlocked 
                ? 'bg-green-100 border-green-300 text-green-700' 
                : 'bg-yellow-100 border-yellow-300 text-yellow-700 animate-pulse'
            }`}
            title={audioUnlocked ? 'Sound enabled' : 'Tap to enable notification sound'}
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">{audioUnlocked ? 'Sound On' : 'Enable Sound'}</span>
          </button>
          <div className="flex items-center space-x-2 text-xs md:text-sm">
            <span className="text-gray-600">Total Orders:</span>
            <span className="font-bold text-[#ec2b25]">{filteredOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-3 md:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)} 
              className="w-full px-2 md:px-3 py-2 text-xs md:text-sm border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
            >
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Type</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)} 
              className="w-full px-2 md:px-3 py-2 text-xs md:text-sm border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
            >
              {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              className="w-full px-2 md:px-3 py-2 text-xs md:text-sm border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              className="w-full px-2 md:px-3 py-2 text-xs md:text-sm border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="bg-white border border-gray-200 p-8 md:p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-6 md:w-8 h-6 md:h-8 animate-spin text-[#ec2b25]" />
            <p className="text-sm md:text-base text-gray-500">Loading orders...</p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-gray-200 p-8 md:p-12">
          <div className="text-center text-sm md:text-base text-gray-500">No orders found.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="border-2 border-gray-200 bg-white hover:shadow-lg transition-all">
              {/* Header */}
              <div className="bg-gray-50 px-3 md:px-4 py-2 md:py-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1 md:space-x-2 min-w-0 flex-1">
                    <span className={`px-2 md:px-3 py-1 text-xs font-bold border truncate ${getOrderTypeColor(order.type)}`}>
                      {getOrderTypeLabel(order.type)}
                    </span>
                  </div>
                  <span className={`px-1.5 md:px-2 py-1 text-xs font-bold uppercase flex-shrink-0 ${
                    order.status === 'completed' 
                      ? 'bg-green-600 text-white' 
                      : order.status === 'cancelled'
                      ? 'bg-gray-500 text-white'
                      : 'bg-orange-500 text-white'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="space-y-1">
                  {order.orderId && (
                    <div className="text-xs md:text-sm font-mono font-bold text-[#ec2b25]">
                      {order.orderId}
                    </div>
                  )}
                  {order.billDocId && order.billDocId !== 'pending' && (
                    <div className="text-xs text-gray-600">
                      Bill: <span className="font-mono font-semibold">{order.billDocId.slice(-6).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-3 md:px-4 py-2 md:py-3">
                {/* Customer & Table Info */}
                <div className="mb-3 space-y-1">
                  {order.tableName && (
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Table:</span>
                      <span className="font-bold text-gray-900 truncate ml-2">{order.tableName}</span>
                    </div>
                  )}
                  {order.customerName && (
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium text-gray-900 truncate ml-2">{order.customerName}</span>
                    </div>
                  )}
                  {order.platformOrderId && (
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">{order.platform === 'swiggy' ? 'Swiggy' : 'Zomato'} Order:</span>
                      <span className="font-mono font-bold text-gray-900 truncate ml-2">{order.platformOrderId}</span>
                    </div>
                  )}
                </div>

                {/* Item Details */}
                {order.itemName ? (
                  // Single item order (Dine In)
                  <div className="bg-gray-50 border border-gray-200 p-2 md:p-3 mb-3">
                    <div className="font-bold text-xs md:text-sm text-gray-900 mb-2 truncate">{order.itemName}</div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <div>
                        <span className="text-gray-600">Qty:</span>
                        <span className="ml-1 md:ml-2 font-bold text-gray-900">{order.quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Price:</span>
                        <span className="ml-1 md:ml-2 font-medium text-gray-900">₹{order.itemPrice}</span>
                      </div>
                    </div>
                  </div>
                ) : order.items ? (
                  // Multiple items order (Takeaway, Swiggy, Zomato)
                  <div className="bg-gray-50 border border-gray-200 p-2 md:p-3 mb-3 space-y-2">
                    <div className="font-bold text-xs md:text-sm text-gray-900 mb-2">Items ({order.items.length})</div>
                    {order.items.map((item, index) => (
                      <div key={index} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <div className="font-medium text-gray-900 text-xs md:text-sm mb-1 truncate">{item.itemName}</div>
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-gray-600">Qty:</span>
                            <span className="ml-1 md:ml-2 font-bold text-gray-900">{item.quantity}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Price:</span>
                            <span className="ml-1 md:ml-2 font-medium text-gray-900">₹{item.itemPrice}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <span className="ml-1 md:ml-2 font-bold text-gray-900">₹{(item.itemPrice * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Total Amount */}
                <div className="bg-gray-100 p-2 md:p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs md:text-sm text-gray-700">Total Amount:</span>
                    <span className="text-base md:text-xl font-bold text-gray-900">₹{order.total?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  disabled={order.status === 'completed' || order.status === 'cancelled' || updatingId === order.id}
                  onClick={() => markAsComplete(order.id)}
                  className={`w-full px-3 md:px-4 py-2 font-semibold text-xs md:text-sm transition-colors flex items-center justify-center space-x-1 md:space-x-2 ${
                    order.status === 'completed' 
                      ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                      : order.status === 'cancelled'
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-[#ec2b25] text-white hover:bg-[#d12620] cursor-pointer'
                  } ${updatingId === order.id ? 'opacity-50' : ''}`}
                >
                  {order.status === 'completed' ? (
                    <>
                      <CheckCircle className="w-3 md:w-4 h-3 md:h-4" />
                      <span>Completed</span>
                    </>
                  ) : order.status === 'cancelled' ? (
                    <>
                      <span>Cancelled</span>
                    </>
                  ) : updatingId === order.id ? (
                    <Loader2 className="w-3 md:w-4 h-3 md:h-4 animate-spin" />
                  ) : (
                    <>
                      <Clock className="w-3 md:w-4 h-3 md:h-4" />
                      <span>Mark as Complete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;