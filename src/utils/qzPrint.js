// QZ Tray printing utility for thermal printers
// Make sure QZ Tray is installed and running on the system

let qz = null;
let printerConfig = null; // Cache printer config for fast printing
let isConnected = false;
let securitySet = false;

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

// Connect to QZ Tray
export const connectQZ = async () => {
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
  
  try {
    await qz.websocket.connect();
    isConnected = true;
    console.log('QZ Tray connected successfully');
    return true;
  } catch (err) {
    isConnected = false;
    console.error('QZ Tray connection failed:', err);
    throw new Error('QZ Tray is not running. Please start QZ Tray application.');
  }
};

// Get and cache printer config for fast printing
export const getPrinter = async (printerName = null) => {
  // Return cached config if available
  if (printerConfig && !printerName) {
    return printerConfig;
  }
  
  await connectQZ();
  
  if (printerName) {
    printerConfig = qz.configs.create(printerName);
    return printerConfig;
  }
  
  // Try to find a thermal printer
  const printers = await qz.printers.find();
  console.log('Available printers:', printers);
  
  // Look for common thermal printer names
  const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'bixolon', '80mm', '58mm', 'gp-', 'xp-'];
  const thermalPrinter = printers.find(p => 
    thermalKeywords.some(keyword => p.toLowerCase().includes(keyword))
  );
  
  // Use thermal printer if found, otherwise use default
  const selectedPrinter = thermalPrinter || (await qz.printers.getDefault());
  console.log('Selected printer:', selectedPrinter);
  
  printerConfig = qz.configs.create(selectedPrinter);
  return printerConfig;
};

// Pre-connect and cache printer on app load
export const preConnectQZ = async () => {
  try {
    await connectQZ();
    await getPrinter();
    console.log('QZ Tray pre-connected and printer cached');
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
    totalQty = 0
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
    // Use cached config if available, otherwise get new one
    const config = printerConfig || await getPrinter(printerName);
    const commands = generateThermalCommands(billData);
    
    const data = [{ 
      type: 'raw', 
      format: 'plain',
      data: commands
    }];
    
    await qz.print(config, data);
    return { success: true };
  } catch (err) {
    console.error('Print error:', err);
    // Reset connection on error
    isConnected = false;
    printerConfig = null;
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
};

export default {
  initQZ,
  connectQZ,
  getPrinter,
  preConnectQZ,
  isQZReady,
  printThermalBill,
  printMenuItems,
  disconnectQZ,
  generateThermalCommands
};
