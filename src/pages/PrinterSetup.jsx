import React from 'react';
import { Bluetooth, BluetoothOff, Printer, CheckCircle2, XCircle, Loader2, Info, ChevronLeft } from 'lucide-react';
import { usePrinter } from '../context/PrinterContext';
import { listAllPrinters } from '../utils/qzPrint';
import { Link } from 'react-router-dom';

const PrinterSetup = () => {
  const { 
    bluetoothConnected, 
    deviceName, 
    connecting, 
    connect, 
    disconnect, 
    isSupported,
    isMobile 
  } = usePrinter();

  const handleManualScan = async () => {
    try {
      await listAllPrinters();
    } catch (error) {
      console.error('Manual scan failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Printer Setup</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bluetooth Section */}
        <div className="bg-white border border-gray-200 p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${bluetoothConnected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                <Bluetooth className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Bluetooth Printer</h2>
                <p className="text-sm text-gray-500">Wireless Thermal Printing</p>
              </div>
            </div>
          </div>

          <div className="flex-1 py-6 flex flex-col items-center justify-center text-center space-y-4">
            {bluetoothConnected ? (
              <>
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Connected to:</p>
                  <p className="text-xl font-bold text-blue-600">{deviceName || 'Unknown Device'}</p>
                </div>
                <button
                  onClick={disconnect}
                  className="px-6 py-2 border border-[#ec2b25] text-[#ec2b25] hover:bg-[#ec2b25] hover:text-white transition-all font-medium cursor-pointer"
                >
                  Disconnect Printer
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                  <BluetoothOff className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-gray-600 font-medium">No printer connected</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">Scan and connect to your Bluetooth thermal printer from here.</p>
                </div>
                <button
                  onClick={connect}
                  disabled={connecting || !isSupported}
                  className={`px-8 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2`}
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-5 h-5" />
                      Scan & Connect
                    </>
                  )}
                </button>
                {!isSupported && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1 justify-center">
                    <XCircle className="w-3 h-3" />
                    Web Bluetooth not supported on this device/browser
                  </p>
               )}
              </>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instructions</h3>
            <ul className="text-xs text-gray-500 space-y-1.5 list-disc pl-4">
              <li>Turn on your Bluetooth thermal printer.</li>
              <li>Make sure it is in pairing mode.</li>
              <li>Click 'Scan & Connect' and select your printer from the list.</li>
              <li>Once connected, billing will automatically use this printer.</li>
            </ul>
          </div>
        </div>

        {/* QZ Tray / Desktop Section */}
        <div className="bg-white border border-gray-200 p-6 flex flex-col space-y-4">
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 text-gray-600 rounded-full">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Desktop Printing</h2>
                <p className="text-sm text-gray-500">USB / Network Thermal Printing</p>
              </div>
            </div>
          </div>

          <div className="flex-1 py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 w-full rounded">
               <p className="text-sm font-medium text-gray-700">QZ Tray Status</p>
               <p className="text-xs text-gray-500 mt-1">Required for wired printers on Desktop</p>
               <div className="mt-4">
                  <button 
                    onClick={handleManualScan}
                    className="text-xs p-2 bg-white border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Refresh List in Console
                  </button>
               </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 text-left rounded">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                For desktop printing, make sure <b>QZ Tray</b> is installed and running on your computer.
              </p>
            </div>
          </div>

           <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Environment Config</h3>
            <p className="text-xs text-gray-500">
               Printers are currently configured via .env variables for fixed installations. 
            </p>
            <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-[10px] text-gray-600 overflow-x-auto whitespace-pre">
               VITE_BILL_PRINTER_NAME=Thermal80mm<br/>
               VITE_KOT_PRINTER_NAME=KOTPrinter
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterSetup;
