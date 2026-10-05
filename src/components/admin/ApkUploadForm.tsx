"use client";

import React, { useState } from 'react';
import { uploadApkAction } from '@/app/admin/updates/actions';
import { Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export function ApkUploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUploading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await uploadApkAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      (event.target as HTMLFormElement).reset();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setIsUploading(false);
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-gray-900">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Version Code (Integer)</label>
            <input
              name="versionCode"
              type="number"
              required
              placeholder="e.g. 2"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Version Name</label>
            <input
              name="versionName"
              type="text"
              required
              placeholder="e.g. 1.0.1"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Release Notes</label>
          <textarea
            name="releaseNotes"
            rows={3}
            placeholder="Describe what's new in this version..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <input
            name="forceUpdate"
            type="checkbox"
            id="forceUpdate"
            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="forceUpdate" className="text-sm font-medium text-gray-700 cursor-pointer">
            Force update ( block app usage until updated )
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">APK File (.apk)</label>
          <div className="relative group">
            <input
              name="apkFile"
              type="file"
              accept=".apk"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all"
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="w-full py-3 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading APK...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload New Version
            </>
          )}
        </button>
      </form>
    </div>
  );
}
