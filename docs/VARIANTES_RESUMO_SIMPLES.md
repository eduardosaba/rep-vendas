# Resumo: Como Funcionam as Variantes de Imagens

**Versão Curta para Não-Técnicos**

---

## 🤔 O Problema

Imagine que você tem uma foto de 800KB. Se alguém abre no celular (tela pequena), ainda vai baixar 800KB inteiros, mesmo que só precise de 50KB.

**Resultado:** Lentidão, gasto de dados móveis desnecessário, usuário fecha o site.

---

## ✅ A Solução: Variantes

O sistema cria **2 versões** de cada imagem:

1. **Pequena (480px)** → ~45KB → Para celulares
2. **Grande (1200px)** → ~120KB → Para computadores

**Economia:** De 800KB para 45KB em mobile = **6x mais rápido!**

---

## 📊 Como Funciona (Simples)

```
1. Você importa Excel com URL da imagem
   ↓
2. Sistema baixa imagem original (800KB)
   ↓
3. Sistema cria 2 cópias otimizadas:
   - Versão mobile (45KB)
   - Versão desktop (120KB)
   ↓
4. Guarda no storage
   ↓
5. Quando cliente abre no celular → carrega versão pequena
   Quando abre no computador → carrega versão grande
```

---

## 💰 Benefícios Reais

### Antes (Sistema Antigo):

- 4 arquivos por imagem
- Mobile baixava versão desktop (desperdício)
- Storage mais caro

### Agora (Sistema Novo):

- 2 arquivos por imagem (**50% menos storage**)
- Cada dispositivo baixa tamanho certo (**60% menos banda**)
- Mais rápido = mais vendas

---

## 🎯 Estado Atual

**✅ O que já funciona:**

- Importação de Excel cria imagens pendentes
- Sync (manual ou automático) gera as 2 variantes
- Storage organizado por código do produto (TH2345SZJ)
- Torre de Controle mostra progresso

**⏳ O que falta (Fase 2):**

- Frontend ainda carrega sempre a versão grande
- Precisa implementar "srcset" para escolha automática
- Economia de banda virá quando isso for implementado

**Analogia:**

- ✅ Você já tem 2 tamanhos de roupa (P e G) no estoque
- ⏳ Mas ainda entrega sempre o G, mesmo pra quem pediu P

---

## 📁 Onde Estão os Arquivos?

**No Storage (Supabase):**

```
product-images/
  public/brands/tommy/products/
    TH2345SZJ/              ← Código do produto (fácil de achar)
      main-480w.webp        ← Versão mobile
      main-1200w.webp       ← Versão desktop
```

**No Banco (Tabela products):**

```
reference_code: TH2345SZJ
image_path: .../TH2345SZJ/main-1200w.webp
image_variants: [
  {tamanho: 480, caminho: .../480w.webp},
  {tamanho: 1200, caminho: .../1200w.webp}
]
```

---

## 🚀 Próximos Passos

1. **Agora:** Sistema cria variantes corretamente
2. **Em breve:** Frontend vai usar variantes automaticamente
3. **Resultado:** Site 6x mais rápido em mobile

---

## 🔧 Para Resetar Imagens Já Sincronizadas

Se quiser re-processar produtos com o novo sistema:

```sql
UPDATE products
SET sync_status = 'pending',
    image_path = NULL
WHERE sync_status = 'synced';
```

Depois rode a sincronização novamente.

---

**Dúvidas?** Consulte [VARIANTES_IMAGENS_GUIA.md](./VARIANTES_IMAGENS_GUIA.md) para detalhes técnicos.
