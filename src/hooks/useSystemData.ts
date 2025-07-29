/**
 * Hook para gerenciamento de dados do sistema
 * Centraliza acesso aos dados com cache e sincronização
 */

import { useState, useEffect, useCallback } from 'react';
import { systemService } from '@/services/systemService';
import { useAuth } from '@/contexts/AuthContext';

export const useSystemData = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { isAuthenticated } = useAuth();

  // Verificar status do servidor
  const checkServerStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const status = await systemService.verificarStatusServidor();
      setIsOnline(status.status === 'online');
    } catch (error) {
      setIsOnline(false);
    }
  }, [isAuthenticated]);

  // Sincronizar dados
  const syncData = useCallback(async () => {
    if (!isAuthenticated || syncing) return;
    
    setSyncing(true);
    try {
      const result = await systemService.sincronizarDados();
      if (result.sucesso) {
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      setSyncing(false);
    }
  }, [isAuthenticated, syncing]);

  // Verificar status periodicamente
  useEffect(() => {
    if (!isAuthenticated) return;

    // Verificação inicial
    checkServerStatus();
    syncData();

    // Verificar a cada 5 minutos
    const interval = setInterval(() => {
      checkServerStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, checkServerStatus, syncData]);

  return {
    isOnline,
    lastSync,
    syncing,
    checkServerStatus,
    syncData,
    systemService
  };
};