import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { usePWA } from '../../context/PWAContext';

const UpdatePrompt = () => {
  const { needsUpdate, updateApp } = usePWA();

  if (!needsUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
      <div className="bg-gradient-to-r from-[#ec2b25] to-[#ff6b6b] p-3">
        <div className="flex items-center gap-2 text-white">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="font-semibold">Update Available!</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-gray-600 text-sm mb-4">
          A new version of the app is available. Update now to get the latest features and improvements.
        </p>
        <div className="flex gap-3">
          <button
            onClick={updateApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#ec2b25] text-white rounded-lg hover:bg-[#d12620] transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;
