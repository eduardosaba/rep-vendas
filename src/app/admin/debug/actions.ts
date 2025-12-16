'use server';

import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';

// Função auxiliar de segurança
async function checkPermissions() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'SEGURANÇA: Esta ferramenta só funciona em ambiente local (localhost).'
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

export async function saveSystemFile(filePath: string, fileContent: string) {
  try {
    await checkPermissions();

    const cleanPath = filePath.replace(/\.\./g, '');
    const fullPath = path.join(process.cwd(), cleanPath);

    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, fileContent, 'utf-8');

    return {
      success: true,
      message: `Arquivo gravado com sucesso!`,
      path: fullPath,
    };
  } catch (error: any) {
    console.error('Erro ao salvar:', error);
    return { success: false, error: error.message };
  }
}

// --- NOVA FUNÇÃO: Verifica se o arquivo existe e retorna metadados ---
export async function verifySystemFile(filePath: string) {
  try {
    await checkPermissions();

    const cleanPath = filePath.replace(/\.\./g, '');
    const fullPath = path.join(process.cwd(), cleanPath);

    // Tenta ler os status do arquivo
    const stats = await fs.stat(fullPath);

    return {
      success: true,
      exists: true,
      size: stats.size,
      lastModified: stats.mtime.toLocaleString('pt-BR'),
      message: 'Arquivo verificado no disco com sucesso.',
    };
  } catch (error: any) {
    return {
      success: false,
      exists: false,
      error: 'Arquivo não encontrado ou inacessível.',
    };
  }
}
