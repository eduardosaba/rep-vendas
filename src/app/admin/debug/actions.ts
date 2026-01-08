'use server';

import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/utils/getErrorMessage';

// --- SEGURANÇA ---
async function checkPermissions() {
  // TRAVA DE SEGURANÇA: Só funciona em localhost
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      '⛔ SEGURANÇA CRÍTICA: Esta ferramenta é exclusiva para ambiente de desenvolvimento (localhost).'
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'master') {
    throw new Error('Acesso negado. Apenas Master.');
  }
}

// --- 1. EDITOR DE ARQUIVOS ---

export async function saveSystemFile(filePath: string, fileContent: string) {
  try {
    await checkPermissions();

    const cleanPath = filePath.replace(/\.\./g, ''); // Evita directory traversal
    const fullPath = path.join(process.cwd(), cleanPath);

    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, fileContent, 'utf-8');

    return {
      success: true,
      message: `Arquivo gravado com sucesso!`,
      path: fullPath,
    };
  } catch (error: unknown) {
    logger.error('Debug: Erro ao salvar', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function verifySystemFile(filePath: string) {
  try {
    await checkPermissions();
    const cleanPath = filePath.replace(/\.\./g, '');
    const fullPath = path.join(process.cwd(), cleanPath);
    const stats = await fs.stat(fullPath);

    return {
      success: true,
      exists: true,
      size: stats.size,
      lastModified: stats.mtime.toLocaleString('pt-BR'),
      message: 'Arquivo encontrado no disco.',
    };
  } catch {
    return {
      success: false,
      exists: false,
      error: 'Arquivo não encontrado.',
    };
  }
}

export async function readSystemFile(filePath: string) {
  try {
    await checkPermissions();
    const cleanPath = filePath.replace(/\.\./g, '');
    const fullPath = path.join(process.cwd(), cleanPath);
    const content = await fs.readFile(fullPath, 'utf-8');

    return { success: true, content };
  } catch (error) {
    return { success: false, error: 'Arquivo não encontrado para leitura.' };
  }
}

// --- 2. LOGS DO SISTEMA ---

export async function getSystemLogs() {
  try {
    await checkPermissions();
    // Tenta ler um arquivo de log padrão (se você usar winston/pino salvando em arquivo)
    // Se não tiver, retornamos um mock ou tentamos ler o console do next (difícil em runtime)
    // Aqui vou simular a leitura de um arquivo 'app.log' na raiz, se existir.
    
    const logPath = path.join(process.cwd(), 'app.log'); // Ajuste conforme seu logger
    
    try {
      const logs = await fs.readFile(logPath, 'utf-8');
      // Pega as últimas 50 linhas
      const lines = logs.split('\n').slice(-50).join('\n');
      return { success: true, logs: lines };
    } catch {
        return { success: true, logs: '⚠️ Arquivo app.log não encontrado na raiz.\nMonitorando logs em tempo real...' };
    }
  } catch (error) {
    return { success: false, error: 'Erro ao ler logs' };
  }
}

// --- 3. DIAGNÓSTICO E TESTES ---

export async function runSystemDiagnostics() {
  try {
    await checkPermissions();
    const supabase = await createClient();
    
    const results = {
      database: 'Pendente',
      env: 'Pendente',
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };

    // 1. Teste DB
    const start = performance.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const end = performance.now();
    
    if (error) {
        results.database = `❌ Erro: ${error.message}`;
    } else {
        results.database = `✅ Conectado (${(end - start).toFixed(2)}ms)`;
    }

    // 2. Teste Env
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        results.env = '✅ Variáveis Críticas Carregadas';
    } else {
        results.env = '❌ Faltam Variáveis de Ambiente';
    }

    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}