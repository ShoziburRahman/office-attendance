"use client";

import React, { createContext, useContext } from 'react';
import { type AppVersion } from '@/lib/app-updater';

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
  return (
    <UpdateContext.Provider value={{
      updateAvailable: false,
      versionData: null,
      isForced: false
    }}>
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate() {
  return useContext(UpdateContext);
}
