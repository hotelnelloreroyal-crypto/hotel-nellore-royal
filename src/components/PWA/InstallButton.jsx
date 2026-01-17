import React from 'react';
import { Download, Check, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { usePWA } from '../../context/PWAContext';

const InstallButton = ({ variant = 'default', showStatus = true }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isOnline, 
    needsUpdate, 
    installApp, 
    updateApp 
  } = usePWA();

  // Update button - shown when update is available
  if (needsUpdate) {
    return (
      <button
        onClick={updateApp}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors animate-pulse"
        title="Update available - Click to update"
      >
        <RefreshCw className="w-4 h-4" />
        <span className="text-sm font-medium">Update</span>
      </button>
    );
  }

  // Already installed status
//   if (isInstalled) {
//     if (!showStatus) return null;
//     return (
//       <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
//         <Check className="w-4 h-4" />
//         <span className="text-sm font-medium">Installed</span>
//         {!isOnline && <WifiOff className="w-4 h-4 text-orange-500" title="Offline" />}
//       </div>
//     );
//   }

  // Install button - shown when app can be installed
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={installApp}
          className="flex items-center gap-1 px-2 py-1 bg-[#ec2b25] text-white rounded hover:bg-[#d12620] transition-colors"
          title="Install App"
        >
          <Download className="w-4 h-4" />
        </button>
      );
    }

    if (variant === 'full') {
      return (
        <button
          onClick={installApp}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#ec2b25] text-white rounded-lg hover:bg-[#d12620] transition-colors shadow-lg"
        >
          <Download className="w-5 h-5" />
          <span className="font-medium">Install App</span>
        </button>
      );
    }

    return (
      <button
        onClick={installApp}
        className="flex items-center gap-2 px-3 py-2 bg-[#ec2b25] text-white rounded-lg hover:bg-[#d12620] transition-colors"
        title="Install App"
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">Install</span>
      </button>
    );
  }

  // Online status indicator when not installable
  if (showStatus) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 text-gray-500" title={isOnline ? 'Online' : 'Offline'}>
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-orange-500" />
        )}
      </div>
    );
  }

  return null;
};

export default InstallButton;
