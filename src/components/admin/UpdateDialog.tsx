"use client";

import React from 'react';
import { AppVersion } from '@/lib/app-updater';

interface UpdateDialogProps {
  version: AppVersion;
  isForced: boolean;
  onDismiss: () => void;
  onUpdate: () => void;
}

export function UpdateDialog({ version, isForced, onDismiss, onUpdate }: UpdateDialogProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {isForced ? 'Update Required' : 'Update Available'}
          </h3>

          <p className="text-gray-600 mb-4">
            {isForced
              ? 'A new version of Stamp Kini is required. Please update to continue.'
              : 'A new version of Stamp Kini is available.'}
          </p>

          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Version</span>
              <span className="text-xs font-bold text-primary">{version.versionName}</span>
            </div>
            <p className="text-sm text-gray-600 italic">
              {version.releaseNotes || 'Bug fixes and performance improvements.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onUpdate}
              className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              Update Now
            </button>

            {!isForced && (
              <button
                onClick={onDismiss}
                className="w-full py-3 px-4 bg-white text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
