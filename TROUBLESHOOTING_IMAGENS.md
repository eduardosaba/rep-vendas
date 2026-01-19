# 🔍 Guia de Troubleshooting: Otimização de Imagens

## 1️⃣ Diagnóstico Inicial

### No Navegador (F12)

1. Abra o DevTools (F12)
2. Vá na aba **Network** (Rede)
3. Clique no botão "Otimizar Imagens"
4. Procure a requisição `/api/admin/sync-images`
5. Anote o código de status:
   - ✅ **200**: Sucesso
   - ⚠️ **504**: Timeout (servidor demorou demais)
   - ❌ **500**: Erro interno (Sharp, memória, etc.)
   - 🔒 **403**: Sem permissão (RLS/Storage)

### No Terminal Local

Se rodando `pnpm dev`, os erros aparecem no terminal:

```bash
# Procure por:
Error: ...
TypeError: ...
SupabaseError: ...
```

### No Deploy (Vercel/Railway)

Acesse os **Logs da Function** no painel do provedor.

---

## 2️⃣ Causas Comuns e Soluções

### 🕐 Causa A: Timeout (504 Gateway Timeout)

**Sintoma**: Requisição demora mais de 10-30 segundos

**Por quê**:

- Vercel Free Tier: 10s de timeout
- Processar 25 imagens pesadas (5MB cada) pode levar 60-90s

**Solução**:

1. Reduza o lote de 25 para **5 imagens** temporariamente
2. Se funcionar, o problema é tempo
3. Estratégias:
   - Processar em background (Vercel Cron + Queue)
   - Usar Worker separado (Inngest, BullMQ)
   - Aumentar timeout (Vercel Pro: 60s)

**Código**:

```typescript
// Em sync-images/route.ts, linha ~24
.limit(5); // Reduza de 25 para 5 para testar
```

---

### 📦 Causa B: Sharp não instalado corretamente

**Sintoma**: `Error: Cannot find module 'sharp'`

**Por quê**: Sharp precisa de bibliotecas nativas do Linux no deploy

**Solução**:

```bash
# 1. Reinstale o Sharp
pnpm remove sharp
pnpm add sharp

# 2. Verifique se está em dependencies (não devDependencies)
# package.json deve ter:
"dependencies": {
  "sharp": "^0.33.5"
}

# 3. Force rebuild antes do deploy
pnpm run build
```

---

### 🌐 Causa C: Safilo bloqueando servidor

**Sintoma**: `Error: HTTP 403` ao baixar imagem da Safilo

**Por quê**: A Safilo detecta que não é um navegador real

**Solução**: Adicione User-Agent realista

```typescript
// Em sync-images/route.ts, no fetch()
const response = await fetch(product.image_url, {
  signal: AbortSignal.timeout(45000),
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});
```

---

### 💾 Causa D: Política RLS do Supabase Storage

**Sintoma**: `Error: new row violates row-level security policy`

**Por quê**: Storage bucket não permite upload do service role

**Solução**:

1. Vá no Supabase → Storage → `product-images` (seu bucket)
2. Políticas → Adicione:

```sql
-- Política de UPLOAD para Service Role
CREATE POLICY "Service role can upload"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'product-images');
```

---

### 🧠 Causa E: Falta de Memória (OOM)

**Sintoma**: Function crashou sem erro específico

**Por quê**: Sharp + 25 imagens simultâneas = muito RAM

**Solução**:

1. Processe **1 imagem por vez** (loop sequencial, não `Promise.all()`)
2. Force garbage collection entre lotes
3. Considere usar Streaming em vez de Buffer completo

---

## 3️⃣ Código de Debug Avançado

Adicione logs detalhados na API route:

```typescript
for (const product of pendingProducts) {
  try {
    console.log(`[${product.id}] Iniciando processamento...`);

    const response = await fetch(product.image_url, {
      signal: AbortSignal.timeout(45000),
    });

    console.log(`[${product.id}] Status HTTP: ${response.status}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[${product.id}] Buffer carregado: ${buffer.length} bytes`);

    const optimizedBuffer = await sharp(buffer)
      .resize(600, 600, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    console.log(`[${product.id}] Sharp OK: ${optimizedBuffer.length} bytes`);

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(`products/${product.id}-medium.webp`, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) throw uploadError;
    console.log(`[${product.id}] ✅ Upload sucesso!`);
  } catch (err: any) {
    console.error(`[${product.id}] ❌ ERRO:`, err.message, err.stack);
  }
}
```

---

## 4️⃣ Checklist de Verificação

- [ ] `pnpm run build` funciona sem erros?
- [ ] Sharp aparece em `dependencies` no package.json?
- [ ] Bucket `product-images` existe no Supabase Storage?
- [ ] Política RLS permite upload do service role?
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está nas variáveis de ambiente?
- [ ] URL das imagens da Safilo está acessível (teste manual no navegador)?
- [ ] Logs mostram em qual etapa o erro ocorre?

---

## 5️⃣ Teste Isolado (Smoke Test)

Crie um endpoint de teste para validar apenas o Sharp:

```typescript
// src/app/api/test-sharp/route.ts
import sharp from 'sharp';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Testa se Sharp está instalado
    const info = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .webp()
      .toBuffer();

    return NextResponse.json({
      success: true,
      size: info.length,
      message: 'Sharp está funcionando!',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
```

Acesse `/api/test-sharp` e veja se retorna sucesso.

---

## 6️⃣ Próximos Passos

Se após todas as verificações o erro persistir:

1. **Compartilhe os logs** exatos que aparecem
2. Informe o **código HTTP** da requisição
3. Diga se está **local** ou em **deploy**
4. Informe o **provedor** (Vercel, Railway, etc.)

Com essas informações, posso criar uma solução cirúrgica.
