import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { version, title, date, highlights } = await request.json();

    // Validações básicas
    if (!version || !title || !date || !highlights || highlights.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 1. Atualizar package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    packageJson.version = version;
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // 2. Atualizar .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = await fs.readFile(envPath, 'utf-8');

    // Substituir ou adicionar NEXT_PUBLIC_APP_VERSION
    if (envContent.includes('NEXT_PUBLIC_APP_VERSION=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_APP_VERSION=.*/,
        `NEXT_PUBLIC_APP_VERSION=${version}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_APP_VERSION=${version}\n`;
    }

    await fs.writeFile(envPath, envContent);

    // 3. Atualizar src/config/updates-config.ts
    const configPath = path.join(process.cwd(), 'src/config/updates-config.ts');

    const highlightsFormatted = highlights
      .map((h: string) => `    '${h.replace(/'/g, "\\'")}',`)
      .join('\n');

    const newConfig = `/**
 * CONFIGURAÇÃO DE ATUALIZAÇÕES DO SISTEMA
 *
 * Este arquivo centraliza as informações sobre atualizações que serão exibidas
 * no popup de notificação quando o usuário fizer login no dashboard.
 *
 * INSTRUÇÕES:
 * 1. Sempre que lançar uma nova versão, atualize:
 *    - package.json (campo "version")
 *    - .env.local (NEXT_PUBLIC_APP_VERSION)
 *    - Este arquivo (LATEST_UPDATE)
 *
 * 2. O popup aparecerá APENAS UMA VEZ para cada versão por usuário
 *    (controlado via localStorage)
 *
 * 3. Adicione quantos highlights quiser, mas mantenha entre 3-5 itens
 */

export interface UpdateNotification {
  version: string;
  title: string;
  date: string;
  highlights: string[];
}

/**
 * EDITE AQUI: Informações da última atualização
 * Esta será a notificação exibida no popup
 */
export const LATEST_UPDATE: UpdateNotification = {
  version: '${version}',
  title: '${title.replace(/'/g, "\\'")}',
  date: '${date}',
  highlights: [
${highlightsFormatted}
  ],
};

/**
 * HISTÓRICO DE ATUALIZAÇÕES
 * Mantenha este array atualizado para referência futura
 */
export const UPDATE_HISTORY: UpdateNotification[] = [
  LATEST_UPDATE,
  // Próximas versões serão adicionadas acima
];

/**
 * CHAVE DO LOCALSTORAGE
 * Não altere este valor ou todos os usuários verão o popup novamente
 */
export const LAST_SEEN_VERSION_KEY = 'repvendas_last_seen_version';
`;

    await fs.writeFile(configPath, newConfig);

    return NextResponse.json({
      success: true,
      message: 'Atualização publicada com sucesso!',
      updated: {
        packageJson: packageJsonPath,
        envLocal: envPath,
        updatesConfig: configPath,
      },
    });
  } catch (error) {
    console.error('Erro ao salvar atualização:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar atualização', details: error },
      { status: 500 }
    );
  }
}
