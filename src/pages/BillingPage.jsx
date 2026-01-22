import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, Search, Minus, X, Printer, Save, ChevronLeft, ChevronRight, CreditCard, Loader2, ClipboardList, Bluetooth } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, limit, startAfter, getCountFromServer, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import ThermalBill from '../components/Billing/ThermalBill';
import { printThermalBill, printKOT, preConnectQZ, connectBluetoothPrinter, isBluetoothConnected, isMobile, isWebBluetoothAvailable } from '../utils/qzPrint';
import { ENABLE_AGGREGATORS } from '../config/features';

const ITEMS_PER_PAGE = 24;

const BillingPage = () => {
  const [showAddBill, setShowAddBill] = useState(true);
  const [floors, setFloors] = useState([]);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add Bill Section States
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState(''); // Search items by name, shortCode, price
  const [billItems, setBillItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentBillId, setCurrentBillId] = useState(null); // Firebase doc ID
  const [displayBillId, setDisplayBillId] = useState(null); // Human-readable bill ID like #B-15012026-1
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [billType, setBillType] = useState('dine-in'); // 'dine-in', 'take-away', 'swiggy', 'zomato'
  const [discount, setDiscount] = useState(0);
  const [savedDiscount, setSavedDiscount] = useState(0); // Discount saved to bill
  const [platformOrderId, setPlatformOrderId] = useState('');
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  
  // Multiple Bills per Table States
  const [showTableBillsModal, setShowTableBillsModal] = useState(false);
  const [tableBills, setTableBills] = useState([]);
  const [pendingTable, setPendingTable] = useState(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);

  // Billing Stats
  const [billStats, setBillStats] = useState({
    total: { count: 0, amount: 0 },
    dineIn: { count: 0, amount: 0 },
    takeAway: { count: 0, amount: 0 },
    swiggy: { count: 0, amount: 0 },
    zomato: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    open: { count: 0, amount: 0 }
  });

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  // Split Payment States
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitMethods, setSplitMethods] = useState(['cash', 'upi']); // Selected split methods
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  // Saved Payment Details (for printing)
  const [savedPaymentMethod, setSavedPaymentMethod] = useState(null);
  const [savedSplitPayment, setSavedSplitPayment] = useState(null);
  const [savedAmountReceived, setSavedAmountReceived] = useState(0);
  const [savedChange, setSavedChange] = useState(0);
  // Bluetooth Printer State (for mobile)
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [connectingBluetooth, setConnectingBluetooth] = useState(false);

  const printRef = useRef();
  const itemsListRef = useRef();
  const addBillSectionRef = useRef();

  // Fetch all data - OPTIMIZED: Combine fetches to reduce Firebase reads
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch static data in parallel (floors, tables, categories, items)
        const [floorsSnap, tablesSnap, categoriesSnap, itemsSnap] = await Promise.all([
          getDocs(query(collection(db, 'floors'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'tables'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'categories'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'items'), orderBy('createdAt', 'desc')))
        ]);
        
        setFloors(floorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTables(tablesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch bills with pagination
        const billsQuery = query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(ITEMS_PER_PAGE));
        const billsSnap = await getDocs(billsQuery);
        const billsData = billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBills(billsData);
        setLastVisible(billsSnap.docs[billsSnap.docs.length - 1]);
        
        // Get total count and stats from the same data (no extra reads)
        setTotalBills(billsData.length); // Approximate - will be updated when paginating
        fetchBillStats(billsData); // Pass bills data to avoid re-fetching
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setLoading(false);
      }
    };
    
    fetchInitialData();
    
    // Pre-connect QZ Tray for fast printing (desktop only)
    if (!isMobile()) {
      preConnectQZ().then(connected => {
        if (connected) {
          console.log('QZ Tray ready for fast printing');
        }
      });
    }
  }, []);

  // Fetch bill statistics for today - OPTIMIZED: Uses bills already fetched
  const fetchBillStats = async (billsData = null) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Use provided bills data or fetch only if necessary
      let allBills = billsData;
      if (!allBills) {
        // Only fetch if not provided - this reduces reads
        const querySnapshot = await getDocs(collection(db, 'bills'));
        allBills = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // Filter today's bills
      const todayBills = allBills.filter(bill => {
        if (!bill.createdAt) return false;
        const billDate = new Date(bill.createdAt);
        billDate.setHours(0, 0, 0, 0);
        return billDate.getTime() === today.getTime();
      });

      const stats = {
        total: { count: todayBills.length, amount: todayBills.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0) },
        dineIn: { count: 0, amount: 0 },
        takeAway: { count: 0, amount: 0 },
        swiggy: { count: 0, amount: 0 },
        zomato: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        open: { count: 0, amount: 0 }
      };

      todayBills.forEach(bill => {
        const amount = parseFloat(bill.total) || 0;
        
        // By type
        if (bill.type === 'dine-in') {
          stats.dineIn.count++;
          stats.dineIn.amount += amount;
        } else if (bill.type === 'take-away') {
          stats.takeAway.count++;
          stats.takeAway.amount += amount;
        } else if (bill.type === 'swiggy') {
          stats.swiggy.count++;
          stats.swiggy.amount += amount;
        } else if (bill.type === 'zomato') {
          stats.zomato.count++;
          stats.zomato.amount += amount;
        }

        // By status
        if (bill.status === 'paid') {
          stats.paid.count++;
          stats.paid.amount += amount;
        } else if (bill.status === 'open') {
          stats.open.count++;
          stats.open.amount += amount;
        }
      });

      setBillStats(stats);
    } catch (error) {
      console.error('Error fetching bill stats:', error);
    }
  };

  const fetchFloors = async () => {
    try {
      const q = query(collection(db, 'floors'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const floorsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFloors(floorsData);
    } catch (error) {
      console.error('Error fetching floors:', error);
    }
  };

  const fetchTables = async () => {
    try {
      const q = query(collection(db, 'tables'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const tablesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTables(tablesData);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const itemsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchTotalBillsCount = async () => {
    try {
      const snapshot = await getCountFromServer(collection(db, 'bills'));
      setTotalBills(snapshot.data().count);
    } catch (error) {
      console.error('Error fetching bills count:', error);
    }
  };

  const fetchBills = async (page = 1) => {
    try {
      let q;
      if (page === 1) {
        q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(ITEMS_PER_PAGE));
      } else {
        q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(ITEMS_PER_PAGE));
      }
      
      const querySnapshot = await getDocs(q);
      const billsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBills(billsData);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  // Filter tables by floor
  const filteredTables = selectedFloor === 'all' 
    ? tables 
    : tables.filter(table => table.floorId === selectedFloor);

  // Filter items by category and search query
  const filteredItems = items.filter(item => {
    // Category filter
    const categoryMatch = selectedCategory ? item.categoryId === selectedCategory : true;
    
    // Search filter (by name, shortCode, or price)
    const searchLower = itemSearchQuery.toLowerCase().trim();
    const searchMatch = searchLower === '' || 
      item.name.toLowerCase().includes(searchLower) ||
      (item.shortCode && item.shortCode.toLowerCase().includes(searchLower)) ||
      item.price.toString().includes(searchLower);
    
    return categoryMatch && searchMatch;
  });

  // Filter categories by search
  const searchFilteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  // Load open bills for selected table
  const loadOpenBillsForTable = async (table) => {
    try {
      const q = query(
        collection(db, 'bills'),
        where('tableId', '==', table.id),
        where('status', '==', 'open')
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const openBills = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTableBills(openBills);
        setPendingTable(table);
        setShowTableBillsModal(true);
      } else {
        // No open bills, start a new bill
        startNewBillForTable(table);
      }
    } catch (error) {
      console.error('Error loading open bills:', error);
      toast.error('Failed to load open bills');
    }
  };

  // Start a new bill for table
  const startNewBillForTable = (table) => {
    setSelectedTable(table);
    setBillItems([]);
    setCustomerName('');
    setCurrentBillId(null);
    setDisplayBillId(null);
    setDiscount(0);
    setSavedDiscount(0);
    setShowTableBillsModal(false);
    setPendingTable(null);
    setTableBills([]);
    toast.success(`New bill started for ${table.name}`);
  };

  // Load specific bill for editing from modal
  const loadSpecificBill = (bill, table) => {
    setSelectedTable(table);
    setBillItems(bill.items || []);
    setCustomerName(bill.customerName || '');
    setCurrentBillId(bill.id);
    setDisplayBillId(bill.billId || null);
    setDiscount(bill.discount || 0);
    setSavedDiscount(bill.discount || 0);
    setShowTableBillsModal(false);
    setPendingTable(null);
    setTableBills([]);
    toast.success(`Loaded bill ${bill.billId || 'for editing'}`);
  };

  // Handle table selection
  const handleTableSelect = (table) => {
    loadOpenBillsForTable(table);
  };

  // Add item to bill
  const addItemToBill = (item) => {
    setBillItems(prev => {
      const existing = prev.find(bi => bi.id === item.id);
      if (existing) {
        return prev.map(bi =>
          bi.id === item.id
            ? { ...bi, quantity: bi.quantity + 1, pendingKotQty: (bi.pendingKotQty || 0) + 1 }
            : bi
        );
      } else {
        return [...prev, { 
          ...item, 
          quantity: 1, 
          kotSent: false, 
          pendingKotQty: 1,
          originalQuantity: 0  // Track original quantity from saved orders
        }];
      }
    });
  };

  // Update item quantity (Plus/Minus buttons in bill summary)
  const updateQuantity = (itemId, delta) => {
    setBillItems(prevItems => prevItems.map(bi => {
      if (bi.id === itemId) {
        const newQty = bi.quantity + delta;
        if (newQty <= 0) {
          // Show confirmation modal instead of removing directly
          setItemToRemove(bi);
          setShowRemoveModal(true);
          return bi; // Keep the item for now
        }
        // Update pendingKotQty based on change from original quantity
        const originalQty = bi.originalQuantity || 0;
        const newPendingQty = newQty - originalQty;
        return { ...bi, quantity: newQty, pendingKotQty: newPendingQty };
      }
      return bi;
    }));
  };

  // Show remove confirmation modal
  const handleRemoveClick = (item) => {
    setItemToRemove(item);
    setShowRemoveModal(true);
  };

  // Remove item from bill
  const removeItemFromBill = async (itemId) => {
    const itemToRemove = billItems.find(bi => bi.id === itemId);
    
    if (!itemToRemove) return;

    try {
      // Remove item from bill items
      const updatedItems = billItems.filter(bi => bi.id !== itemId);
      setBillItems(updatedItems);

      // Handle order updates
      if (itemToRemove.orderIds && itemToRemove.orderIds.length > 0) {
        // For dine-in orders: each item has its own order, so cancel them
        if (billType === 'dine-in') {
          await Promise.all(itemToRemove.orderIds.map(async (order) => {
            await updateDoc(doc(db, 'orders', order.orderDocId), {
              status: 'cancelled',
              updatedAt: new Date().toISOString()
            });
          }));
        } else {
          // For takeaway/Swiggy/Zomato: ONE order with multiple items
          // Update the order's items array instead of cancelling
          const orderDocId = itemToRemove.orderIds[0]?.orderDocId;
          if (orderDocId) {
            // Get remaining items that have the same order
            const remainingItemsInOrder = updatedItems.filter(item => 
              item.orderIds?.some(o => o.orderDocId === orderDocId)
            );

            if (remainingItemsInOrder.length > 0) {
              // Update order with remaining items
              const orderItems = remainingItemsInOrder.map(item => ({
                itemId: item.id,
                itemName: item.name,
                itemPrice: item.price,
                quantity: item.quantity
              }));
              
              const orderTotal = remainingItemsInOrder.reduce(
                (sum, item) => sum + (item.price * item.quantity), 
                0
              );

              await updateDoc(doc(db, 'orders', orderDocId), {
                items: orderItems,
                subtotal: orderTotal,
                total: orderTotal,
                updatedAt: new Date().toISOString()
              });
            } else {
              // No items left, cancel the order
              await updateDoc(doc(db, 'orders', orderDocId), {
                status: 'cancelled',
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      }
      
      // Update bill in database if it exists
      if (currentBillId) {
        const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal - savedDiscount;
        
        await updateDoc(doc(db, 'bills', currentBillId), {
          items: updatedItems,
          subtotal: subtotal,
          total: total,
          updatedAt: new Date().toISOString()
        });
        
        // Refresh bills list
        fetchBills(currentPage);
        
        toast.success('Item removed and bill updated');
      } else {
        toast.success('Item removed from bill');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    }
  };

  // Calculate total (uses savedDiscount which is updated on save)
  const calculateTotal = () => {
    const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return subtotal - savedDiscount;
  };

  const calculateSubtotal = () => {
    return billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Generate custom order ID: #O-DDMMYYYY-N
  const generateOrderId = async () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB').split('/').join(''); // DDMMYYYY
    
    // Count orders created today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', startOfDay),
      where('createdAt', '<=', endOfDay)
    );
    const snapshot = await getDocs(q);
    const orderNumber = snapshot.size + 1;
    
    return `#O-${dateStr}-${orderNumber}`;
  };

  // Generate custom bill ID: #B-DDMMYYYY-N
  const generateBillId = async () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB').split('/').join(''); // DDMMYYYY
    
    // Count bills created today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    const q = query(
      collection(db, 'bills'),
      where('createdAt', '>=', startOfDay),
      where('createdAt', '<=', endOfDay)
    );
    const snapshot = await getDocs(q);
    const billNumber = snapshot.size + 1;
    
    return `#B-${dateStr}-${billNumber}`;
  };

  // Save bill
  const handleSaveBill = async () => {
    if ((billType === 'dine-in') && !selectedTable) {
      toast.error('Please select a table');
      return false;
    }
    
    // Check for Swiggy/Zomato order ID requirement
    if ((billType === 'swiggy' || billType === 'zomato') && !platformOrderId.trim()) {
      setShowPlatformModal(true);
      return false;
    }
    
    if (billItems.length === 0) {
      toast.error('Please add items to the bill');
      return false;
    }

    setSaving(true);
    try {
      // Filter items with quantity changes (positive = add, negative = reduce/remove)
      const itemsWithChanges = billItems.filter(item => {
        const pendingQty = item.pendingKotQty || 0;
        return pendingQty !== 0;
      });

      // Check if discount has changed
      const discountChanged = discount !== savedDiscount;

      if (itemsWithChanges.length === 0 && !discountChanged) {
        toast.error('No changes to save');
        setSaving(false);
        return false;
      }

      // Separate items to add vs items to reduce
      const itemsToAdd = itemsWithChanges.filter(item => (item.pendingKotQty || 0) > 0);
      const itemsToReduce = itemsWithChanges.filter(item => (item.pendingKotQty || 0) < 0);

      let updatedItemsWithOrders;

      // If only discount changed (no item changes), just reset pendingKotQty
      if (itemsWithChanges.length === 0 && discountChanged) {
        updatedItemsWithOrders = billItems.map(item => ({
          ...item,
          pendingKotQty: 0,
          originalQuantity: item.quantity
        }));
      }
      // For Dine In: Create individual order for each item with positive changes, cancel orders for reduced items
      else if (billType === 'dine-in') {
        updatedItemsWithOrders = await Promise.all(billItems.map(async (item) => {
          if ((item.pendingKotQty || 0) > 0) {
            // Add new quantity - Generate unique order ID for this item
            const orderId = await generateOrderId();
            
            // Create order for this specific item (only the new quantity)
            const orderPayload = {
              orderId: orderId,
              billDocId: currentBillId || 'pending',
              customerName: customerName || 'Guest',
              itemId: item.id,
              itemName: item.name,
              itemPrice: item.price,
              quantity: item.pendingKotQty,
              subtotal: item.price * item.pendingKotQty,
              total: item.price * item.pendingKotQty,
              status: 'pending',
              type: billType,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            if (selectedTable) {
              orderPayload.tableId = selectedTable.id;
              orderPayload.tableName = selectedTable.name;
            }
            
            const orderDoc = await addDoc(collection(db, 'orders'), orderPayload);
            
            // Return item with order ID attached and reset pendingKotQty
            return {
              ...item,
              kotSent: true,
              pendingKotQty: 0,
              originalQuantity: item.quantity, // Update original quantity
              orderIds: [...(item.orderIds || []), { orderId: orderId, orderDocId: orderDoc.id, quantity: item.pendingKotQty }]
            };
          } else if ((item.pendingKotQty || 0) < 0) {
            // Reduce quantity - Cancel orders for the reduced quantity
            const quantityToReduce = Math.abs(item.pendingKotQty);
            let remainingToCancel = quantityToReduce;
            const updatedOrderIds = [];
            
            // Cancel orders from the end (most recent first)
            if (item.orderIds && item.orderIds.length > 0) {
              for (let i = item.orderIds.length - 1; i >= 0 && remainingToCancel > 0; i--) {
                const order = item.orderIds[i];
                if (order.quantity <= remainingToCancel) {
                  // Cancel entire order
                  await updateDoc(doc(db, 'orders', order.orderDocId), {
                    status: 'cancelled',
                    updatedAt: new Date().toISOString()
                  });
                  remainingToCancel -= order.quantity;
                  // Don't add to updatedOrderIds - this order is cancelled
                } else {
                  // Partially reduce this order
                  const newQuantity = order.quantity - remainingToCancel;
                  await updateDoc(doc(db, 'orders', order.orderDocId), {
                    quantity: newQuantity,
                    subtotal: item.price * newQuantity,
                    total: item.price * newQuantity,
                    updatedAt: new Date().toISOString()
                  });
                  updatedOrderIds.unshift({
                    ...order,
                    quantity: newQuantity
                  });
                  remainingToCancel = 0;
                }
              }
              
              // Add back any orders that weren't cancelled (orders before the cancelled ones)
              for (let i = 0; i < item.orderIds.length && remainingToCancel === 0; i++) {
                const order = item.orderIds[i];
                // Check if this order wasn't already processed (not in updatedOrderIds)
                if (!updatedOrderIds.find(o => o.orderDocId === order.orderDocId)) {
                  updatedOrderIds.unshift(order);
                }
              }
            }
            
            return {
              ...item,
              pendingKotQty: 0,
              originalQuantity: item.quantity,
              orderIds: updatedOrderIds
            };
          }
          // Reset pendingKotQty for unchanged items
          return { ...item, pendingKotQty: 0, originalQuantity: item.quantity };
        }));
      } else {
        // For Takeaway, Swiggy, Zomato: Create ONE order with all items that have positive changes
        if (itemsToAdd.length > 0) {
          const orderId = await generateOrderId();
          
          // Calculate total for items to add
          const orderTotal = itemsToAdd.reduce((sum, item) => sum + (item.price * Math.abs(item.pendingKotQty)), 0);
          
          const orderPayload = {
            orderId: orderId,
            billDocId: currentBillId || 'pending',
            customerName: customerName || 'Guest',
            items: itemsToAdd.map(item => ({
              itemId: item.id,
              itemName: item.name,
              itemPrice: item.price,
              quantity: Math.abs(item.pendingKotQty)
            })),
            subtotal: orderTotal,
            total: orderTotal,
            status: 'pending',
            type: billType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          // Add platform order ID for Swiggy/Zomato
          if (billType === 'swiggy' || billType === 'zomato') {
            orderPayload.platformOrderId = platformOrderId;
            orderPayload.platform = billType;
          }
          
          const orderDoc = await addDoc(collection(db, 'orders'), orderPayload);
          
          // Update all items with the same order ID and reset pendingKotQty
          updatedItemsWithOrders = billItems.map(item => {
            if ((item.pendingKotQty || 0) > 0) {
              return {
                ...item,
                kotSent: true,
                pendingKotQty: 0,
                originalQuantity: item.quantity,
                orderIds: [...(item.orderIds || []), { orderId: orderId, orderDocId: orderDoc.id, quantity: item.pendingKotQty }]
              };
            }
            return { ...item, pendingKotQty: 0, originalQuantity: item.quantity };
          });
        } else {
          // No items to add, just reset pendingKotQty
          updatedItemsWithOrders = billItems.map(item => ({
            ...item,
            pendingKotQty: 0,
            originalQuantity: item.quantity
          }));
        }
      }

      const subtotal = calculateSubtotal();
      const total = subtotal - discount; // Use new discount value for saving
      
      const billData = {
        customerName: customerName || 'Guest',
        items: updatedItemsWithOrders,
        subtotal: subtotal,
        discount: discount,
        total: total,
        status: 'open',
        type: billType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add platform order ID for Swiggy/Zomato
      if ((billType === 'swiggy' || billType === 'zomato') && platformOrderId) {
        billData.platformOrderId = platformOrderId;
        billData.platform = billType;
      }
      
      if ((billType === 'dine-in') && selectedTable) {
        billData.tableId = selectedTable.id;
        billData.tableName = selectedTable.name;
      }

      let billDocId = currentBillId;
      
      if (currentBillId) {
        await updateDoc(doc(db, 'bills', currentBillId), {
          ...billData,
          updatedAt: new Date().toISOString()
        });
      } else {
        const billId = await generateBillId();
        billData.billId = billId;
        const docRef = await addDoc(collection(db, 'bills'), billData);
        billDocId = docRef.id;
        setCurrentBillId(docRef.id);
        setDisplayBillId(billId); // Set the display bill ID
        
        // Update all orders with the actual bill doc ID
        const orderUpdates = updatedItemsWithOrders
          .filter(item => item.orderIds && item.orderIds.length > 0)
          .flatMap(item => item.orderIds.map(order => order.orderDocId));
        
        await Promise.all(orderUpdates.map(orderDocId => 
          updateDoc(doc(db, 'orders', orderDocId), { billDocId: docRef.id })
        ));
      }
      
      setBillItems(updatedItemsWithOrders);
      setSavedDiscount(discount); // Apply discount after save
      fetchBills(1);
      fetchTotalBillsCount();
      fetchBillStats();
      
      toast.success(`Changes saved successfully!`);
      return true;
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error('Failed to save bill');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Print bill using QZ Tray (direct thermal printing - no modal)
  // Falls back to browser print if QZ Tray is not available
  const handlePrintBill = async () => {
    if (billItems.length === 0) {
      toast.error('No items to print');
      return;
    }
    
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    
    // Prepare bill data for thermal printing
    const billData = {
      billNo: displayBillId || 'NEW',
      orderNo: displayBillId ? displayBillId.replace('#B-', '#O-') : 'NEW',
      kotNo: '1',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      type: billType === 'dine-in' ? 'Dine In' : billType === 'take-away' ? 'Take Away' : billType === 'swiggy' ? 'Swiggy' : 'Zomato',
      table: selectedTable ? selectedTable.shortCode : 'N/A',
      user: 'Admin',
      items: billItems,
      subtotal: subtotal,
      discountAmount: savedDiscount,
      totalAmount: total,
      totalQty: billItems.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: savedPaymentMethod,
      splitPayment: savedSplitPayment,
      amountReceived: savedAmountReceived,
      change: savedChange
    };

    // Try QZ Tray first for direct printing, fallback to browser print
    try {
      console.log('Attempting QZ Tray print...');
      await printThermalBill(billData);
      toast.success('Printed via QZ Tray!', { duration: 1500 });
    } catch (err) {
      console.error('QZ Tray error:', err.message);
      toast.error(`QZ Error: ${err.message}. Using browser print...`, { duration: 3000 });
      // Fallback to browser print
      setTimeout(() => window.print(), 500);
    }
  };

  // Print a paid bill directly from the bill list
  const handlePrintPaidBill = async (bill) => {
    const getBillTypeLabel = (type) => {
      switch(type) {
        case 'dine-in': return 'Dine In';
        case 'take-away': return 'Take Away';
        case 'swiggy': return 'Swiggy';
        case 'zomato': return 'Zomato';
        default: return type;
      }
    };

    const billData = {
      billNo: bill.billId || 'N/A',
      orderNo: bill.billId ? bill.billId.replace('#B-', '#O-') : 'N/A',
      kotNo: '1',
      date: new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date(bill.paidAt || bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      type: getBillTypeLabel(bill.type),
      table: bill.tableName || 'N/A',
      user: 'Admin',
      items: bill.items,
      subtotal: bill.subtotal,
      discountAmount: bill.discount || 0,
      totalAmount: bill.total,
      totalQty: bill.items.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: bill.paymentMethod,
      splitPayment: bill.splitPayment || null,
      amountReceived: bill.amountReceived || bill.total,
      change: bill.change || 0
    };

    try {
      console.log('Printing paid bill:', billData);
      await printThermalBill(billData);
      toast.success('Bill printed!', { duration: 1500 });
    } catch (err) {
      console.error('QZ Tray error:', err.message);
      toast.error(`Print Error: ${err.message}`, { duration: 3000 });
    }
  };

  // Check if bill has unsaved changes
  const hasUnsavedChanges = () => {
    const itemsWithChanges = billItems.filter(item => {
      const pendingQty = item.pendingKotQty || 0;
      return pendingQty !== 0;
    });
    const discountChanged = discount !== savedDiscount;
    return itemsWithChanges.length > 0 || discountChanged;
  };

  // Save and Print Bill (wired thermal printer)
  const handleSaveAndPrint = async () => {
    // Validate table for dine-in (only if no existing bill)
    if ((billType === 'dine-in') && !selectedTable && !currentBillId) {
      toast.error('Please select a table');
      return;
    }
    
    // If no items and no existing bill, can't print
    if (billItems.length === 0 && !currentBillId) {
      toast.error('Please add items to the bill');
      return;
    }

    // If there are unsaved changes, save first then print
    if (hasUnsavedChanges() && billItems.length > 0) {
      const saved = await handleSaveBill();
      if (!saved) return;
      // Wait a moment for bill to be saved, then print
      setTimeout(async () => {
        await handlePrintBill();
      }, 500);
    } else {
      // No changes or no items, just print directly (existing bill)
      await handlePrintBill();
    }
  };

  // Save and Print KOT (Bluetooth printer for kitchen)
  const handleSaveAndKOT = async () => {
    // Validate first
    if ((billType === 'dine-in') && !selectedTable) {
      toast.error('Please select a table');
      return;
    }
    if (billItems.length === 0) {
      toast.error('No items to print KOT');
      return;
    }

    // Get items with pending changes (newly added or quantity increased)
    const pendingItems = billItems
      .filter(item => (item.pendingKotQty || 0) > 0)
      .map(item => ({
        ...item,
        quantity: item.pendingKotQty // Only the new quantity for KOT
      }));

    if (pendingItems.length === 0) {
      toast.error('No new items to send to kitchen');
      return;
    }

    // Save first
    const saved = await handleSaveBill();
    if (!saved) return;

    // Wait a moment for bill to be saved, then print KOT with only new items
    setTimeout(async () => {
      await printKOTData(pendingItems);
    }, 500);
  };

  // Helper function to print KOT
  const printKOTData = async (itemsToPrint = null) => {
    const items = itemsToPrint || billItems;
    
    const kotData = {
      table: selectedTable ? selectedTable.shortCode : 'T/A',
      type: billType === 'dine-in' ? 'Dine In' : billType === 'take-away' ? 'Take Away' : billType === 'swiggy' ? 'Swiggy' : 'Zomato',
      items: items,
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    try {
      console.log('Attempting KOT print to Bluetooth printer...');
      await printKOT(kotData);
      toast.success('KOT sent to kitchen!', { duration: 1500 });
      // Update Bluetooth connection status after successful print
      if (isMobile() && isWebBluetoothAvailable()) {
        setBluetoothConnected(isBluetoothConnected());
      }
    } catch (err) {
      console.error('KOT print error:', err.message);
      toast.error(`KOT Error: ${err.message}`, { duration: 3000 });
    }
  };

  // Connect Bluetooth Printer (for mobile)
  const handleConnectBluetooth = async () => {
    if (!isWebBluetoothAvailable()) {
      toast.error('Bluetooth not supported. Use Chrome on Android.');
      return;
    }
    
    setConnectingBluetooth(true);
    try {
      await connectBluetoothPrinter();
      setBluetoothConnected(true);
      toast.success('Bluetooth printer connected!');
    } catch (err) {
      console.error('Bluetooth connection error:', err);
      toast.error(`Connection failed: ${err.message}`);
      setBluetoothConnected(false);
    } finally {
      setConnectingBluetooth(false);
    }
  };

  // Handle payment
  const handlePayment = () => {
    if (!currentBillId) {
      toast.error('Please save the bill first');
      return;
    }
    if (billItems.length === 0) {
      toast.error('No items in the bill');
      return;
    }
    const total = calculateTotal();
    setAmountReceived(total.toString());
    setCashAmount('');
    setCardAmount('');
    setUpiAmount('');
    setIsSplitPayment(false);
    setSplitMethods(['cash', 'upi']);
    setPaymentMethod('cash');
    setShowPaymentModal(true);
  };

  // Complete payment
  const completePayment = async () => {
    const total = calculateTotal();
    
    let paymentData = {};
    
    if (isSplitPayment) {
      const cash = parseFloat(cashAmount) || 0;
      const card = parseFloat(cardAmount) || 0;
      const upi = parseFloat(upiAmount) || 0;
      const totalReceived = cash + card + upi;
      
      if (totalReceived < total) {
        toast.error('Total amount received is less than bill total');
        return;
      }
      
      paymentData = {
        status: 'paid',
        paymentMethod: 'split',
        splitPayment: {
          cash: cash,
          card: card,
          upi: upi,
          methods: splitMethods
        },
        amountReceived: totalReceived,
        change: totalReceived - total,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const received = parseFloat(amountReceived) || 0;
      
      if (received < total) {
        toast.error('Amount received is less than total');
        return;
      }
      
      paymentData = {
        status: 'paid',
        paymentMethod,
        amountReceived: received,
        change: received - total,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    setProcessing(true);
    try {
      await updateDoc(doc(db, 'bills', currentBillId), paymentData);

      // Cancel associated order if exists
      if (currentOrderId) {
        await updateDoc(doc(db, 'orders', currentOrderId), {
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
      }

      // Save payment details for printing
      setSavedPaymentMethod(paymentData.paymentMethod);
      setSavedSplitPayment(paymentData.splitPayment || null);
      setSavedAmountReceived(paymentData.amountReceived);
      setSavedChange(paymentData.change);

      toast.success('Payment completed successfully!');
      setShowPaymentModal(false);
      
      // Reset form
      resetBillForm();
      fetchBills(1);
      fetchTotalBillsCount();
      fetchBillStats();
    } catch (error) {
      console.error('Error completing payment:', error);
      toast.error('Failed to complete payment');
    } finally {
      setProcessing(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!currentBillId) {
      toast.error('No active bill to cancel');
      return;
    }

    if (!confirm('Are you sure you want to cancel all orders for this bill?')) {
      return;
    }

    try {
      // Get all order IDs from bill items
      const allOrderIds = billItems
        .filter(item => item.orderIds && item.orderIds.length > 0)
        .flatMap(item => item.orderIds.map(order => order.orderDocId));

      // Cancel all orders
      if (allOrderIds.length > 0) {
        await Promise.all(allOrderIds.map(orderDocId =>
          updateDoc(doc(db, 'orders', orderDocId), {
            status: 'cancelled',
            updatedAt: new Date().toISOString()
          })
        ));
      }

      // Update bill status
      await updateDoc(doc(db, 'bills', currentBillId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });

      toast.success('All orders cancelled successfully');
      resetBillForm();
      fetchBills(1);
      fetchBillStats();
    } catch (error) {
      console.error('Error cancelling orders:', error);
      toast.error('Failed to cancel orders');
    }
  };

  // Reset bill form
  const resetBillForm = () => {
    setSelectedTable(null);
    setSelectedFloor('all');
    setSelectedCategory('');
    setBillItems([]);
    setCustomerName('');
    setSearchQuery('');
    setCurrentBillId(null);
    setCurrentOrderId(null);
    setAmountReceived('');
    setPaymentMethod('cash');
    setBillType('dine-in');
    setDiscount(0);
    setSavedDiscount(0);
    setPlatformOrderId('');
    // Reset saved payment details
    setSavedPaymentMethod(null);
    setSavedSplitPayment(null);
    setSavedAmountReceived(0);
    setSavedChange(0);
    // Reset split payment states
    setIsSplitPayment(false);
    setSplitMethods(['cash', 'upi']);
    setCashAmount('');
    setCardAmount('');
    setUpiAmount('');
  };

  // Load bill for editing
  const loadBillForEditing = async (bill) => {
    // Scroll to add bill section
    setShowAddBill(true);
    setTimeout(() => {
      if (addBillSectionRef.current) {
        addBillSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Load bill data
    setBillItems(bill.items || []);
    setCustomerName(bill.customerName || '');
    setCurrentBillId(bill.id);
    setCurrentOrderId(bill.orderId || null);
    setBillType(bill.type || 'dine-in');
    setDiscount(bill.discount || 0);
    setSavedDiscount(bill.discount || 0);
    setPlatformOrderId(bill.platformOrderId || '');

    // Load table if dine-in
    if (bill.type === 'dine-in' && bill.tableId) {
      const table = tables.find(t => t.id === bill.tableId);
      if (table) {
        setSelectedTable(table);
        const tableFloor = floors.find(f => f.id === table.floorId);
        if (tableFloor) {
          setSelectedFloor(tableFloor.id);
        }
      }
    }

    toast.success('Bill loaded for editing');
  };

  // Pagination
  const totalPages = Math.ceil(totalBills / ITEMS_PER_PAGE);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchBills(page);
  };

  const getFoodTypeColor = (type) => {
    switch(type) {
      case 'veg': return 'bg-green-500';
      case 'nonveg': return 'bg-red-500';
      case 'egg': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Today's Billing Stats */}
      <div className="bg-white border border-gray-200 p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-bold text-gray-900">Today's Billing Summary</h2>
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
          {/* Total */}
          <div className="bg-gray-50 border border-gray-200 p-2 md:p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Total Bills</p>
            <p className="text-lg md:text-xl font-bold text-gray-900">{billStats.total.count}</p>
            <p className="text-xs md:text-sm text-gray-600">₹{billStats.total.amount.toFixed(0)}</p>
          </div>
          {/* Dine In */}
          <div className="bg-blue-50 border border-blue-200 p-2 md:p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">Dine In</p>
            <p className="text-lg md:text-xl font-bold text-blue-700">{billStats.dineIn.count}</p>
            <p className="text-xs md:text-sm text-blue-600">₹{billStats.dineIn.amount.toFixed(0)}</p>
          </div>
          {/* Take Away */}
          <div className="bg-purple-50 border border-purple-200 p-2 md:p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">Take Away</p>
            <p className="text-lg md:text-xl font-bold text-purple-700">{billStats.takeAway.count}</p>
            <p className="text-xs md:text-sm text-purple-600">₹{billStats.takeAway.amount.toFixed(0)}</p>
          </div>
          {/* Swiggy - Only shown when aggregators enabled */}
          {ENABLE_AGGREGATORS && (
            <div className="bg-orange-50 border border-orange-200 p-2 md:p-3 text-center">
              <p className="text-xs text-orange-600 mb-1">Swiggy</p>
              <p className="text-lg md:text-xl font-bold text-orange-700">{billStats.swiggy.count}</p>
              <p className="text-xs md:text-sm text-orange-600">₹{billStats.swiggy.amount.toFixed(0)}</p>
            </div>
          )}
          {/* Zomato - Only shown when aggregators enabled */}
          {ENABLE_AGGREGATORS && (
            <div className="bg-red-50 border border-red-200 p-2 md:p-3 text-center">
              <p className="text-xs text-red-600 mb-1">Zomato</p>
              <p className="text-lg md:text-xl font-bold text-red-700">{billStats.zomato.count}</p>
              <p className="text-xs md:text-sm text-red-600">₹{billStats.zomato.amount.toFixed(0)}</p>
            </div>
          )}
          {/* Paid */}
          <div className="bg-green-50 border border-green-200 p-2 md:p-3 text-center">
            <p className="text-xs text-green-600 mb-1">Paid</p>
            <p className="text-lg md:text-xl font-bold text-green-700">{billStats.paid.count}</p>
            <p className="text-xs md:text-sm text-green-600">₹{billStats.paid.amount.toFixed(0)}</p>
          </div>
          {/* Open/Unpaid */}
          <div className="bg-yellow-50 border border-yellow-200 p-2 md:p-3 text-center">
            <p className="text-xs text-yellow-600 mb-1">Unpaid</p>
            <p className="text-lg md:text-xl font-bold text-yellow-700">{billStats.open.count}</p>
            <p className="text-xs md:text-sm text-yellow-600">₹{billStats.open.amount.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Billing</h1>
        {showAddBill && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs md:text-sm font-medium whitespace-nowrap">Bill For</span>
              <button
                type="button"
                onClick={() => setBillType('dine-in')}
                className={`px-2 md:px-3 py-1 rounded border text-xs md:text-sm font-medium transition-colors cursor-pointer ${billType === 'dine-in' ? 'bg-[#ec2b25] text-white border-[#ec2b25]' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
              >
                Dine In
              </button>
              <button
                type="button"
                onClick={() => setBillType('take-away')}
                className={`px-2 md:px-3 py-1 rounded border text-xs md:text-sm font-medium transition-colors cursor-pointer ${billType === 'take-away' ? 'bg-[#ec2b25] text-white border-[#ec2b25]' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
              >
                Take Away
              </button>
              {ENABLE_AGGREGATORS && (
                <>
                  <button
                    type="button"
                    onClick={() => setBillType('swiggy')}
                    className={`px-2 md:px-3 py-1 rounded border text-xs md:text-sm font-medium transition-colors cursor-pointer ${billType === 'swiggy' ? 'bg-[#ec2b25] text-white border-[#ec2b25]' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
                  >
                    Swiggy
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillType('zomato')}
                    className={`px-2 md:px-3 py-1 rounded border text-xs md:text-sm font-medium transition-colors cursor-pointer ${billType === 'zomato' ? 'bg-[#ec2b25] text-white border-[#ec2b25]' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
                  >
                    Zomato
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setShowAddBill(!showAddBill)}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer text-sm md:text-base"
            >
              <Plus className="w-3 md:w-4 h-3 md:h-4" />
              <span>{showAddBill ? 'Close' : 'Add Bill'}</span>
            </button>
          </div>
        )}
        {!showAddBill && (
          <button
            onClick={() => setShowAddBill(!showAddBill)}
            className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer text-sm md:text-base w-full sm:w-auto"
          >
            <Plus className="w-3 md:w-4 h-3 md:h-4" />
            <span>{showAddBill ? 'Close' : 'Add Bill'}</span>
          </button>
        )}
      </div>

      {/* Add Bill Section */}
      {showAddBill && (
        <div ref={addBillSectionRef} className="bg-white border border-gray-200 p-3 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            {/* Column 1: Tables Selection or Customer Name */}
            {billType === 'dine-in' && (
              <div className="lg:col-span-3 lg:border-r border-gray-200 lg:pr-4">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Select Table</h3>
                
                {/* Customer Name */}
                <div className="mb-3 md:mb-4">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="w-full px-2 md:px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25] text-xs md:text-sm"
                  />
                </div>

                {/* Floor Filter */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedFloor('all')}
                      className={`px-3 py-1 text-sm border cursor-pointer ${
                        selectedFloor === 'all' ? 'bg-[#ec2b25] text-white border-[#ec2b25]' : 'border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      All
                    </button>
                    {floors.map(floor => (
                      <button
                        key={floor.id}
                        onClick={() => setSelectedFloor(floor.id)}
                        className={`px-3 py-1 text-sm border cursor-pointer ${
                          selectedFloor === floor.id ? 'bg-[#ec2b25] text-white border-[#ec2b25]' : 'border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {floor.shortCode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                  {filteredTables.map(table => {
                    const openBillsCount = bills.filter(bill => bill.tableId === table.id && bill.status === 'open').length;
                    return (
                      <button
                        key={table.id}
                        onClick={() => handleTableSelect(table)}
                        className={`aspect-square border-2 flex flex-col items-center justify-center cursor-pointer transition-colors relative ${
                          selectedTable?.id === table.id
                            ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                            : openBillsCount > 0
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-mono font-bold">{table.shortCode}</span>
                        {openBillsCount > 0 && selectedTable?.id !== table.id && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {openBillsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {selectedTable && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200">
                    <p className="text-sm text-gray-600">Selected Table:</p>
                    <p className="font-medium text-gray-900">{selectedTable.name} ({selectedTable.shortCode})</p>
                    {displayBillId && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Current Bill:</p>
                        <p className="text-sm font-mono font-bold text-[#ec2b25]">{displayBillId}</p>
                      </div>
                    )}
                    {!displayBillId && billItems.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-orange-600 font-medium">New bill (not saved yet)</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {(billType === 'take-away' || billType === 'swiggy' || billType === 'zomato') && (
              <div className="lg:col-span-3 lg:border-r border-gray-200 lg:pr-4">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Customer Details</h3>
                {/* Customer Name for Take Away/Swiggy/Zomato */}
                <div className="mb-3 md:mb-4">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="w-full px-2 md:px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25] text-xs md:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Column 2: Items Selection */}
            <div className="lg:col-span-6 lg:border-r border-gray-200 lg:pr-4">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Select Items</h3>
              
              {/* Item Search */}
              <div className="mb-3 md:mb-4">
                <div className="relative">
                  <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Search by name, code, price..."
                    className="w-full pl-8 md:pl-9 pr-2 md:pr-3 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25] text-xs md:text-sm"
                  />
                  {itemSearchQuery && (
                    <button
                      onClick={() => setItemSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Categories Sidebar + Items Grid */}
              <div className="flex gap-3">
                {/* Categories Sidebar */}
                <div className="w-28 md:w-32 flex-shrink-0 max-h-80 md:max-h-[32rem] overflow-y-auto border-r border-gray-200 pr-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`w-full px-2 py-2 text-left text-xs md:text-sm mb-1 transition-colors cursor-pointer ${
                      selectedCategory === '' ? 'bg-[#ec2b25] text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full px-2 py-2 text-left text-xs md:text-sm mb-1 transition-colors cursor-pointer flex items-center gap-1 ${
                        selectedCategory === category.id ? 'bg-[#ec2b25] text-white' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>{category.emoji}</span>
                      <span className="truncate">{category.name}</span>
                    </button>
                  ))}
                </div>

                {/* Items List */}
                <div ref={itemsListRef} className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 md:max-h-[32rem] overflow-y-auto">
                {filteredItems.map(item => {
                  const itemCategory = categories.find(cat => cat.id === item.categoryId);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addItemToBill(item)}
                      className="p-2 border border-gray-200 hover:border-[#ec2b25] hover:bg-gray-50 text-left cursor-pointer transition-colors flex flex-row items-center gap-3"
                    >
                      {/* Image - Left Side */}
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🍽️</span>
                        )}
                      </div>
                      
                      {/* Right Side - Details */}
                      <div className="flex-1 min-w-0">
                        {/* Veg/Non-veg Symbol + Name */}
                        <div className="flex items-start gap-1 mb-1">
                          <div className={`w-3 h-3 md:w-4 md:h-4 border ${item.type === 'veg' ? 'border-green-600' : item.type === 'egg' ? 'border-yellow-600' : 'border-red-600'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${getFoodTypeColor(item.type)}`}></div>
                          </div>
                          <p className="font-medium text-xs md:text-sm leading-tight line-clamp-2">{item.name}</p>
                        </div>
                        
                        {/* Category */}
                        {itemCategory && (
                          <p className="text-xs text-gray-500 mb-1 truncate">
                            {itemCategory.emoji} {itemCategory.name}
                          </p>
                        )}
                        
                        {/* Price */}
                        <p className="font-bold text-sm md:text-base text-[#ec2b25]">₹{item.price}</p>
                      </div>
                    </button>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Column 3: Bill Summary */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Bill Summary</h3>
                {billType === 'dine-in' && selectedTable && (
                  <button
                    onClick={() => startNewBillForTable(selectedTable)}
                    className="text-xs px-2 py-1 border border-[#ec2b25] text-[#ec2b25] hover:bg-[#ec2b25] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    New Bill
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-64 md:max-h-80 overflow-y-auto mb-3 md:mb-4">
                {billItems.length === 0 ? (
                  <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">No items added</p>
                ) : (
                  billItems.map(item => (
                    <div key={item.id} className="p-2 md:p-3 border border-gray-200">
                      <div className="flex items-start gap-2 mb-2">
                        {/* Image */}
                        {/* <div className="text-2xl flex-shrink-0"><img src={item.image} alt="" /></div> */}
                        
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1">
                            {/* Veg/Non-veg Symbol */}
                            <div className={`w-3 h-3 border ${item.type === 'veg' ? 'border-green-600' : item.type === 'egg' ? 'border-yellow-600' : 'border-red-600'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${getFoodTypeColor(item.type)}`}></div>
                            </div>
                            <p className="font-medium text-xs md:text-sm leading-tight">
                              {item.name} {item.kotSent && <span className='ml-1 px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs'>KOT</span>}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">₹{item.price} each</p>
                          {item.orderIds && item.orderIds.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.orderIds.map((order, idx) => (
                                <span key={idx} className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  {order.orderId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveClick(item)}
                          className="p-1 hover:bg-red-50 text-red-600 cursor-pointer flex-shrink-0"
                          title="Remove item"
                        >
                          <X className="w-3 md:w-4 h-3 md:h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 md:space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 md:w-7 md:h-7 border border-gray-300 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 md:w-8 text-center font-medium text-xs md:text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 md:w-7 md:h-7 border border-gray-300 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-xs md:text-sm ml-2">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal, Discount, and Total */}
              <div className="border-t-2 border-gray-900 pt-3 md:pt-4 mb-3 md:mb-4">
                <div className="flex items-center justify-between mb-2 text-xs md:text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-medium">₹{calculateSubtotal()}</span>
                </div>
                
                {/* Discount Input */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs md:text-sm text-gray-700">Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 md:w-24 px-2 py-1 border border-gray-200 focus:outline-none focus:border-[#ec2b25] text-xs md:text-sm text-right"
                    placeholder="0.00"
                  />
                </div>
                
                {/* Show saved discount */}
                {savedDiscount > 0 && (
                  <div className="flex items-center justify-between mb-2 text-xs md:text-sm text-green-600">
                    <span>Applied Discount:</span>
                    <span>- ₹{savedDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Show pending discount indicator if different from saved */}
                {discount !== savedDiscount && discount > 0 && (
                  <div className="flex items-center justify-between mb-2 text-xs md:text-sm text-orange-500">
                    <span>Pending Discount:</span>
                    <span>- ₹{discount.toFixed(2)} (save to apply)</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-2 pt-2 border-t border-gray-300">
                  <span className="text-base md:text-lg font-bold">Total:</span>
                  <span className="text-lg md:text-2xl font-bold text-[#ec2b25]">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Bluetooth Connect Button (Mobile Only) */}
              {isMobile() && isWebBluetoothAvailable() && (
                <button
                  onClick={handleConnectBluetooth}
                  disabled={connectingBluetooth}
                  className={`w-full mb-2 flex items-center justify-center space-x-2 px-3 py-2 rounded transition-colors cursor-pointer ${
                    bluetoothConnected 
                      ? 'bg-green-100 text-green-700 border border-green-500' 
                      : 'bg-blue-100 text-blue-700 border border-blue-500 hover:bg-blue-200'
                  }`}
                >
                  {connectingBluetooth ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-4 h-4" />
                      <span className="text-xs">
                        {bluetoothConnected ? '✓ Bluetooth Connected' : 'Connect Bluetooth Printer'}
                      </span>
                    </>
                  )}
                </button>
              )}
              
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={handleSaveBill}
                  disabled={saving}
                  className="flex flex-col items-center justify-center px-2 py-2 md:py-3 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 md:w-5 h-4 md:h-5 animate-spin mb-1" />
                      <span className="text-xs">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 md:w-5 h-4 md:h-5 mb-1" />
                      <span className="text-xs">Save</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveAndPrint}
                  disabled={saving}
                  className="flex flex-col items-center justify-center px-2 py-2 md:py-3 border border-[#ec2b25] text-[#ec2b25] hover:bg-[#ec2b25] hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 md:w-5 h-4 md:h-5 mb-1" />
                  <span className="text-xs">Save & Print</span>
                </button>
                <button
                  onClick={handleSaveAndKOT}
                  disabled={saving}
                  className="flex flex-col items-center justify-center px-2 py-2 md:py-3 border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ClipboardList className="w-4 md:w-5 h-4 md:h-5 mb-1" />
                  <span className="text-xs">Save & KOT</span>
                </button>
                <button
                  onClick={handlePayment}
                  disabled={!currentBillId}
                  className="flex flex-col items-center justify-center px-2 py-2 md:py-3 bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-4 md:w-5 h-4 md:h-5 mb-1" />
                  <span className="text-xs">Payment</span>
                </button>
              </div>
              
              {/* Cancel Order Button */}
              {currentBillId && billItems.some(item => item.orderIds && item.orderIds.length > 0) && (
                <button
                  onClick={handleCancelOrder}
                  className="w-full mt-2 flex items-center justify-center space-x-2 px-3 md:px-4 py-2 border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 md:w-4 h-3 md:h-4" />
                  <span className="text-xs md:text-sm font-medium">Cancel All Orders</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bills List */}
      <div className="bg-white border border-gray-200 p-3 md:p-6">
        <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Recent Bills</h2>
        
        {loading ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">Loading...</div>
        ) : bills.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">No bills yet</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bills.map(bill => {
                const getBillTypeColor = (type) => {
                  switch(type) {
                    case 'dine-in': return 'bg-blue-100 text-blue-800 border-blue-300';
                    case 'take-away': return 'bg-purple-100 text-purple-800 border-purple-300';
                    case 'swiggy': return 'bg-orange-100 text-orange-800 border-orange-300';
                    case 'zomato': return 'bg-red-100 text-red-800 border-red-300';
                    default: return 'bg-gray-100 text-gray-800 border-gray-300';
                  }
                };
                
                const getBillTypeLabel = (type) => {
                  switch(type) {
                    case 'dine-in': return 'Dine In';
                    case 'take-away': return 'Take Away';
                    case 'swiggy': return 'Swiggy';
                    case 'zomato': return 'Zomato';
                    default: return type;
                  }
                };
                
                return (
                  <div 
                    key={bill.id} 
                    onClick={() => bill.status === 'open' && loadBillForEditing(bill)}
                    className={`border-2 border-gray-200 bg-white hover:shadow-lg transition-all ${bill.status === 'open' ? 'cursor-pointer hover:border-[#ec2b25]' : 'cursor-default'}`}
                  >
                    {/* Header */}
                    <div className="bg-gray-50 px-3 md:px-4 py-2 md:py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1 md:space-x-2 min-w-0 flex-1">
                          <span className={`px-2 md:px-3 py-1 text-xs font-bold border truncate ${getBillTypeColor(bill.type)}`}>
                            {getBillTypeLabel(bill.type)}
                          </span>
                          {bill.billId && (
                            <span className="text-xs font-mono font-semibold text-gray-700 truncate">{bill.billId}</span>
                          )}
                        </div>
                        <span className={`px-1.5 md:px-2 py-1 text-xs font-bold uppercase flex-shrink-0 ${
                          bill.status === 'open' 
                            ? 'bg-orange-500 text-white' 
                            : bill.status === 'paid' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-500 text-white'
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          {bill.tableName && <p className="font-bold text-sm md:text-base text-gray-900 truncate">{bill.tableName}</p>}
                          <p className="text-xs md:text-sm text-gray-600 truncate">{bill.customerName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="px-3 md:px-4 py-2 md:py-3 max-h-32 md:max-h-40 overflow-y-auto">
                      <div className="space-y-1.5">
                        {bill.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs md:text-sm bg-gray-50 p-1.5 md:p-2 border border-gray-200">
                            {/* Image */}
                            {/* <span className="text-base flex-shrink-0">{item.image || '🍽️'}</span> */}
                            {/* Veg/Non-veg Symbol */}
                            <div className={`w-3 h-3 border ${item.type === 'veg' ? 'border-green-600' : item.type === 'egg' ? 'border-yellow-600' : 'border-red-600'} flex items-center justify-center flex-shrink-0`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${getFoodTypeColor(item.type)}`}></div>
                            </div>
                            {/* Name & Qty */}
                            <div className="flex items-center min-w-0 flex-1 gap-1">
                              <span className="font-medium text-gray-900 truncate">{item.name}</span>
                              <span className="text-xs text-gray-500 flex-shrink-0">x{item.quantity}</span>
                            </div>
                            {/* Price */}
                            <span className="font-semibold text-gray-900 flex-shrink-0">₹{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bill Details */}
                    <div className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 border-t border-gray-200">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs md:text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium text-gray-900">₹{bill.subtotal?.toFixed(2)}</span>
                        </div>
                        {bill.discount > 0 && (
                          <div className="flex items-center justify-between text-xs md:text-sm text-green-600">
                            <span>Discount ({bill.discount}%):</span>
                            <span>- ₹{((bill.subtotal * bill.discount) / 100).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                          <span className="text-sm md:text-base font-bold text-gray-900">Total:</span>
                          <span className="text-base md:text-xl font-bold text-[#ec2b25]">₹{bill.total?.toFixed(2)}</span>
                        </div>
                        {bill.status === 'paid' && bill.paymentMethod && (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Payment:</span>
                              <span className="font-medium uppercase">{bill.paymentMethod}</span>
                            </div>
                            {bill.amountReceived && (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Received:</span>
                                  <span className="font-medium">₹{bill.amountReceived}</span>
                                </div>
                                {bill.change > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Change:</span>
                                    <span className="font-medium text-green-600">₹{bill.change.toFixed(2)}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-white border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(bill.createdAt).toLocaleString('en-IN')}</span>
                        <div className="flex items-center gap-2">
                          {bill.status === 'paid' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintPaidBill(bill);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-[#ec2b25] text-white hover:bg-[#d12520] transition-colors cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print</span>
                            </button>
                          )}
                          {bill.status === 'paid' && bill.paidAt && (
                            <span className="text-green-600 font-medium">Paid: {new Date(bill.paidAt).toLocaleTimeString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-4 md:mt-6">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 md:p-2 border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-xs md:text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 md:p-2 border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Remove Item Confirmation Modal */}
      {showRemoveModal && itemToRemove && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Remove Item
              </h2>
              <p className="text-xs md:text-sm text-gray-600">
                Are you sure you want to remove all quantity of this item from the bill?
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 md:p-4 mb-4">
              <div className="font-medium text-sm md:text-base text-gray-900">{itemToRemove.name}</div>
              <div className="text-xs md:text-sm text-gray-600 mt-1">
                Quantity: <span className="font-bold">{itemToRemove.quantity}</span>
              </div>
              <div className="text-xs md:text-sm text-gray-600">
                Total: <span className="font-bold">₹{(itemToRemove.price * itemToRemove.quantity).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 md:space-x-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setItemToRemove(null);
                }}
                className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await removeItemFromBill(itemToRemove.id);
                  setShowRemoveModal(false);
                  setItemToRemove(null);
                }}
                className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Order ID Modal (Swiggy/Zomato) */}
      {showPlatformModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                {billType === 'swiggy' ? 'Swiggy' : 'Zomato'} Order Details
              </h2>
              <p className="text-xs md:text-sm text-gray-600">
                Please enter the order details
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              {/* Platform Order ID */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  {billType === 'swiggy' ? 'Swiggy' : 'Zomato'} Order ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={platformOrderId}
                  onChange={(e) => setPlatformOrderId(e.target.value)}
                  placeholder={`Enter ${billType === 'swiggy' ? 'Swiggy' : 'Zomato'} order ID`}
                  className="w-full px-2 md:px-3 py-2 text-sm md:text-base border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25]"
                  autoFocus
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Customer Name <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-2 md:px-3 py-2 text-sm md:text-base border-2 border-gray-200 focus:outline-none focus:border-[#ec2b25]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 md:space-x-3 mt-4 md:mt-6">
              <button
                onClick={() => {
                  setShowPlatformModal(false);
                  setPlatformOrderId('');
                }}
                className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!platformOrderId.trim()) {
                    toast.error(`Please enter ${billType === 'swiggy' ? 'Swiggy' : 'Zomato'} order ID`);
                    return;
                  }
                  setShowPlatformModal(false);
                  handleSaveBill();
                }}
                disabled={!platformOrderId.trim()}
                className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base bg-[#ec2b25] text-white hover:bg-[#d12520] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Complete Payment</h2>
              
              <div className="space-y-3 md:space-y-4">
                {/* Bill Summary */}
                <div className="bg-gray-50 border border-gray-200 p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm text-gray-600">Table:</span>
                    <span className="font-medium text-sm md:text-base">{selectedTable?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm text-gray-600">Customer:</span>
                    <span className="font-medium text-sm md:text-base">{customerName || 'Guest'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm text-gray-600">Items:</span>
                    <span className="font-medium text-sm md:text-base">{billItems.length}</span>
                  </div>
                  <div className="border-t border-gray-300 mt-2 md:mt-3 pt-2 md:pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base md:text-lg">Total:</span>
                      <span className="font-bold text-lg md:text-2xl text-[#ec2b25]">₹{calculateTotal()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Type Toggle */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    Payment Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setIsSplitPayment(false);
                        setAmountReceived(calculateTotal().toString());
                      }}
                      className={`px-3 py-2 text-sm font-medium border cursor-pointer ${
                        !isSplitPayment
                          ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Full Payment
                    </button>
                    <button
                      onClick={() => {
                        setIsSplitPayment(true);
                        setCashAmount('');
                        setUpiAmount('');
                      }}
                      className={`px-3 py-2 text-sm font-medium border cursor-pointer ${
                        isSplitPayment
                          ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Split Bill
                    </button>
                  </div>
                </div>

                {/* Full Payment Options */}
                {!isSplitPayment && (
                  <>
                    {/* Payment Method */}
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setPaymentMethod('cash')}
                          className={`px-2 md:px-4 py-2 text-xs md:text-sm border cursor-pointer ${
                            paymentMethod === 'cash'
                              ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          Cash
                        </button>
                        <button
                          onClick={() => setPaymentMethod('card')}
                          className={`px-2 md:px-4 py-2 text-xs md:text-sm border cursor-pointer ${
                            paymentMethod === 'card'
                              ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          Card
                        </button>
                        <button
                          onClick={() => setPaymentMethod('upi')}
                          className={`px-2 md:px-4 py-2 text-xs md:text-sm border cursor-pointer ${
                            paymentMethod === 'upi'
                              ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          UPI
                        </button>
                      </div>
                    </div>

                    {/* Amount Received */}
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Amount Received
                      </label>
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-2 md:px-3 py-2 text-sm md:text-base border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
                      />
                    </div>

                    {/* Change */}
                    {amountReceived && parseFloat(amountReceived) >= calculateTotal() && (
                      <div className="bg-green-50 border border-green-200 p-2 md:p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs md:text-sm text-green-700">Change to return:</span>
                          <span className="font-bold text-sm md:text-base text-green-700">
                            ₹{(parseFloat(amountReceived) - calculateTotal()).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Split Payment Options */}
                {isSplitPayment && (
                  <>
                    {/* Select Split Methods */}
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Select Payment Methods (choose 2)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            if (splitMethods.includes('cash')) {
                              if (splitMethods.length > 1) {
                                setSplitMethods(splitMethods.filter(m => m !== 'cash'));
                                setCashAmount('');
                              }
                            } else if (splitMethods.length < 2) {
                              setSplitMethods([...splitMethods, 'cash']);
                            }
                          }}
                          className={`px-2 md:px-4 py-2 text-xs md:text-sm border cursor-pointer ${
                            splitMethods.includes('cash')
                              ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          Cash
                        </button>
                        <button
                          onClick={() => {
                            if (splitMethods.includes('card')) {
                              if (splitMethods.length > 1) {
                                setSplitMethods(splitMethods.filter(m => m !== 'card'));
                                setCardAmount('');
                              }
                            } else if (splitMethods.length < 2) {
                              setSplitMethods([...splitMethods, 'card']);
                            }
                          }}
                          className={`px-2 md:px-4 py-2 text-xs md:text-sm border cursor-pointer ${
                            splitMethods.includes('card')
                              ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          Card
                        </button>
                        <button
                          onClick={() => {
                            if (splitMethods.includes('upi')) {
                              if (splitMethods.length > 1) {
                                setSplitMethods(splitMethods.filter(m => m !== 'upi'));
                                setUpiAmount('');
                              }
                            } else if (splitMethods.length < 2) {
                              setSplitMethods([...splitMethods, 'upi']);
                            }
                          }}
                          className={`px-2 md:px-4 py-2 text-xs md:text-sm border cursor-pointer ${
                            splitMethods.includes('upi')
                              ? 'border-[#ec2b25] bg-[#ec2b25] text-white'
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          UPI
                        </button>
                      </div>
                    </div>

                    {/* Cash Amount */}
                    {splitMethods.includes('cash') && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Cash Amount
                      </label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="Enter cash amount"
                        className="w-full px-2 md:px-3 py-2 text-sm md:text-base border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
                      />
                    </div>
                    )}

                    {/* Card Amount */}
                    {splitMethods.includes('card') && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        Card Amount
                      </label>
                      <input
                        type="number"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="Enter card amount"
                        className="w-full px-2 md:px-3 py-2 text-sm md:text-base border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
                      />
                    </div>
                    )}

                    {/* UPI Amount */}
                    {splitMethods.includes('upi') && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                        UPI Amount
                      </label>
                      <input
                        type="number"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        placeholder="Enter UPI amount"
                        className="w-full px-2 md:px-3 py-2 text-sm md:text-base border border-gray-200 focus:outline-none focus:border-[#ec2b25]"
                      />
                    </div>
                    )}

                    {/* Split Summary */}
                    <div className="bg-blue-50 border border-blue-200 p-3">
                      <div className="space-y-2">
                        {splitMethods.includes('cash') && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700">Cash:</span>
                          <span className="font-medium text-blue-700">₹{parseFloat(cashAmount) || 0}</span>
                        </div>
                        )}
                        {splitMethods.includes('card') && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700">Card:</span>
                          <span className="font-medium text-blue-700">₹{parseFloat(cardAmount) || 0}</span>
                        </div>
                        )}
                        {splitMethods.includes('upi') && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700">UPI:</span>
                          <span className="font-medium text-blue-700">₹{parseFloat(upiAmount) || 0}</span>
                        </div>
                        )}
                        <div className="flex items-center justify-between text-sm border-t border-blue-200 pt-2">
                          <span className="font-bold text-blue-800">Total Received:</span>
                          <span className="font-bold text-blue-800">₹{(parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(upiAmount) || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700">Bill Total:</span>
                          <span className="font-medium text-blue-700">₹{calculateTotal()}</span>
                        </div>
                        {((parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(upiAmount) || 0)) >= calculateTotal() && (
                          <div className="flex items-center justify-between text-sm bg-green-100 p-2 mt-2">
                            <span className="text-green-700">Change to return:</span>
                            <span className="font-bold text-green-700">
                              ₹{((parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(upiAmount) || 0) - calculateTotal()).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {((parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(upiAmount) || 0)) < calculateTotal() && (
                          <div className="flex items-center justify-between text-sm bg-red-100 p-2 mt-2">
                            <span className="text-red-700">Remaining:</span>
                            <span className="font-bold text-red-700">
                              ₹{(calculateTotal() - (parseFloat(cashAmount) || 0) - (parseFloat(cardAmount) || 0) - (parseFloat(upiAmount) || 0)).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 md:space-x-3 mt-4 md:mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processing}
                  className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={completePayment}
                  disabled={
                    processing || 
                    (isSplitPayment 
                      ? ((parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(upiAmount) || 0)) < calculateTotal()
                      : (!amountReceived || parseFloat(amountReceived) < calculateTotal())
                    )
                  }
                  className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Complete Payment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Bills Selection Modal */}
      {showTableBillsModal && pendingTable && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gray-50 px-4 md:px-6 py-4 border-b-2 border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  {pendingTable.name}
                </h2>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  {tableBills.length} open bill{tableBills.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTableBillsModal(false);
                  setPendingTable(null);
                  setTableBills([]);
                }}
                className="p-2 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body - List of Open Bills */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {tableBills.map((bill, index) => (
                <button
                  key={bill.id}
                  onClick={() => loadSpecificBill(bill, pendingTable)}
                  className="w-full text-left border-2 border-gray-200 hover:border-[#ec2b25] transition-colors cursor-pointer"
                >
                  {/* Bill Header */}
                  <div className="bg-gray-50 px-3 md:px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-700">
                        {bill.billId || `Bill ${index + 1}`}
                      </span>
                      <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold">
                        OPEN
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {/* Bill Items Preview */}
                  <div className="px-3 md:px-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">{bill.customerName || 'Guest'}</span>
                      <span className="text-xs text-gray-600">{bill.items?.length || 0} items</span>
                    </div>
                    <div className="space-y-1.5 max-h-24 overflow-hidden">
                      {bill.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          {/* <span className="flex-shrink-0">{item.image || '🍽️'}</span> */}
                          <div className={`w-2.5 h-2.5 border ${item.type === 'veg' ? 'border-green-600' : item.type === 'egg' ? 'border-yellow-600' : 'border-red-600'} flex items-center justify-center flex-shrink-0`}>
                            <div className={`w-1 h-1 rounded-full ${getFoodTypeColor(item.type)}`}></div>
                          </div>
                          <span className="text-gray-700 truncate flex-1">{item.name}</span>
                          <span className="text-gray-500 flex-shrink-0">x{item.quantity}</span>
                          <span className="text-gray-900 font-medium flex-shrink-0">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                      {bill.items?.length > 3 && (
                        <p className="text-xs text-gray-400">+{bill.items.length - 3} more items...</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Bill Total */}
                  <div className="bg-gray-50 px-3 md:px-4 py-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="text-base font-bold text-[#ec2b25]">₹{bill.total?.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Modal Footer - New Bill Button */}
            <div className="px-4 md:px-6 py-4 border-t-2 border-gray-200 bg-gray-50">
              <button
                onClick={() => startNewBillForTable(pendingTable)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#ec2b25] text-white hover:bg-[#d12620] transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Start New Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Bill for Printing */}
      <ThermalBill
        ref={printRef}
        billData={{
          billNo: currentBillId ? currentBillId.slice(-6).toUpperCase() : 'NEW',
          orderNo: currentBillId ? currentBillId.slice(-4).toUpperCase() : 'NEW',
          kotNo: '1',
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          type: billType === 'dine-in' ? 'Dine In' : 'Take Away',
          table: selectedTable ? selectedTable.shortCode : 'N/A',
          user: 'Admin',
          items: billItems,
          subtotal: calculateSubtotal(),
          discountAmount: savedDiscount,
          totalAmount: calculateTotal(),
          totalQty: billItems.reduce((sum, item) => sum + item.quantity, 0),
          paymentMethod: savedPaymentMethod,
          splitPayment: savedSplitPayment,
          amountReceived: savedAmountReceived,
          change: savedChange
        }}
      />
    </div>
  );
};

export default BillingPage;
