"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { checkAppUpdate, dismissUpdate, type AppVersion } from '@/lib/app-updater';
import { UpdateDialog } from '@/components/admin/UpdateDialog';

interface UpdateContextType {
  updateAvailable: boolean;
  versionData: AppVersion | null;
  isForced: boolean;
}

const UpdateContext = createContext<UpdateContextType>({
  updateAvailable: false,
  versionData: null,
  isForced: false,
});

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [update, setUpdate] = useState<{
    available: boolean;
    data: AppVersion | null;
    forced: boolean;
  }>({
    available: false,
    data: null,
    forced: false,
  });

  const performUpdateCheck = async () => {
    console.log("[UpdateProvider] Checking for updates...");
    const result = await checkAppUpdate();
    console.log("[UpdateProvider] Update check result:", result);
    if (result.shouldUpdate) {
      setUpdate({
        available: true,
        data: result.versionData,
        forced: result.isForced,
      });
    } else {
      setUpdate({ available: false, data: null, forced: false });
    }
  };

  useEffect(() => {
    performUpdateCheck();

    // Check again when the app resumes from background
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        performUpdateCheck();
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', performUpdateCheck);
    };
  }, []);

  const handleDismiss = async () => {
    if (update.data) {
      await dismissUpdate(update.data.versionCode);
    }
    setUpdate({ available: false, data: null, forced: false });
  };

  const handleUpdate = () => {
    if (update.data?.apkUrl) {
      console.log("[UpdateProvider] Triggering update download:", update.data.apkUrl);

      // Create a temporary anchor element to trigger a download
      const link = document.createElement('a');
      link.href = update.data.apkUrl;
      link.setAttribute('download', ''); // Suggest download
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error("[UpdateProvider] No apkUrl available for update");
    }
  };

  return (
    <UpdateContext.Provider value={{
      updateAvailable: update.available,
      versionData: update.data,
      isForced: update.forced
    }}>
      {update.available && (
        <UpdateDialog
          version={update.data!}
          isForced={update.forced}
          onDismiss={handleDismiss}
          onUpdate={handleUpdate}
        />
      )}
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate() {
  return useContext(UpdateContext);
}
