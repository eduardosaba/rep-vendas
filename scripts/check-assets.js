import fs from 'fs';
import path from 'path';

export function checkGoogleSvg() {
  const p = path.join(process.cwd(), 'public', 'images', 'google.svg');
  if (!fs.existsSync(p)) {
    console.warn(`
[assets-check] Aviso: public/images/google.svg não encontrado.
  - O botão de login com Google usará um placeholder no deploy.
  - Para corrigir, adicione o arquivo em public/images/google.svg ou defina NEXT_PUBLIC_APP_URL apontando para um host com o recurso.
`);
    return false;
  }
  return true;
}

// Outros checks podem ser adicionados aqui no futuro
const ok = checkGoogleSvg();
if (!ok) process.exitCode = 0; // não falha a build, apenas avisa
