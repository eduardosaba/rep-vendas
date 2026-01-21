import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carrega variáveis de ambiente locais se existirem
function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach((line) => {
      const [key, ...REST] = line.split('=');
      if (key && REST) {
        const val = REST.join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
        process.env[key.trim()] = val;
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '❌ ERRO: Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

async function fixCatalog() {
  console.log('🔍 Iniciando Correção e Restauração de Produtos...');
  console.log('⚠️  Objetivo: Recuperar capas perdidas e re-organizar P00.');

  const PAGE_SIZE = 500;
  let hasMore = true;
  let page = 0;

  // Estatísticas
  let stats = {
    evaluated: 0,
    fixed: 0,
    restoredFromGallery: 0, // Produtos onde a capa tinha sumido
    galleryCleaned: 0,
    skippedNull: 0,
    triggeredResync: 0,
  };

  while (hasMore) {
    // Busca tudo para garantir que vamos pegar os NULLs e os errados
    const { data: products, error } = await supabase
      .from('products')
      .select('id, sku, name, image_url, images, sync_status')
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Erro crítico busca:', error.message);
      break;
    }

    if (!products || products.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`\n📦 Lote ${page + 1}: ${products.length} itens...`);

    for (const p of products) {
      // --- 1. COLETA ROBUSTA DE DADOS (Tenta achar URL onde quer que esteja) ---
      let rawUrls = [];

      // Capa
      if (p.image_url) rawUrls.push(p.image_url);

      // Galeria (Pode vir de varias formas dependendo do erro anterior)
      if (p.images) {
        if (Array.isArray(p.images)) {
          rawUrls.push(...p.images);
        } else if (typeof p.images === 'string') {
          try {
            // Tenta parsear JSON se parecer JSON
            if (p.images.trim().startsWith('[')) {
              const parsed = JSON.parse(p.images);
              if (Array.isArray(parsed)) rawUrls.push(...parsed);
            } else {
              // Senão, split por vírgula
              rawUrls.push(...p.images.split(','));
            }
          } catch (e) {
            // Fallback bruto
            rawUrls.push(...p.images.split(','));
          }
        }
      }

      // Limpeza inicial
      let uniqueUrls = [
        ...new Set(
          rawUrls
            .map((u) => (typeof u === 'string' ? u.trim() : null))
            .filter((u) => u && u.length > 8) // URL minima "http://a"
        ),
      ];

      if (uniqueUrls.length === 0) {
        // Se não tem imagem nenhuma e o SKU parece Safilo (pela logica de negocio ou se só sobrou isso)
        // Vamos forçar um re-sync para tentar baixar de novo.
        if (p.image_url === null) {
          const { error: syncErr } = await supabase
            .from('products')
            .update({
              sync_status: 'pending',
              updated_at: new Date().toISOString(),
            })
            .eq('id', p.id);

          if (!syncErr) {
            stats.triggeredResync++;
            process.stdout.write('🔄');
          } else {
            process.stdout.write('E');
          }
        } else {
          stats.skippedNull++;
          process.stdout.write('.');
        }
        continue;
      }

      stats.evaluated++;

      // --- 2. FILTRAGEM INTELIGENTE (P13/P14) ---
      // Só remove P13/P14 se for EXTERNA. Se for interna mantemos por segurança.
      const cleanUrls = uniqueUrls.filter((u) => {
        const low = u.toLowerCase();
        const isInternal = low.includes('supabase.co');
        const isTrash = low.includes('p13.') || low.includes('p14.');

        // Mantém se for interna OU se NÃO for lixo
        return isInternal || !isTrash;
      });

      // --- 3. ELEIÇÃO DE CAPA (P00) ---
      // Prioridade:
      // 1. P00 Safilo Externa (Original)
      // 2. Internalizada (Pode ser uma P00 que já foi baixada)
      // 3. Primeira da lista

      const p00Index = cleanUrls.findIndex((u) =>
        u.toLowerCase().includes('p00.')
      );

      let newCover = null;
      let newGallery = [];

      if (p00Index !== -1) {
        newCover = cleanUrls[p00Index];
        newGallery = cleanUrls.filter((_, i) => i !== p00Index);
      } else {
        // Se não tem P00 explícito
        // Mantém a capa atual SE ela ainda existir na lista limpa
        // (Para não trocar imagem de quem não é Safilo ou de quem já estava certo)
        if (p.image_url && cleanUrls.includes(p.image_url)) {
          newCover = p.image_url;
          newGallery = cleanUrls.filter((u) => u !== newCover);
        } else {
          // Se a capa era nula ou foi removida pelo filtro (era uma P13), elege a primeira
          newCover = cleanUrls[0];
          newGallery = cleanUrls.slice(1);
        }
      }

      if (!newCover) {
        // Se depois de tudo não sobrou capa (ex: só tinha P13 no produto), infelizmente fica null
        process.stdout.write('❌');
        continue;
      }

      // --- 4. DETECÇÃO DE MUDANÇA E SALVAMENTO ---
      const oldCover = p.image_url || '';
      const oldGalleryStr = JSON.stringify(
        Array.isArray(p.images) ? p.images : []
      ); // Simplificado

      const newGalleryStr = JSON.stringify(newGallery);

      // Regra de Sync: Se a Nova Capa é Externa -> Pending
      // Se a Nova Capa é Interna -> Synced
      // Se manteve a capa -> Mantém status (ou synced se tava null)
      const isExternal = !newCover.includes('supabase.co');

      // Força 'pending' se trocou a capa para externa.
      // Se manteve a capa, NÃO mexe no status (para não loopar sync de quem já falhou antes)
      let nextStatus = p.sync_status;
      if (newCover !== oldCover && isExternal) {
        nextStatus = 'pending';
      } else if (!p.sync_status) {
        nextStatus = isExternal ? 'pending' : 'synced';
      }

      // Verifica se houve mudança real nos DADOS (Capa ou Galeria)
      const contentChanged =
        oldCover !== newCover || p.images?.length !== newGallery.length; // Comparação rápida length + capa cobrem 99%

      if (contentChanged) {
        const { error: updErr } = await supabase
          .from('products')
          .update({
            image_url: newCover,
            images: newGallery,
            updated_at: new Date().toISOString(),
            sync_status: nextStatus,
          })
          .eq('id', p.id);

        if (updErr) {
          console.error(`Erro SKU ${p.sku}: ${updErr.message}`);
        } else {
          stats.fixed++;
          if (!oldCover) {
            process.stdout.write('👻'); // Ressuscitou
            stats.restoredFromGallery++;
          } else process.stdout.write('✅');
        }
      } else {
        process.stdout.write('.');
      }
    }

    page++;
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log('\n\n🏁 Concluído!');
  console.log('Resultados:', stats);
}

fixCatalog().catch((e) => console.error(e));
