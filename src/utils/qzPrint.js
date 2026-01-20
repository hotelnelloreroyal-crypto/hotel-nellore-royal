// QZ Tray printing utility for thermal printers
// Make sure QZ Tray is installed and running on the system
// For mobile: Uses Web Bluetooth API (Chrome Android only)

let qz = null;
let printerConfig = null; // Cache printer config for fast printing (wired thermal for bills)
let kotPrinterConfig = null; // Cache KOT printer config (Bluetooth for kitchen)
let isConnected = false;
let securitySet = false;

// Web Bluetooth for mobile KOT printing
let bluetoothDevice = null;
let bluetoothCharacteristic = null;

// ============================================
// PRINTER CONFIGURATION - SET YOUR PRINTER NAMES HERE
// ============================================
// To find your printer names, run this in browser console after QZ connects:
// qz.printers.find().then(p => console.log('Available Printers:', p));
// Then set the exact printer names below:

// SET YOUR PRINTER NAMES HERE (copy exact name from console log)
const BILL_PRINTER_NAME = null;  // e.g., 'EPSON TM-T82' - for wired thermal (bills)
const KOT_PRINTER_NAME = null;   // e.g., 'BlueTooth Printer' - for Bluetooth (KOT)

// If both should use the same printer, set them to the same name
// const BILL_PRINTER_NAME = 'Your Printer Name';
// const KOT_PRINTER_NAME = 'Your Printer Name';

// ============================================

// Check if running on mobile
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if Web Bluetooth is available
export const isWebBluetoothAvailable = () => {
  return navigator.bluetooth !== undefined;
};

// Initialize QZ (script is loaded in index.html)
export const initQZ = () => {
  if (window.qz) {
    qz = window.qz;
    return true;
  }
  return false;
};

// Setup security (required for QZ Tray)
const setupSecurity = () => {
  if (securitySet || !qz) return;
  
  // Certificate for QZ Tray - using override to skip certificate validation
  // This allows localhost and development environments to work without popups
  qz.security.setCertificatePromise(function(resolve, reject) {
    // For production, replace with your actual certificate
    // You can generate one at: https://qz.io/auth/
    resolve("-----BEGIN CERTIFICATE-----\n" +
      "MIIECzCCAvOgAwIBAgIJALTTCsGu9G4yMA0GCSqGSIb3DQEBCwUAMIGWMQswCQYD\n" +
      "VQQGEwJJTjEMMAoGA1UECAwDVE9OMRUwEwYDVQQHDAxEZWZhdWx0IENpdHkxGjAY\n" +
      "BgNVBAoMEUhSIEZvb2QgQ291cnQgUE9TMQ0wCwYDVQQLDARCaWxsMRMwEQYDVQQD\n" +
      "DApocmZvb2Rjb3VydDEiMCAGCSqGSIb3DQEJARYTYWRtaW5AaHJmb29kY291cnQu\n" +
      "aW4wHhcNMjQwMTAxMDAwMDAwWhcNMzQwMTAxMDAwMDAwWjCBljELMAkGA1UEBhMC\n" +
      "SU4xDDAKBgNVBAgMA1RPTjEVMBMGA1UEBwwMRGVmYXVsdCBDaXR5MRowGAYDVQQK\n" +
      "DBFIUiBGb29kIENvdXJ0IFBPUzENMAsGA1UECwwEQmlsbDETMBEGA1UEAwwKaHJm\n" +
      "b29kY291cnQxIjAgBgkqhkiG9w0BCQEWE2FkbWluQGhyZm9vZGNvdXJ0LmluMIIB\n" +
      "IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0FZ1NSqEUy8mMKkkwDC5PCDZ\n" +
      "-----END CERTIFICATE-----");
  });
  
  // Signature promise - returns empty for unsigned (triggers allow dialog once)
  // For production with proper certificate, implement actual signing
  qz.security.setSignaturePromise(function(toSign) {
    return function(resolve, reject) {
      // To eliminate popups completely, you need to sign with your private key
      // See: https://qz.io/wiki/signing-messages
      resolve("");
    };
  });
  
  securitySet = true;
};

// Connection lock to prevent multiple simultaneous connections
let connectionPromise = null;

// Connect to QZ Tray
export const connectQZ = async () => {
  // If already connecting, wait for that connection
  if (connectionPromise) {
    return connectionPromise;
  }
  
  if (!qz) {
    if (!initQZ()) {
      throw new Error('QZ Tray library not loaded. Please refresh the page.');
    }
  }
  
  // Setup security before connecting
  setupSecurity();
  
  if (qz.websocket.isActive()) {
    isConnected = true;
    return true;
  }
  
  // Create connection promise to prevent race conditions
  connectionPromise = (async () => {
    try {
      await qz.websocket.connect();
      isConnected = true;
      console.log('QZ Tray connected successfully');
      return true;
    } catch (err) {
      isConnected = false;
      console.error('QZ Tray connection failed:', err);
      throw new Error('QZ Tray is not running. Please start QZ Tray application.');
    } finally {
      connectionPromise = null;
    }
  })();
  
  return connectionPromise;
};

// Get and cache printer config for BILL printing (wired thermal)
export const getPrinter = async (printerName = null) => {
  // Return cached config if available
  if (printerConfig && !printerName) {
    return printerConfig;
  }
  
  await connectQZ();
  
  // Use provided name, configured name, or auto-detect
  const targetPrinter = printerName || BILL_PRINTER_NAME;
  
  if (targetPrinter) {
    console.log('Using configured BILL printer:', targetPrinter);
    printerConfig = qz.configs.create(targetPrinter);
    return printerConfig;
  }
  
  // Auto-detect: Try to find a wired thermal printer
  const printers = await qz.printers.find();
  console.log('🖨️ Available printers for BILL:', printers);
  
  // Look for common WIRED thermal printer names (exclude Bluetooth)
  const bluetoothKeywords = ['bluetooth', 'bt-', 'wireless', 'mobile', 'portable'];
  const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'bixolon', '80mm', '58mm', 'gp-', 'xp-', 'tm-'];
  
  // Find thermal printers that are NOT Bluetooth
  const wiredThermalPrinter = printers.find(p => {
    const lower = p.toLowerCase();
    const isBluetooth = bluetoothKeywords.some(kw => lower.includes(kw));
    const isThermal = thermalKeywords.some(kw => lower.includes(kw));
    return isThermal && !isBluetooth;
  });
  
  // If no specific thermal found, just use the first printer that's not Bluetooth
  const nonBluetoothPrinter = printers.find(p => {
    const lower = p.toLowerCase();
    return !bluetoothKeywords.some(kw => lower.includes(kw));
  });
  
  // Use wired thermal if found, then any non-bluetooth, then default
  const selectedPrinter = wiredThermalPrinter || nonBluetoothPrinter || (await qz.printers.getDefault());
  console.log('✅ Selected BILL printer:', selectedPrinter);
  
  printerConfig = qz.configs.create(selectedPrinter);
  return printerConfig;
};

// Get and cache printer config for KOT printing (Bluetooth)
export const getKOTPrinter = async (printerName = null) => {
  // Return cached config if available
  if (kotPrinterConfig && !printerName) {
    return kotPrinterConfig;
  }
  
  await connectQZ();
  
  // Use provided name, configured name, or auto-detect
  const targetPrinter = printerName || KOT_PRINTER_NAME;
  
  if (targetPrinter) {
    console.log('Using configured KOT printer:', targetPrinter);
    kotPrinterConfig = qz.configs.create(targetPrinter);
    return kotPrinterConfig;
  }
  
  // Auto-detect: Try to find a Bluetooth printer for KOT
  const printers = await qz.printers.find();
  console.log('Available printers for KOT:', printers);
  
  // Look for Bluetooth printer keywords
  const bluetoothKeywords = ['bluetooth', 'bt-', 'wireless', 'mobile', 'portable', 'bt ', 'bt_'];
  const bluetoothPrinter = printers.find(p => 
    bluetoothKeywords.some(keyword => p.toLowerCase().includes(keyword))
  );
  
  if (bluetoothPrinter) {
    console.log('Selected KOT printer (Bluetooth):', bluetoothPrinter);
    kotPrinterConfig = qz.configs.create(bluetoothPrinter);
    return kotPrinterConfig;
  }
  
  // No Bluetooth found - show warning and list available printers
  console.warn('⚠️ No Bluetooth printer detected for KOT!');
  console.warn('Available printers:', printers);
  console.warn('Please set KOT_PRINTER_NAME in qzPrint.js with your Bluetooth printer name');
  
  // Fallback to default (not ideal)
  const defaultPrinter = await qz.printers.getDefault();
  console.log('Falling back to default printer for KOT:', defaultPrinter);
  kotPrinterConfig = qz.configs.create(defaultPrinter);
  return kotPrinterConfig;
};

// List all available printers - call this to find your printer names
export const listAllPrinters = async () => {
  try {
    await connectQZ();
    const printers = await qz.printers.find();
    const defaultPrinter = await qz.printers.getDefault();
    
    console.log('='.repeat(50));
    console.log('📋 AVAILABLE PRINTERS:');
    console.log('='.repeat(50));
    printers.forEach((p, i) => {
      const isDefault = p === defaultPrinter ? ' ⭐ (DEFAULT)' : '';
      console.log(`${i + 1}. ${p}${isDefault}`);
    });
    console.log('='.repeat(50));
    console.log('💡 To configure printers, edit qzPrint.js and set:');
    console.log('   BILL_PRINTER_NAME = "Your Wired Printer Name"');
    console.log('   KOT_PRINTER_NAME = "Your Bluetooth Printer Name"');
    console.log('='.repeat(50));
    
    return printers;
  } catch (err) {
    console.error('Failed to list printers:', err);
    throw err;
  }
};

// Pre-connect and cache printer on app load
export const preConnectQZ = async () => {
  try {
    await connectQZ();
    // List available printers for debugging
    const printers = await qz.printers.find();
    console.log('📋 Available Printers:', printers);
    
    await getPrinter();
    // Don't pre-cache KOT printer - let it be selected when needed
    console.log('QZ Tray pre-connected and bill printer cached');
    return true;
  } catch (err) {
    console.warn('QZ Tray pre-connect failed:', err.message);
    return false;
  }
};

// Check if QZ is ready
export const isQZReady = () => {
  return isConnected && printerConfig !== null;
};

// Generate ESC/POS commands for thermal bill (optimized)
export const generateThermalCommands = (billData) => {
  const {
    billNo = 'N/A',
    orderNo = 'N/A',
    kotNo = 'N/A',
    date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type = 'Dine In',
    table = 'N/A',
    user = 'Admin',
    items = [],
    subtotal = 0,
    discountAmount = 0,
    totalAmount = 0,
    totalQty = 0,
    paymentMethod = null,
    splitPayment = null,
    amountReceived = 0,
    change = 0
  } = billData;

  // Restaurant details from env
  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'RESTAURANT';
  const restaurantMobile = import.meta.env.VITE_RESTAURANT_MOBILE || '';
  const restaurantAddress = import.meta.env.VITE_RESTAURANT_ADDRESS || '';
  const restaurantGST = import.meta.env.VITE_RESTAURANT_GST || '';

  // ESC/POS commands
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a\x01';
  const ALIGN_LEFT = ESC + 'a\x00';
  const ALIGN_RIGHT = ESC + 'a\x02';
  const BOLD_ON = ESC + 'E\x01';
  const BOLD_OFF = ESC + 'E\x00';
  const DOUBLE_HEIGHT = GS + '!\x10';
  const DOUBLE_WIDTH = GS + '!\x20';
  const NORMAL_SIZE = GS + '!\x00';
  const PARTIAL_CUT = GS + 'V\x01';
  const LF = '\n';
  
  const W = 48; // Paper width chars (80mm)
  const pad = (s, l) => s.substring(0, l).padEnd(l);
  const padL = (s, l) => s.substring(0, l).padStart(l);
  const line = (c = '-') => c.repeat(W);
  
  // Build command string directly (faster than array)
  let cmd = INIT;
  
  // Header - Restaurant Name (normal size, bold)
  cmd += ALIGN_CENTER + BOLD_ON;
  cmd += restaurantName + LF;
  cmd += BOLD_OFF + LF;
  
  // Address - split long address into multiple lines (max ~40 chars per line)
  if (restaurantAddress) {
    const words = restaurantAddress.split(' ');
    let currentLine = '';
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > 40) {
        cmd += currentLine.trim() + LF;
        currentLine = word;
      } else {
        currentLine = (currentLine + ' ' + word).trim();
      }
    }
    if (currentLine) {
      cmd += currentLine + LF;
    }
  }
  
  // Mobile
  cmd += `Ph: ${restaurantMobile}` + LF;
  
  // GST - only print if available
  if (restaurantGST && restaurantGST.trim() !== '') {
    cmd += `GST: ${restaurantGST}` + LF;
  }
  cmd += LF;
  
  // Date/Time and Type
  cmd += ALIGN_LEFT;
  cmd += `${date} ${time}`.padEnd(W - type.length) + type + LF;
  
  // Bill Info
  cmd += line('=') + LF;
  cmd += ALIGN_CENTER + BOLD_ON + DOUBLE_HEIGHT;
  cmd += `BILL: ${billNo}` + LF;
  cmd += NORMAL_SIZE + `ORDER: ${orderNo} | KOT: ${kotNo}` + LF;
  cmd += BOLD_OFF + line('=') + LF;
  
  // Table/User
  cmd += ALIGN_LEFT;
  cmd += `Table: ${table}`.padEnd(W - `User: ${user}`.length) + `User: ${user}` + LF;
  cmd += line('-') + LF;
  
  // Items Header
  cmd += BOLD_ON;
  cmd += pad('ITEM', 22) + padL('QTY', 6) + padL('RATE', 9) + padL('AMT', 9) + LF;
  cmd += BOLD_OFF + line('-') + LF;
  
  // Items
  items.forEach((item, i) => {
    const name = `${i + 1}.${item.name}`.substring(0, 22);
    cmd += pad(name, 22) + padL(item.quantity.toString(), 6) + padL(item.price.toString(), 9) + padL((item.price * item.quantity).toString(), 9) + LF;
  });
  
  cmd += line('-') + LF;
  
  // Totals
  cmd += `Items: ${totalQty}`.padEnd(W - `Subtotal: Rs.${subtotal}`.length) + `Subtotal: Rs.${subtotal}` + LF;
  
  if (discountAmount > 0) {
    cmd += ''.padEnd(W - `Discount: -Rs.${discountAmount}`.length) + `Discount: -Rs.${discountAmount}` + LF;
  }
  
  cmd += line('=') + LF;
  cmd += BOLD_ON + DOUBLE_HEIGHT + ALIGN_RIGHT;
  cmd += `TOTAL: Rs.${totalAmount}` + LF;
  cmd += NORMAL_SIZE + BOLD_OFF + LF;
  
  // Payment Details
  if (paymentMethod) {
    cmd += ALIGN_LEFT + line('-') + LF;
    if (paymentMethod === 'split' && splitPayment) {
      cmd += BOLD_ON + 'PAYMENT (SPLIT):' + LF + BOLD_OFF;
      if (splitPayment.cash > 0) {
        cmd += `Cash:`.padEnd(W - `Rs.${splitPayment.cash}`.length) + `Rs.${splitPayment.cash}` + LF;
      }
      if (splitPayment.card > 0) {
        cmd += `Card:`.padEnd(W - `Rs.${splitPayment.card}`.length) + `Rs.${splitPayment.card}` + LF;
      }
      if (splitPayment.upi > 0) {
        cmd += `UPI:`.padEnd(W - `Rs.${splitPayment.upi}`.length) + `Rs.${splitPayment.upi}` + LF;
      }
    } else {
      cmd += `PAYMENT (${paymentMethod.toUpperCase()}):`.padEnd(W - `Rs.${amountReceived}`.length) + `Rs.${amountReceived}` + LF;
    }
    if (change > 0) {
      cmd += BOLD_ON + `Change:`.padEnd(W - `Rs.${change}`.length) + `Rs.${change}` + LF + BOLD_OFF;
    }
  }
  
  // Footer
  cmd += ALIGN_CENTER + line('=') + LF;
  cmd += BOLD_ON + 'Thank you! Visit again' + LF;
  cmd += BOLD_OFF + LF + LF + LF;
  
  cmd += PARTIAL_CUT;
  
  return cmd;
};

// Fast print using cached connection and config
export const printThermalBill = async (billData, printerName = null) => {
  try {
    // Force use KOT printer since it's confirmed working
    // If KOT config exists, use it. Otherwise get KOT printer (which works)
    let config;
    if (kotPrinterConfig) {
      config = kotPrinterConfig;
      console.log('🧾 Using cached KOT printer for bill');
    } else {
      config = await getKOTPrinter(printerName);
      console.log('🧾 Got KOT printer for bill');
    }
    
    const commands = generateThermalCommands(billData);
    
    const data = [{ 
      type: 'raw', 
      format: 'plain',
      data: commands
    }];
    
    console.log('🖨️ Sending bill to printer...');
    await qz.print(config, data);
    console.log('✅ Bill printed successfully');
    return { success: true };
  } catch (err) {
    console.error('Print error:', err);
    
    // Provide helpful error messages
    if (err.message?.includes('not accepting job')) {
      console.error('💡 Printer troubleshooting:');
      console.error('   1. Check if printer is turned ON');
      console.error('   2. Check if printer has paper');
      console.error('   3. Open Windows Settings > Printers & check if printer is PAUSED');
      console.error('   4. Try: Right-click printer > See what\'s printing > Printer menu > Resume');
      throw new Error('Printer is off, paused, or has an error. Check printer status.');
    }
    
    // Reset connection on error
    isConnected = false;
    printerConfig = null;
    kotPrinterConfig = null;
    throw err;
  }
};

// Print menu items list
export const printMenuItems = async (items, categories, printerName = null) => {
  try {
    const config = printerConfig || await getPrinter(printerName);
    const commands = generateMenuPrintCommands(items, categories);
    
    const data = [{ 
      type: 'raw', 
      format: 'plain',
      data: commands
    }];
    
    await qz.print(config, data);
    return { success: true };
  } catch (err) {
    console.error('Print menu error:', err);
    isConnected = false;
    printerConfig = null;
    throw err;
  }
};

// Generate ESC/POS commands for menu list
const generateMenuPrintCommands = (items, categories) => {
  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'RESTAURANT';
  
  // ESC/POS commands
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a\x01';
  const ALIGN_LEFT = ESC + 'a\x00';
  const BOLD_ON = ESC + 'E\x01';
  const BOLD_OFF = ESC + 'E\x00';
  const DOUBLE_HEIGHT = GS + '!\x10';
  const NORMAL_SIZE = GS + '!\x00';
  const PARTIAL_CUT = GS + 'V\x01';
  const LF = '\n';
  
  const W = 48;
  const line = (c = '-') => c.repeat(W);
  const padRight = (str, len) => str.substring(0, len).padEnd(len);
  const padLeft = (str, len) => str.substring(0, len).padStart(len);
  
  let cmd = INIT;
  
  // Header
  cmd += ALIGN_CENTER + BOLD_ON + DOUBLE_HEIGHT;
  cmd += restaurantName + LF;
  cmd += NORMAL_SIZE + 'MENU LIST' + LF;
  cmd += BOLD_OFF;
  cmd += new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + LF;
  cmd += line('=') + LF + LF;
  
  // Group items by category
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.id] = cat.name;
  });
  
  const itemsByCategory = {};
  items.forEach(item => {
    const catId = item.categoryId || 'uncategorized';
    if (!itemsByCategory[catId]) {
      itemsByCategory[catId] = [];
    }
    itemsByCategory[catId].push(item);
  });
  
  // Print items by category
  cmd += ALIGN_LEFT;
  
  Object.keys(itemsByCategory).forEach(catId => {
    const categoryName = categoryMap[catId] || 'Other Items';
    const categoryItems = itemsByCategory[catId];
    
    // Category header
    cmd += BOLD_ON + line('-') + LF;
    cmd += categoryName.toUpperCase() + LF;
    cmd += line('-') + LF + BOLD_OFF;
    
    // Items
    categoryItems.forEach((item, index) => {
      const num = (index + 1).toString().padStart(2, ' ');
      const name = item.name || 'Unknown';
      const price = '₹' + (item.price || 0).toString();
      
      // Format: "01. Item Name............₹100"
      const nameMaxLen = W - 5 - price.length; // 5 for "01. " and some padding
      const displayName = padRight(name, nameMaxLen);
      cmd += `${num}. ${displayName}${padLeft(price, price.length)}` + LF;
    });
    
    cmd += LF;
  });
  
  // Footer
  cmd += line('=') + LF;
  cmd += ALIGN_CENTER + BOLD_ON;
  cmd += `Total Items: ${items.length}` + LF;
  cmd += BOLD_OFF + LF + LF + LF;
  
  cmd += PARTIAL_CUT;
  
  return cmd;
};

// Disconnect QZ Tray
export const disconnectQZ = () => {
  if (qz && qz.websocket.isActive()) {
    qz.websocket.disconnect();
  }
  isConnected = false;
  printerConfig = null;
  kotPrinterConfig = null;
};

// Generate ESC/POS commands for KOT (Kitchen Order Ticket)
export const generateKOTCommands = (kotData) => {
  const {
    date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type = 'Dine In',
    table = 'N/A',
    items = [],
    totalQty = 0
  } = kotData;

  // ESC/POS commands
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const ALIGN_CENTER = ESC + 'a\x01';
  const ALIGN_LEFT = ESC + 'a\x00';
  const BOLD_ON = ESC + 'E\x01';
  const BOLD_OFF = ESC + 'E\x00';
  const DOUBLE_HEIGHT = GS + '!\x10';
  const DOUBLE_SIZE = GS + '!\x11';
  const NORMAL_SIZE = GS + '!\x00';
  const PARTIAL_CUT = GS + 'V\x01';
  const LF = '\n';
  
  const W = 48; // Paper width chars (80mm)
  const pad = (s, l) => s.substring(0, l).padEnd(l);
  const padL = (s, l) => s.substring(0, l).padStart(l);
  const line = (c = '-') => c.repeat(W);
  
  let cmd = INIT;
  
  // Header - KOT Title (large, bold)
  cmd += ALIGN_CENTER + BOLD_ON + DOUBLE_SIZE;
  cmd += '*** KOT ***' + LF;
  cmd += NORMAL_SIZE + BOLD_OFF;
  
  // Table Name (large, prominent)
  cmd += line('=') + LF;
  cmd += BOLD_ON + DOUBLE_SIZE;
  cmd += `TABLE: ${table}` + LF;
  cmd += NORMAL_SIZE + BOLD_OFF;
  cmd += `${type} | ${date} ${time}` + LF;
  cmd += line('=') + LF;
  
  // Items Header
  cmd += ALIGN_LEFT + BOLD_ON;
  cmd += pad('ITEM', 36) + padL('QTY', 10) + LF;
  cmd += BOLD_OFF + line('-') + LF;
  
  // Items - larger for kitchen visibility
  cmd += DOUBLE_HEIGHT;
  items.forEach((item, i) => {
    const name = `${i + 1}. ${item.name}`.substring(0, 36);
    cmd += pad(name, 36) + padL(`x${item.quantity}`, 10) + LF;
  });
  cmd += NORMAL_SIZE;
  
  cmd += line('-') + LF;
  
  // Total Items
  cmd += BOLD_ON + ALIGN_CENTER;
  cmd += `TOTAL ITEMS: ${totalQty}` + LF;
  cmd += BOLD_OFF + LF;
  
  cmd += line('=') + LF + LF + LF;
  
  cmd += PARTIAL_CUT;
  
  return cmd;
};

// ============================================
// WEB BLUETOOTH PRINTING (For Mobile)
// ============================================

// Common Bluetooth printer service and characteristic UUIDs
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Alternative UUIDs for different printers
const ALT_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
];

// Connect to Bluetooth printer (for mobile)
export const connectBluetoothPrinter = async () => {
  if (!isWebBluetoothAvailable()) {
    throw new Error('Web Bluetooth is not available. Use Chrome on Android.');
  }

  try {
    console.log('Requesting Bluetooth device...');
    
    // Request any device (let user select)
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ALT_PRINTER_SERVICES
    });

    console.log('Connecting to GATT server...');
    const server = await bluetoothDevice.gatt.connect();

    // Try to find printer service
    let service = null;
    for (const serviceUuid of ALT_PRINTER_SERVICES) {
      try {
        service = await server.getPrimaryService(serviceUuid);
        console.log('Found service:', serviceUuid);
        break;
      } catch (e) {
        console.log('Service not found:', serviceUuid);
      }
    }

    if (!service) {
      // Try to get all services
      const services = await server.getPrimaryServices();
      console.log('Available services:', services.map(s => s.uuid));
      if (services.length > 0) {
        service = services[0];
      } else {
        throw new Error('No compatible printer service found');
      }
    }

    // Get characteristic for writing
    const characteristics = await service.getCharacteristics();
    console.log('Available characteristics:', characteristics.map(c => c.uuid));
    
    // Find writable characteristic
    bluetoothCharacteristic = characteristics.find(c => 
      c.properties.write || c.properties.writeWithoutResponse
    );

    if (!bluetoothCharacteristic) {
      throw new Error('No writable characteristic found');
    }

    console.log('Bluetooth printer connected!', bluetoothDevice.name);
    return { success: true, deviceName: bluetoothDevice.name };
  } catch (err) {
    console.error('Bluetooth connection error:', err);
    bluetoothDevice = null;
    bluetoothCharacteristic = null;
    throw err;
  }
};

// Check if Bluetooth printer is connected
export const isBluetoothConnected = () => {
  return bluetoothDevice?.gatt?.connected && bluetoothCharacteristic !== null;
};

// Print via Web Bluetooth
export const printViaBluetooth = async (commands) => {
  if (!isBluetoothConnected()) {
    // Try to connect
    await connectBluetoothPrinter();
  }

  if (!bluetoothCharacteristic) {
    throw new Error('Bluetooth printer not connected');
  }

  // Convert string to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(commands);
  
  // Send in chunks (Bluetooth has packet size limits)
  const CHUNK_SIZE = 100;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    try {
      if (bluetoothCharacteristic.properties.writeWithoutResponse) {
        await bluetoothCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await bluetoothCharacteristic.writeValue(chunk);
      }
    } catch (err) {
      console.error('Bluetooth write error at chunk', i, err);
      throw err;
    }
    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('Print data sent via Bluetooth');
  return { success: true };
};

// Disconnect Bluetooth printer
export const disconnectBluetoothPrinter = () => {
  if (bluetoothDevice?.gatt?.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  bluetoothCharacteristic = null;
};

// ============================================

// Print KOT - Auto-selects QZ Tray (desktop) or Web Bluetooth (mobile)
export const printKOT = async (kotData, printerName = null) => {
  const commands = generateKOTCommands(kotData);
  
  // On mobile, use Web Bluetooth
  if (isMobile() && isWebBluetoothAvailable()) {
    console.log('Mobile detected - using Web Bluetooth for KOT');
    try {
      await printViaBluetooth(commands);
      return { success: true, method: 'bluetooth' };
    } catch (err) {
      console.error('Web Bluetooth print error:', err);
      throw new Error('Bluetooth print failed: ' + err.message);
    }
  }
  
  // On desktop, use QZ Tray
  try {
    const config = kotPrinterConfig || await getKOTPrinter(printerName);
    
    const data = [{ 
      type: 'raw', 
      format: 'plain',
      data: commands
    }];
    
    await qz.print(config, data);
    return { success: true, method: 'qz-tray' };
  } catch (err) {
    console.error('KOT Print error:', err);
    isConnected = false;
    kotPrinterConfig = null;
    throw err;
  }
};

export default {
  initQZ,
  connectQZ,
  getPrinter,
  getKOTPrinter,
  preConnectQZ,
  isQZReady,
  listAllPrinters,
  printThermalBill,
  printKOT,
  printMenuItems,
  disconnectQZ,
  generateThermalCommands,
  generateKOTCommands,
  // Web Bluetooth exports
  isMobile,
  isWebBluetoothAvailable,
  connectBluetoothPrinter,
  isBluetoothConnected,
  printViaBluetooth,
  disconnectBluetoothPrinter
};
