# 📋 GUIA: Sistema de Versionamento e Notificações

## 🎯 Onde Configurar a Versão Atual

A versão do sistema está em **3 lugares** (mantenha sempre sincronizados):

### 1️⃣ `package.json` (linha 3)

```json
{
  "name": "rep-vendas",
  "version": "1.0.0",  ← ALTERE AQUI
  "private": true,
```

### 2️⃣ `.env.local` (linha 7)

```env
NEXT_PUBLIC_APP_VERSION=1.0.0  ← ALTERE AQUI
```

### 3️⃣ `src/config/updates-config.ts` (linha 34)

```typescript
export const LATEST_UPDATE: UpdateNotification = {
  version: '1.0.0',  ← ALTERE AQUI
  title: '🎉 Bem-vindo ao RepVendas 1.0!',
  date: '2024-12-19',
  highlights: [ ... ]
}
```

---

## 🚀 Como Adicionar Novidades no Popup

**Arquivo principal:** `src/config/updates-config.ts`

### Exemplo de Atualização:

```typescript
export const LATEST_UPDATE: UpdateNotification = {
  version: '1.2.0', // Nova versão
  title: '🎨 RepVendas 1.2 - Novas Integrações!', // Título do popup
  date: '2025-01-15', // Data de lançamento

  // Lista de destaques (use emojis para visual):
  highlights: [
    '🔗 Integração com WhatsApp Business',
    '📊 Novos relatórios de vendas',
    '🎯 Filtros avançados no catálogo',
    '⚡ Importação em massa de produtos',
    '🔔 Sistema de notificações push',
  ],

  ctaText: 'Ver todas as novidades', // Texto do botão
  ctaLink: '/admin/updates', // Link do botão
};
```

---

## 🎨 Comportamento do Popup

### Quando Aparece:

✅ **Primeira vez** que o usuário faz login no dashboard
✅ **Quando você lança uma nova versão** (versão diferente da última vista)

### Quando NÃO Aparece:

❌ Se o usuário já viu esta versão
❌ Se o usuário clicou em "Entendi" ou "Ver novidades"

### Controle:

- Sistema usa `localStorage` para lembrar qual foi a última versão vista
- Chave: `repvendas_last_seen_version`

---

## 📝 Passo a Passo para Nova Versão

### Cenário: Você quer lançar a versão 1.2.0

1. **Atualizar `package.json`:**

   ```json
   "version": "1.2.0"
   ```

2. **Atualizar `.env.local`:**

   ```env
   NEXT_PUBLIC_APP_VERSION=1.2.0
   ```

3. **Editar `src/config/updates-config.ts`:**

   ```typescript
   export const LATEST_UPDATE: UpdateNotification = {
     version: '1.2.0',
     title: '🚀 Nova Versão 1.2!',
     date: '2025-01-20',
     highlights: [
       '✨ Sua primeira novidade aqui',
       '🎯 Segunda funcionalidade',
       '⚡ Terceira melhoria',
     ],
   };
   ```

4. **Reiniciar o servidor dev:**

   ```bash
   # Parar o servidor atual (Ctrl+C)
   pnpm dev
   ```

5. **Testar:**
   - Acesse: `http://localhost:3000/dashboard`
   - O popup deve aparecer automaticamente
   - Para testar novamente: abra DevTools → Application → Local Storage → delete `repvendas_last_seen_version`

---

## 🎯 Dicas de Boas Práticas

### Highlights (Novidades):

- ✅ Use emojis para deixar visual
- ✅ Seja direto e objetivo (1 linha por item)
- ✅ Mantenha entre 3-5 itens (não exagere)
- ✅ Priorize o que impacta o usuário

### Versionamento Semântico:

- **1.0.0** → **1.0.1**: Correções de bugs (patch)
- **1.0.0** → **1.1.0**: Novas funcionalidades (minor)
- **1.0.0** → **2.0.0**: Mudanças grandes (major)

### Título do Popup:

- ✅ Use emojis para chamar atenção
- ✅ Seja entusiasta mas profissional
- ✅ Exemplo: `🎉 Nova Versão 1.5 - Mais Rápida e Poderosa!`

---

## 📂 Arquivos do Sistema

```
src/
├── config/
│   └── updates-config.ts          ← EDITE AQUI as novidades
├── components/
│   └── dashboard/
│       └── UpdateNotificationModal.tsx  ← Componente do popup
├── app/
│   ├── dashboard/
│   │   └── layout.tsx             ← Integração do modal
│   └── admin/
│       └── updates/
│           └── page.tsx           ← Página administrativa
├── .env.local                      ← Versão para build
└── package.json                    ← Versão do projeto
```

---

## 🧪 Testando Localmente

### Ver o popup novamente:

1. Abra DevTools (F12)
2. Vá em: **Application** → **Local Storage** → `http://localhost:3000`
3. Delete a chave: `repvendas_last_seen_version`
4. Recarregue a página (F5)

### Forçar uma nova versão:

1. Mude a versão em `updates-config.ts` para `1.0.1`
2. Recarregue o dashboard
3. O popup deve aparecer automaticamente

---

## 🎨 Preview do Popup

```
┌─────────────────────────────────────────┐
│  🚀  Bem-vindo ao RepVendas 1.0!        │
│      Versão 1.0.0 • 19/12/2024          │
├─────────────────────────────────────────┤
│  O que há de novo:                      │
│                                          │
│  🎨 Sistema de temas personalizáveis    │
│  📄 Geração de PDF otimizada            │
│  🚀 Interface administrativa completa   │
│  ⚡ Performance melhorada em 40%        │
│  🔒 Segurança aprimorada                │
│                                          │
│  [ Entendi ]  [ Ver todas as novidades ]│
└─────────────────────────────────────────┘
```

---

## ❓ FAQ

**P: O popup aparece toda vez que o usuário faz login?**  
R: Não! Apenas quando ele ainda não viu a versão atual.

**P: Como forço o popup a aparecer de novo?**  
R: Delete `repvendas_last_seen_version` do localStorage ou mude a versão.

**P: Posso desabilitar o popup temporariamente?**  
R: Sim! Comente a linha `<UpdateNotificationModal />` em `dashboard/layout.tsx`.

**P: Onde os usuários veem o histórico completo?**  
R: Na página `/admin/updates` (menu "Novidades & Updates").

**P: Preciso reiniciar o servidor ao mudar a versão?**  
R: Sim! Variáveis `NEXT_PUBLIC_*` são embutidas no build.

---

## 🎯 Próximos Passos Sugeridos

1. ✅ Versão configurada em 1.0.0
2. ✅ Popup criado e integrado
3. 🔄 Teste o popup no dashboard
4. 📝 Quando lançar versão 1.1.0, siga o guia acima
5. 🗄️ (Opcional) Migrar novidades para banco de dados Supabase

---

**Pronto!** Agora você tem controle total sobre as notificações de atualização. 🚀
