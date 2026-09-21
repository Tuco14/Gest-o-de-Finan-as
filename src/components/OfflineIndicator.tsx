import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 text-zinc-950 px-3.5 py-2 text-xs font-bold shadow-lg border border-amber-400 backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
      <WifiOff className="w-4 h-4 text-zinc-950" />
      <span>Modo Offline — Usando dados locais salvos no dispositivo.</span>
    </div>
  );
};
