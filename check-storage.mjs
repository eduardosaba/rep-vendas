import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Erro: Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyStorage() {
  console.log('🔍 Iniciando verificação de Storage...');

  try {
    // 1. lista buckets
    const { data: buckets, error: bError } =
      await supabase.storage.listBuckets();
    if (bError) {
      console.error('❌ Erro ao listar buckets:', bError.message || bError);
      return;
    }
    console.log(
      '✅ Conexão OK. Buckets encontrados:',
      (buckets || []).map((b) => b.name)
    );

    // 2. lista primeiros arquivos do bucket `product-images`
    const bucketName = 'product-images';
    const { data: files, error: fError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 5 });

    if (fError) {
      console.error(
        `❌ Erro ao acessar bucket '${bucketName}':`,
        fError.message || fError
      );
    } else {
      console.log(
        `📂 Arquivos no bucket '${bucketName}' (primeiros 5):`,
        (files || []).map((f) => f.name)
      );
    }

    // 3. se o usuário passou um path como argumento, tenta fazer download
    const argPath = process.argv[2];
    if (argPath) {
      console.log(`📥 Tentando download do arquivo: ${argPath}`);
      const { data: downloadData, error: dlError } = await supabase.storage
        .from(bucketName)
        .download(argPath);
      if (dlError) {
        console.error('❌ Erro no download:', dlError.message || dlError);
      } else {
        // @ts-ignore
        const arrayBuffer = await downloadData.arrayBuffer();
        console.log('✅ Download OK — bytes:', arrayBuffer.byteLength);
        const { data: pub, error: pubErr } = await supabase.storage
          .from(bucketName)
          .getPublicUrl(argPath);
        if (pubErr) console.warn('⚠️ getPublicUrl erro', pubErr);
        else console.log('🔗 Public URL (se aplicável):', pub?.publicUrl);
      }
    } else {
      console.log(
        'ℹ️ Para testar download de um arquivo específico, rode: node check-storage.mjs "path/para/arquivo.webp"'
      );
    }
  } catch (err) {
    console.error('❌ Erro inesperado', err);
  }
}

verifyStorage();
