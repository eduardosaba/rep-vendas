'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNextRedirect } from '@/lib/isNextRedirect';
import { toast } from 'sonner';

// Tipos para checkout seguro
export interface SecureCheckoutState {
  isAuthenticated: boolean;
  sessionToken: string | null;
  lastActivity: number;
  retryCount: number;
  isProcessing: boolean;
  draftOrder: DraftOrder | null;
  securityLogs: SecurityLog[];
}

export interface DraftOrder {
  id: string;
  clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: string;
  notes?: string;
  createdAt: number;
  lastModified: number;
}

export interface SecurityLog {
  id: string;
  action: string;
  timestamp: number;
  success: boolean;
  details?: string;
}

export interface UseSecureCheckoutReturn {
  // Estado
  state: SecureCheckoutState;

  // Ações de autenticação
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  logout: () => void;

  // Ações de pedido
  saveDraftOrder: (
    order: Omit<DraftOrder, 'id' | 'createdAt' | 'lastModified'>
  ) => void;
  loadDraftOrder: () => DraftOrder | null;
  clearDraftOrder: () => void;
  submitOrder: (
    orderData: any
  ) => Promise<{ success: boolean; orderId?: string; error?: string }>;

  // Utilitários
  encryptSensitiveData: (data: any) => string;
  decryptSensitiveData: (encryptedData: string) => any;
  logSecurityEvent: (
    action: string,
    success: boolean,
    details?: string
  ) => void;
  getSecurityLogs: () => SecurityLog[];
}

// Constantes de segurança
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const MAX_RETRY_ATTEMPTS = 3;
const DRAFT_ORDER_KEY = 'secure_checkout_draft';
const SECURITY_LOGS_KEY = 'secure_checkout_logs';
const ENCRYPTION_KEY = 'repvendas_secure_key'; // Em produção, usar chave dinâmica

export const useSecureCheckout = (): UseSecureCheckoutReturn => {
  const supabase = createClient();
  // usar sonner programático

  // Estado inicial
  const [state, setState] = useState<SecureCheckoutState>({
    isAuthenticated: false,
    sessionToken: null,
    lastActivity: Date.now(),
    retryCount: 0,
    isProcessing: false,
    draftOrder: null,
    securityLogs: [],
  });

  // Inicializar estado seguro
  useEffect(() => {
    initializeSecureState();
  }, []);

  // Monitor de atividade para timeout de sessão
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - state.lastActivity > SESSION_TIMEOUT) {
        handleSessionTimeout();
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, [state.lastActivity]);

  // Função de inicialização
  const initializeSecureState = useCallback(async () => {
    try {
      // Carregar dados do localStorage
      const savedDraft = localStorage.getItem(DRAFT_ORDER_KEY);
      const savedLogs = localStorage.getItem(SECURITY_LOGS_KEY);

      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setState((prev) => ({ ...prev, draftOrder: draft }));
      }

      if (savedLogs) {
        const logs = JSON.parse(savedLogs);
        setState((prev) => ({ ...prev, securityLogs: logs }));
      }

      // Validar sessão atual
      const isValid = await validateSession();
      if (isValid) {
        logSecurityEvent(
          'session_restored',
          true,
          'Sessão restaurada com sucesso'
        );
      }
    } catch (error) {
      if (!isNextRedirect(error))
        console.error('Erro ao inicializar estado seguro:', error);
      logSecurityEvent(
        'initialization_error',
        false,
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
    }
  }, []);

  // Validação de sessão
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        setState((prev) => ({
          ...prev,
          isAuthenticated: false,
          sessionToken: null,
        }));
        logSecurityEvent(
          'session_validation',
          false,
          'Sessão inválida ou inexistente'
        );
        return false;
      }

      // Verificar se o token ainda é válido
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;

      if (now >= expiresAt) {
        setState((prev) => ({
          ...prev,
          isAuthenticated: false,
          sessionToken: null,
        }));
        logSecurityEvent('session_validation', false, 'Token expirado');
        return false;
      }

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        sessionToken: session.access_token,
        lastActivity: now,
      }));

      logSecurityEvent('session_validation', true, 'Sessão válida');
      return true;
    } catch (error) {
      if (!isNextRedirect(error))
        console.error('Erro ao validar sessão:', error);
      logSecurityEvent(
        'session_validation',
        false,
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
      return false;
    }
  }, []);

  // Refresh de sessão
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        logSecurityEvent(
          'session_refresh',
          false,
          error?.message || 'Falha ao renovar sessão'
        );
        return false;
      }

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        sessionToken: data.session?.access_token || null,
        lastActivity: Date.now(),
        retryCount: 0,
      }));

      logSecurityEvent('session_refresh', true, 'Sessão renovada com sucesso');
      return true;
    } catch (error) {
      if (!isNextRedirect(error))
        console.error('Erro ao renovar sessão:', error);
      logSecurityEvent(
        'session_refresh',
        false,
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
      return false;
    }
  }, []);

  // Logout seguro
  const logout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      sessionToken: null,
      draftOrder: null,
    }));

    // Limpar dados locais
    localStorage.removeItem(DRAFT_ORDER_KEY);
    localStorage.removeItem(SECURITY_LOGS_KEY);

    logSecurityEvent('logout', true, 'Logout realizado com sucesso');
  }, []);

  // Manipulação de timeout de sessão
  const handleSessionTimeout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      sessionToken: null,
    }));

    toast('Sua sessão expirou por inatividade. Faça login novamente.');

    logSecurityEvent(
      'session_timeout',
      true,
      'Sessão expirada por inatividade'
    );
  }, []);

  // Salvamento de rascunho de pedido
  const saveDraftOrder = useCallback(
    (order: Omit<DraftOrder, 'id' | 'createdAt' | 'lastModified'>) => {
      try {
        const draft: DraftOrder = {
          ...order,
          id: `draft_${Date.now()}`,
          createdAt: Date.now(),
          lastModified: Date.now(),
        };

        // Criptografar dados sensíveis
        const encryptedDraft = {
          ...draft,
          clientData: encryptSensitiveData(draft.clientData),
        };

        localStorage.setItem(DRAFT_ORDER_KEY, JSON.stringify(encryptedDraft));
        setState((prev) => ({ ...prev, draftOrder: draft }));

        logSecurityEvent('draft_saved', true, 'Rascunho de pedido salvo');
      } catch (error) {
        if (!isNextRedirect(error))
          console.error('Erro ao salvar rascunho:', error);
        logSecurityEvent(
          'draft_saved',
          false,
          error instanceof Error ? error.message : 'Erro desconhecido'
        );
      }
    },
    []
  );

  // Carregamento de rascunho
  const loadDraftOrder = useCallback((): DraftOrder | null => {
    try {
      const saved = localStorage.getItem(DRAFT_ORDER_KEY);
      if (!saved) return null;

      const encryptedDraft = JSON.parse(saved);

      // Descriptografar dados sensíveis
      const draft: DraftOrder = {
        ...encryptedDraft,
        clientData: decryptSensitiveData(encryptedDraft.clientData),
      };

      setState((prev) => ({ ...prev, draftOrder: draft }));
      logSecurityEvent('draft_loaded', true, 'Rascunho de pedido carregado');
      return draft;
    } catch (error) {
      if (!isNextRedirect(error))
        console.error('Erro ao carregar rascunho:', error);
      logSecurityEvent(
        'draft_loaded',
        false,
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
      return null;
    }
  }, []);

  // Limpar rascunho
  const clearDraftOrder = useCallback(() => {
    localStorage.removeItem(DRAFT_ORDER_KEY);
    setState((prev) => ({ ...prev, draftOrder: null }));
    logSecurityEvent('draft_cleared', true, 'Rascunho de pedido removido');
  }, []);

  // Submissão de pedido com retry
  const submitOrder = useCallback(
    async (
      orderData: any
    ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        // Validar sessão antes de submeter
        const isValidSession = await validateSession();
        if (!isValidSession) {
          // Tentar refresh da sessão
          const refreshed = await refreshSession();
          if (!refreshed) {
            logSecurityEvent(
              'order_submit',
              false,
              'Falha na validação de sessão'
            );
            return {
              success: false,
              error: 'Sessão inválida. Faça login novamente.',
            };
          }
        }

        // Tentar submeter com retry
        let lastError: string = '';
        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
          try {
            setState((prev) => ({ ...prev, retryCount: attempt }));

            const result = await performOrderSubmission(orderData);

            if (result.success) {
              setState((prev) => ({
                ...prev,
                isProcessing: false,
                retryCount: 0,
                lastActivity: Date.now(),
              }));

              // Limpar rascunho após sucesso
              clearDraftOrder();

              logSecurityEvent(
                'order_submit',
                true,
                `Pedido ${result.orderId} criado com sucesso`
              );
              return result;
            } else {
              lastError = result.error || 'Erro desconhecido';
              logSecurityEvent(
                'order_submit_attempt',
                false,
                `Tentativa ${attempt}: ${lastError}`
              );

              if (attempt < MAX_RETRY_ATTEMPTS) {
                // Aguardar antes do próximo retry
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * attempt)
                );
                continue;
              }
            }
          } catch (error) {
            lastError =
              error instanceof Error ? error.message : 'Erro desconhecido';
            logSecurityEvent(
              'order_submit_attempt',
              false,
              `Tentativa ${attempt}: ${lastError}`
            );

            if (attempt < MAX_RETRY_ATTEMPTS) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt)
              );
              continue;
            }
          }
        }

        setState((prev) => ({ ...prev, isProcessing: false }));
        logSecurityEvent(
          'order_submit',
          false,
          `Falhou após ${MAX_RETRY_ATTEMPTS} tentativas: ${lastError}`
        );
        return { success: false, error: lastError };
      } catch (error) {
        setState((prev) => ({ ...prev, isProcessing: false }));
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        logSecurityEvent('order_submit', false, errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [validateSession, refreshSession, clearDraftOrder]
  );

  // Função auxiliar para submissão do pedido
  const performOrderSubmission = async (
    orderData: any
  ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Criar cliente se necessário
    let clientId = orderData.clientId;
    if (!clientId && orderData.clientData.name) {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: orderData.userId,
          name: orderData.clientData.name,
          email: orderData.clientData.email || null,
          phone: orderData.clientData.phone || null,
        })
        .select()
        .maybeSingle();

      if (clientError) throw clientError;
      clientId = newClient.id;
    }

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.userId,
        client_id: clientId,
        status: 'Pendente',
        total_value: orderData.totalValue,
        order_type: 'catalog',
        delivery_address: orderData.deliveryAddress,
        payment_method: orderData.paymentMethod,
        notes: orderData.notes,
      })
      .select()
      .maybeSingle();

    if (orderError) throw orderError;

    // Inserir itens do pedido
    const orderItemsData = orderData.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) throw itemsError;

    return { success: true, orderId: order.id };
  };

  // Criptografia simples (em produção, usar crypto mais robusto)
  const encryptSensitiveData = useCallback((data: any): string => {
    try {
      const jsonString = JSON.stringify(data);
      // XOR simples com chave (apenas para demonstração)
      let encrypted = '';
      for (let i = 0; i < jsonString.length; i++) {
        encrypted += String.fromCharCode(
          jsonString.charCodeAt(i) ^
            ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        );
      }
      return btoa(encrypted); // Base64
    } catch (error) {
      if (!isNextRedirect(error))
        console.error('Erro ao criptografar dados:', error);
      return JSON.stringify(data); // Fallback
    }
  }, []);

  const decryptSensitiveData = useCallback((encryptedData: string): any => {
    try {
      const encrypted = atob(encryptedData); // Base64 decode
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^
            ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        );
      }
      return JSON.parse(decrypted);
    } catch (error) {
      if (!isNextRedirect(error))
        console.error('Erro ao descriptografar dados:', error);
      return {}; // Fallback
    }
  }, []);

  // Logging de segurança
  const logSecurityEvent = useCallback(
    (action: string, success: boolean, details?: string) => {
      const log: SecurityLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action,
        timestamp: Date.now(),
        success,
        details,
      };

      setState((prev) => {
        const newLogs = [...prev.securityLogs, log].slice(-100); // Manter apenas os últimos 100 logs
        localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(newLogs));
        return { ...prev, securityLogs: newLogs };
      });
    },
    []
  );

  // Obter logs de segurança
  const getSecurityLogs = useCallback((): SecurityLog[] => {
    return state.securityLogs;
  }, [state.securityLogs]);

  return {
    state,
    validateSession,
    refreshSession,
    logout,
    saveDraftOrder,
    loadDraftOrder,
    clearDraftOrder,
    submitOrder,
    encryptSensitiveData,
    decryptSensitiveData,
    logSecurityEvent,
    getSecurityLogs,
  };
};
