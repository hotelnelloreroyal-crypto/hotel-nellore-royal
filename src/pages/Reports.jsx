import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { Calendar, Download, TrendingUp, DollarSign, ShoppingBag, ChevronDown, ChevronRight, Package, List, Loader2 } from 'lucide-react';

const Reports = () => {
  const [dateRange, setDateRange] = useState('today');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch data from Firestore whenever dateRange changes IF you want real-time, 
  // but for now we fetch once and filter locally to reduce reads.
  // Unless we want to be very precise with Firestore queries.
  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsSnap, categoriesSnap, itemsSnap] = await Promise.all([
        getDocs(collection(db, 'bills')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'items'))
      ]);

      setBills(billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMenuItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const getDateRangeBounds = () => {
    const now = new Date();
    let startDate, endDate;

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    switch (dateRange) {
      case 'today':
        startDate = todayStart;
        endDate = todayEnd;
        break;
      case 'yesterday':
        startDate = new Date(todayStart);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(todayStart);
        startDate.setDate(startDate.getDate() - 7);
        endDate = todayEnd;
        break;
      case 'month':
        startDate = new Date(todayStart);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = todayEnd;
        break;
      default:
        startDate = new Date(0); // All time
        endDate = todayEnd;
    }
    return { startDate, endDate };
  };

  const filterBillsByDate = () => {
    if (dateRange === 'all') return bills;
    const { startDate, endDate } = getDateRangeBounds();
    
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt || bill.paidAt || 0);
      return billDate >= startDate && billDate <= endDate;
    });
  };

  const filteredBills = filterBillsByDate();
  const paidBills = filteredBills.filter(bill => bill.status === 'paid');

  const stats = {
    totalRevenue: paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0),
    totalOrders: paidBills.length,
    avgOrderValue: paidBills.length > 0 
      ? paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0) / paidBills.length 
      : 0,
    totalItems: paidBills.reduce((sum, bill) => 
      sum + (bill.items?.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0) || 0), 0
    ),
  };

  const getSalesByCategory = () => {
    const categorySales = {};
    
    // Initialize with all categories
    categories.forEach(cat => {
      categorySales[cat.id] = {
        id: cat.id,
        name: cat.name,
        icon: cat.emoji || cat.icon || '📁',
        items: {},
        totalQty: 0,
        totalRevenue: 0
      };
    });

    paidBills.forEach(bill => {
      if (!bill.items) return;
      
      bill.items.forEach(item => {
        // Find menuItem to get its current category
        const menuItem = menuItems.find(mi => String(mi.id) === String(item.id));
        const categoryId = menuItem ? menuItem.categoryId : 'unknown';
        
        if (!categorySales[categoryId]) {
          categorySales[categoryId] = {
            id: categoryId,
            name: categoryId === 'unknown' ? 'Uncategorized' : 'Unknown',
            icon: '📋',
            items: {},
            totalQty: 0,
            totalRevenue: 0
          };
        }

        if (!categorySales[categoryId].items[item.id]) {
          categorySales[categoryId].items[item.id] = {
            id: item.id,
            name: item.name,
            quantity: 0,
            revenue: 0,
            price: parseFloat(item.price) || 0
          };
        }

        const qty = Number(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        
        categorySales[categoryId].items[item.id].quantity += qty;
        categorySales[categoryId].items[item.id].revenue += price * qty;
        categorySales[categoryId].totalQty += qty;
        categorySales[categoryId].totalRevenue += price * qty;
      });
    });

    return Object.values(categorySales).filter(cat => cat.totalQty > 0);
  };

  const salesByCategory = getSalesByCategory();

  const getLocalTopItems = (limit = 10) => {
    const itemSales = {};
    
    paidBills.forEach(bill => {
      if (!bill.items) return;
      bill.items.forEach(item => {
        if (!itemSales[item.id]) {
          itemSales[item.id] = { 
            id: item.id, 
            name: item.name, 
            totalQuantity: 0, 
            totalRevenue: 0,
            price: parseFloat(item.price) || 0
          };
        }
        const qty = Number(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        
        itemSales[item.id].totalQuantity += qty;
        itemSales[item.id].totalRevenue += price * qty;
      });
    });

    return Object.values(itemSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  };

  const topItems = getLocalTopItems(10);

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDateRangeLabel = () => {
    const labels = {
      today: "Today's",
      yesterday: "Yesterday's",
      week: 'This Week\'s',
      month: 'This Month\'s',
      all: 'All Time',
    };
    return labels[dateRange] || 'All Time';
  };

  const paymentMethodStats = {
    cash: paidBills.filter(o => o.paymentMethod === 'cash').length,
    card: paidBills.filter(o => o.paymentMethod === 'card').length,
    upi: paidBills.filter(o => o.paymentMethod === 'upi').length,
    split: paidBills.filter(o => o.paymentMethod === 'split').length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Generating Report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 bg-gray-50/50 min-h-screen p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Reports & Insights</h1>
          <p className="text-gray-500 mt-2 text-lg flex items-center gap-2 font-bold">
            <TrendingUp size={20} className="text-orange-500" />
            Analyzing performance for <span className="font-semibold text-orange-600 underline decoration-2 decoration-orange-200 underline-offset-4">{getDateRangeLabel()}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-orange-500 transition-colors" size={20} />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-12 pr-10 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-700 font-semibold appearance-none cursor-pointer min-w-[180px] shadow-inner transition-all hover:bg-gray-100"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
          <Button variant="outline" onClick={fetchData} className="rounded-xl px-6 py-3 border-gray-200 hover:border-orange-500 hover:text-orange-600 transition-all font-bold" icon={<Download size={20} />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'from-emerald-500 to-teal-600', sub: `${getDateRangeLabel()} Sales` },
          { label: 'Total Bills', value: stats.totalOrders, icon: ShoppingBag, color: 'from-blue-500 to-indigo-600', sub: 'Paid transactions' },
          { label: 'Avg Sale', value: formatCurrency(stats.avgOrderValue), icon: TrendingUp, color: 'from-purple-500 to-violet-600', sub: 'Revenue per bill' },
          { label: 'Items Sold', value: stats.totalItems, icon: Package, color: 'from-orange-500 to-rose-600', sub: 'Total quantity sold' }
        ].map((stat, i) => (
          <div key={i} className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl hover:scale-[1.02] transition-transform duration-300 bg-gradient-to-br ${stat.color}`}>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-white/80 font-medium tracking-wide uppercase text-xs mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black mb-1">{stat.value}</h3>
                <p className="text-white/60 text-xs font-semibold">{stat.sub}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <stat.icon size={26} />
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <stat.icon size={120} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Item Sales by Category - Wide Section */}
        <div className="xl:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-gray-200/50 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 p-3 rounded-2xl">
                  <List className="text-orange-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Sales Breakdown</h2>
                  <p className="text-gray-500 text-sm font-medium">Performance by menu category</p>
                </div>
              </div>
              <span className="text-sm text-orange-600 font-bold bg-orange-50 px-5 py-2 rounded-full border border-orange-100 shadow-sm">
                {salesByCategory.length} Active Categories
              </span>
            </div>
            
            <div className="space-y-6">
              {salesByCategory.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Package className="text-gray-300" size={40} />
                  </div>
                  <p className="text-gray-400 font-bold text-xl">No sales found for this period</p>
                  <p className="text-gray-400 mt-2">Try changing your date filter or ensure bills are marked as 'paid'</p>
                </div>
              ) : (
                salesByCategory.map((category) => (
                  <div key={category.id} className="group rounded-3xl border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-5 bg-white group-hover:bg-orange-50/20 transition-all font-bold"
                    >
                      <div className="flex items-center gap-5">
                        <div className="text-3xl bg-gray-50 px-4 py-3 rounded-2xl group-hover:bg-white transition-colors">
                          {category.icon}
                        </div>
                        <div className="text-left">
                          <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-orange-700 transition-colors uppercase tracking-tight">
                            {category.name}
                          </h3>
                          <p className="text-sm text-gray-500 font-bold">
                            {category.totalQty} units • {Object.keys(category.items).length} products
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-xl font-black text-gray-900">{formatCurrency(category.totalRevenue)}</p>
                        </div>
                        <div className={`p-2 rounded-xl transition-all ${expandedCategories[category.id] ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                          {expandedCategories[category.id] ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                        </div>
                      </div>
                    </button>
                    
                    {expandedCategories[category.id] && (
                      <div className="bg-gray-50/50 p-6 pt-0 border-t border-gray-100/50">
                        <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-gray-100">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-[0.1em]">
                                <th className="py-4 px-6">Product</th>
                                <th className="py-4 px-4 text-center">Unit Price</th>
                                <th className="py-4 px-4 text-center">Quantity</th>
                                <th className="py-4 px-6 text-right">Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.values(category.items)
                                .sort((a, b) => b.revenue - a.revenue)
                                .map((item) => (
                                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-orange-50/30 transition-all cursor-default font-bold">
                                    <td className="py-5 px-6 font-extrabold text-gray-800">{item.name}</td>
                                    <td className="py-5 px-4 text-center text-gray-500 font-bold">{formatCurrency(item.price)}</td>
                                    <td className="py-5 px-4 text-center">
                                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg font-black text-sm">
                                        {item.quantity}
                                      </span>
                                    </td>
                                    <td className="py-5 px-6 text-right font-black text-emerald-600">
                                      {formatCurrency(item.revenue)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* Top Products */}
          <Card className="rounded-[2.5rem] border-none shadow-xl p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <span className="bg-yellow-100 text-yellow-600 p-2 rounded-xl">⭐</span>
              Top Performers
            </h2>
            <div className="space-y-5">
              {topItems.length === 0 ? (
                <p className="text-center text-gray-400 py-10 font-bold italic">No rankings yet</p>
              ) : (
                topItems.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-4 group">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-${index === 0 ? 'yellow' : 'gray'}-200/50 ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 scale-110' :
                      index === 1 ? 'bg-slate-400' :
                      index === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-gray-900 truncate uppercase text-sm">{item.name}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{item.totalQuantity} Units</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 text-sm">{formatCurrency(item.totalRevenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Payments Mini Card */}
          <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-slate-900 text-white overflow-hidden relative">
            <div className="relative z-10">
              <h2 className="text-xl font-black mb-6 uppercase tracking-tight text-slate-400">Payments</h2>
              <div className="space-y-6">
                {[
                  { label: 'Cash', count: paymentMethodStats.cash, color: 'emerald', icon: '💵' },
                  { label: 'Card', count: paymentMethodStats.card, color: 'blue', icon: '💳' },
                  { label: 'UPI', count: paymentMethodStats.upi, color: 'purple', icon: '📱' },
                  { label: 'Split', count: paymentMethodStats.split, color: 'orange', icon: '✂️' }
                ].map((pay, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 font-bold text-slate-300">
                        <span>{pay.icon}</span>
                        {pay.label}
                      </div>
                      <span className="font-black text-white">{pay.count} Bills</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`bg-${pay.color}-500 h-full rounded-full transition-all duration-1000`}
                        style={{ width: `${stats.totalOrders > 0 ? (pay.count / stats.totalOrders) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
