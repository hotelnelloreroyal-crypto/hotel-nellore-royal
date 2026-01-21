import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrendingUp, TrendingDown, ShoppingCart, FileText, XCircle, Package, IndianRupee, Calendar, ChevronDown, Wallet, CreditCard, Smartphone, Banknote } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalInvestment: 0,
    totalPayroll: 0,
    profitLoss: 0,
    profitPercentage: 0,
    totalOrders: 0,
    totalBills: 0,
    openBills: 0,
    cancelledOrders: 0,
    topSellingItems: [],
    periodRevenue: 0,
    periodOrders: 0,
    // Payment method breakdown
    cashReceived: 0,
    cardReceived: 0,
    upiReceived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.setHours(0, 0, 0, 0));
        endDate = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      
      case 'thisWeek':
        const firstDayOfWeek = now.getDate() - now.getDay(); // Sunday
        startDate = new Date(now.setDate(firstDayOfWeek));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'lastWeek':
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay() - 1); // Last Saturday
        lastWeekEnd.setHours(23, 59, 59, 999);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6); // Last Sunday
        lastWeekStart.setHours(0, 0, 0, 0);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'custom':
        if (customDateFrom && customDateTo) {
          startDate = new Date(customDateFrom);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customDateTo);
          endDate.setHours(23, 59, 59, 999);
        } else {
          return null;
        }
        break;
      
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    return { startDate, endDate };
  };

  const isDateInRange = (dateString, startDate, endDate) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date >= startDate && date <= endDate;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dateRange = getDateRange();
      
      if (dateFilter === 'custom' && !dateRange) {
        setLoading(false);
        return;
      }

      const { startDate, endDate } = dateRange;

      // Fetch bills
      const billsSnap = await getDocs(collection(db, 'bills'));
      const allBills = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const bills = allBills.filter(bill => isDateInRange(bill.createdAt, startDate, endDate));
      
      // Filter only paid bills for revenue calculation
      const paidBills = bills.filter(bill => bill.status === 'paid');

      // Calculate payment method breakdown
      let cashReceived = 0;
      let cardReceived = 0;
      let upiReceived = 0;

      paidBills.forEach(bill => {
        const billTotal = parseFloat(bill.total) || 0;
        
        if (bill.paymentMethod === 'split' && bill.splitPayment) {
          // Split payment - add individual amounts
          cashReceived += parseFloat(bill.splitPayment.cash) || 0;
          cardReceived += parseFloat(bill.splitPayment.card) || 0;
          upiReceived += parseFloat(bill.splitPayment.upi) || 0;
        } else if (bill.paymentMethod === 'cash') {
          cashReceived += billTotal;
        } else if (bill.paymentMethod === 'card') {
          cardReceived += billTotal;
        } else if (bill.paymentMethod === 'upi') {
          upiReceived += billTotal;
        }
      });
      
      // Fetch orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const orders = allOrders.filter(order => isDateInRange(order.createdAt, startDate, endDate));
      
      // Filter completed orders for revenue-related calculations
      const completedOrders = orders.filter(order => order.status === 'completed');
      
      // Fetch investments
      const investmentsSnap = await getDocs(collection(db, 'investments'));
      const allInvestments = investmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const investments = allInvestments.filter(inv => isDateInRange(inv.createdAt, startDate, endDate));

      // Fetch payrolls
      const payrollsSnap = await getDocs(collection(db, 'payrolls'));
      const allPayrolls = payrollsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const payrolls = allPayrolls.filter(payroll => isDateInRange(payroll.createdAt, startDate, endDate));

      // Calculate total revenue from PAID bills only
      const totalRevenue = paidBills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0);
      
      // Calculate total investment
      const totalInvestment = investments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      
      // Calculate total payroll
      const totalPayroll = payrolls.reduce((sum, payroll) => sum + (parseFloat(payroll.salary) || 0), 0);
      
      // Calculate profit/loss (Revenue - Investment - Payroll)
      const profitLoss = totalRevenue - totalInvestment - totalPayroll;
      const totalExpenses = totalInvestment + totalPayroll;
      const profitPercentage = totalExpenses > 0 ? ((profitLoss / totalExpenses) * 100) : 0;

      // Count cancelled orders
      const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
      
      // Count open (unpaid) bills
      const openBills = bills.filter(bill => bill.status === 'open').length;

      // Calculate top selling items from COMPLETED orders only
      const itemSales = {};
      completedOrders.forEach(order => {
        if (order.itemName) {
          if (!itemSales[order.itemName]) {
            itemSales[order.itemName] = {
              name: order.itemName,
              quantity: 0,
              revenue: 0
            };
          }
          itemSales[order.itemName].quantity += 1;
          itemSales[order.itemName].revenue += parseFloat(order.subtotal) || parseFloat(order.price) || 0;
        }
      });

      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setStats({
        totalRevenue,
        totalInvestment,
        totalPayroll,
        profitLoss,
        profitPercentage,
        totalOrders: completedOrders.length,
        totalBills: paidBills.length,
        openBills,
        cancelledOrders,
        topSellingItems,
        periodRevenue: totalRevenue,
        periodOrders: completedOrders.length,
        cashReceived,
        cardReceived,
        upiReceived,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return "Today's";
      case 'yesterday': return "Yesterday's";
      case 'thisWeek': return "This Week's";
      case 'lastWeek': return "Last Week's";
      case 'thisMonth': return "This Month's";
      case 'lastMonth': return "Last Month's";
      case 'thisYear': return "This Year's";
      case 'lastYear': return "Last Year's";
      case 'custom': return "Selected Period";
      default: return "Today's";
    }
  };

  const getFilterDisplayName = () => {
    switch (dateFilter) {
      case 'today': return "Today";
      case 'yesterday': return "Yesterday";
      case 'thisWeek': return "This Week";
      case 'lastWeek': return "Last Week";
      case 'thisMonth': return "This Month";
      case 'lastMonth': return "Last Month";
      case 'thisYear': return "This Year";
      case 'lastYear': return "Last Year";
      case 'custom': return "Custom Date";
      default: return "Today";
    }
  };

  const filterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'custom', label: 'Custom Date' },
  ];

  const handleFilterChange = (value) => {
    setDateFilter(value);
    setDropdownOpen(false);
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ec2b25] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">Welcome to NOVA Restaurant Management System</p>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4">
          {/* Custom Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 md:gap-3 border-2 border-gray-200 px-3 md:px-4 py-2 bg-white text-gray-900 hover:border-[#ec2b25] focus:outline-none focus:border-[#ec2b25] w-full sm:min-w-[180px] md:min-w-[200px] cursor-pointer text-sm md:text-base"
            >
              <Calendar className="w-4 md:w-5 h-4 md:h-5 text-gray-600 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{getFilterDisplayName()}</span>
              <ChevronDown className={`w-3 md:w-4 h-3 md:h-4 text-gray-600 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-gray-200 shadow-lg z-50 max-h-64 md:max-h-80 overflow-y-auto">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(option.value)}
                    className={`w-full text-left px-3 md:px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer text-sm md:text-base ${
                      dateFilter === option.value ? 'bg-[#ec2b25] text-white hover:bg-[#d12520]' : 'text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === 'custom' && (
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="border-2 border-gray-200 px-2 md:px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-[#ec2b25] text-sm md:text-base"
                placeholder="From"
              />
              <span className="text-gray-600 text-sm hidden xs:block">to</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="border-2 border-gray-200 px-2 md:px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-[#ec2b25] text-sm md:text-base"
                placeholder="To"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {/* Total Revenue */}
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-green-100">
              <IndianRupee className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">Total Revenue</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-2">From {stats.totalBills} paid bills</p>
        </div>

        {/* Total Investment */}
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-orange-100">
              <Package className="w-5 md:w-6 h-5 md:h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">Total Investment</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(stats.totalInvestment)}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-2">Total expenses</p>
        </div>

        {/* Total Payroll */}
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-purple-100">
              <Wallet className="w-5 md:w-6 h-5 md:h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">Total Payroll</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(stats.totalPayroll)}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-2">Staff salaries</p>
        </div>

        {/* Profit/Loss */}
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className={`p-2 md:p-3 ${stats.profitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {stats.profitLoss >= 0 ? (
                <TrendingUp className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-5 md:w-6 h-5 md:h-6 text-red-600" />
              )}
            </div>
          </div>
          <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">
            {stats.profitLoss >= 0 ? 'Profit' : 'Loss'}
          </h3>
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${stats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(stats.profitLoss))}
          </p>
          <p className={`text-xs md:text-sm font-medium mt-2 ${stats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.profitPercentage >= 0 ? '+' : ''}{stats.profitPercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Cash Received */}
        <div className="bg-white border-2 border-green-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-green-100">
              <Banknote className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">Cash Received</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{formatCurrency(stats.cashReceived)}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-2">
            {stats.totalRevenue > 0 ? ((stats.cashReceived / stats.totalRevenue) * 100).toFixed(1) : 0}% of total
          </p>
        </div>

        {/* Card Received */}
        <div className="bg-white border-2 border-blue-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-blue-100">
              <CreditCard className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">Card Received</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{formatCurrency(stats.cardReceived)}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-2">
            {stats.totalRevenue > 0 ? ((stats.cardReceived / stats.totalRevenue) * 100).toFixed(1) : 0}% of total
          </p>
        </div>

        {/* UPI Received */}
        <div className="bg-white border-2 border-purple-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-purple-100">
              <Smartphone className="w-5 md:w-6 h-5 md:h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">UPI Received</h3>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">{formatCurrency(stats.upiReceived)}</p>
          <p className="text-xs md:text-sm text-gray-500 mt-2">
            {stats.totalRevenue > 0 ? ((stats.upiReceived / stats.totalRevenue) * 100).toFixed(1) : 0}% of total
          </p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {/* Period Revenue */}
        <div className="bg-white border-2 border-[#ec2b25] p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <IndianRupee className="w-4 md:w-5 h-4 md:h-5 text-[#ec2b25]" />
            <h3 className="text-gray-600 text-xs md:text-sm font-medium">{getFilterLabel()} Revenue</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-[#ec2b25]">{formatCurrency(stats.periodRevenue)}</p>
        </div>

        {/* Total Orders */}
        <div className="bg-white border-2 border-blue-200 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <ShoppingCart className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
            <h3 className="text-gray-600 text-xs md:text-sm font-medium">Total Orders</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
          <p className="text-xs text-gray-500 mt-1">{getFilterLabel()} Period</p>
        </div>

        {/* Paid Bills */}
        <div className="bg-white border-2 border-purple-200 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <FileText className="w-4 md:w-5 h-4 md:h-5 text-purple-600" />
            <h3 className="text-gray-600 text-xs md:text-sm font-medium">Paid Bills</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-purple-600">{stats.totalBills}</p>
          {stats.openBills > 0 && (
            <p className="text-xs text-orange-600 mt-1 font-medium">{stats.openBills} unpaid bills</p>
          )}
        </div>

        {/* Cancelled Orders */}
        <div className="bg-white border-2 border-red-200 p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <XCircle className="w-4 md:w-5 h-4 md:h-5 text-red-600" />
            <h3 className="text-gray-600 text-xs md:text-sm font-medium">Cancelled Orders</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
        </div>
      </div>

      {/* Charts and Top Selling Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Financial Overview Bar Chart */}
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Financial Overview</h2>
          <div className="h-[250px] sm:h-[300px] flex items-end justify-around gap-2 sm:gap-4 pb-2">
            {/* Revenue Bar */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: '280px' }}>
                <div className="text-center mb-2">
                  <div className="text-xs font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
                </div>
                <div 
                  className="w-full bg-green-500 flex items-end justify-center pb-2 transition-all duration-500"
                  style={{ 
                    height: '100%',
                    minHeight: '40px'
                  }}
                >
                  <span className="text-xs text-white font-medium">Revenue</span>
                </div>
              </div>
            </div>

            {/* Investment Bar */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: '280px' }}>
                <div className="text-center mb-2">
                  <div className="text-xs font-bold text-orange-600">{formatCurrency(stats.totalInvestment)}</div>
                </div>
                <div 
                  className="w-full bg-orange-500 flex items-end justify-center pb-2 transition-all duration-500"
                  style={{ 
                    height: stats.totalRevenue > 0 
                      ? `${(stats.totalInvestment / stats.totalRevenue) * 100}%` 
                      : '20%',
                    minHeight: '40px'
                  }}
                >
                  <span className="text-xs text-white font-medium">Investment</span>
                </div>
              </div>
            </div>

            {/* Profit/Loss Bar */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: '280px' }}>
                <div className="text-center mb-2">
                  <div className={`text-xs font-bold ${stats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(stats.profitLoss))}
                  </div>
                  <div className={`text-xs font-medium ${stats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.profitPercentage >= 0 ? '+' : ''}{stats.profitPercentage.toFixed(1)}%
                  </div>
                </div>
                <div 
                  className={`w-full flex items-end justify-center pb-2 transition-all duration-500 ${
                    stats.profitLoss >= 0 ? 'bg-green-600' : 'bg-red-600'
                  }`}
                  style={{ 
                    height: stats.totalRevenue > 0 
                      ? `${(Math.abs(stats.profitLoss) / stats.totalRevenue) * 100}%` 
                      : '20%',
                    minHeight: '40px'
                  }}
                >
                  <span className="text-xs text-white font-medium">
                    {stats.profitLoss >= 0 ? 'Profit' : 'Loss'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* X-axis labels */}
          <div className="border-t-2 border-gray-300 mt-2"></div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Top 10 Selling Items</h2>
          {stats.topSellingItems.length > 0 ? (
            <div className="space-y-2 md:space-y-3">
              {stats.topSellingItems.map((item, index) => (
                <div key={index} className="border-b border-gray-200 pb-2 md:pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-[#ec2b25] text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900 text-sm md:text-base truncate">{item.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs md:text-sm font-bold text-gray-900">{item.quantity} orders</p>
                      <p className="text-xs text-gray-600">{formatCurrency(item.revenue)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 md:h-2">
                    <div 
                      className="bg-[#ec2b25] h-1.5 md:h-2"
                      style={{ 
                        width: stats.topSellingItems[0]?.quantity 
                          ? `${(item.quantity / stats.topSellingItems[0].quantity) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No sales data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">{stats.totalOrders - stats.cancelledOrders}</div>
            <p className="text-gray-600 mt-2">Completed Orders</p>
            <div className="mt-2 text-sm text-gray-500">
              {stats.totalOrders > 0 
                ? `${(((stats.totalOrders - stats.cancelledOrders) / stats.totalOrders) * 100).toFixed(1)}%` 
                : '0%'} Success Rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600">{stats.cancelledOrders}</div>
            <p className="text-gray-600 mt-2">Cancelled Orders</p>
            <div className="mt-2 text-sm text-gray-500">
              {stats.totalOrders > 0 
                ? `${((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1)}%` 
                : '0%'} Cancellation Rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">
              {stats.totalBills > 0 ? (stats.totalRevenue / stats.totalBills).toFixed(0) : 0}
            </div>
            <p className="text-gray-600 mt-2">Average Bill Value</p>
            <div className="mt-2 text-sm text-gray-500">
              {formatCurrency(stats.totalBills > 0 ? stats.totalRevenue / stats.totalBills : 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
