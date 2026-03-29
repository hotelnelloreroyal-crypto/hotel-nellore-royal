import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  isBluetoothConnected as checkBluetoothConnected, 
  connectBluetoothPrinter, 
  disconnectBluetoothPrinter,
  isWebBluetoothAvailable,
  isMobile
} from '../utils/qzPrint';
import toast from 'react-hot-toast';

const PrinterContext = createContext();

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

export const PrinterProvider = ({ children }) => {
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [deviceName, setDeviceName] = useState(null);
  const [connecting, setConnecting] = useState(false);

  // Check connection status periodically or on mount
  useEffect(() => {
    const checkConnection = () => {
      const connected = checkBluetoothConnected();
      setBluetoothConnected(connected);
      if (!connected) {
        setDeviceName(null);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const connect = async () => {
    if (!isWebBluetoothAvailable()) {
      toast.error('Web Bluetooth is not supported in this browser.');
      return false;
    }

    setConnecting(true);
    try {
      const result = await connectBluetoothPrinter();
      setBluetoothConnected(true);
      setDeviceName(result.deviceName);
      toast.success(`Connected to ${result.deviceName}`);
      return true;
    } catch (error) {
      console.error('Bluetooth Connection Error:', error);
      toast.error(error.message || 'Failed to connect to printer');
      setBluetoothConnected(false);
      return false;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    disconnectBluetoothPrinter();
    setBluetoothConnected(false);
    setDeviceName(null);
    toast.success('Printer disconnected');
  };

  return (
    <PrinterContext.Provider
      value={{
        bluetoothConnected,
        deviceName,
        connecting,
        connect,
        disconnect,
        isSupported: isWebBluetoothAvailable(),
        isMobile: isMobile()
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};
