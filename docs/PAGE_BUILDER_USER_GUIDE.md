# 📖 Guia do Usuário: Construtor Visual de Páginas (RepVendas)

Este guia orienta representantes, administradores e gestores de distribuidoras sobre como criar, editar e publicar páginas personalizadas utilizando o **Page Builder Visual do RepVendas**.

---

## 🎯 Visão Geral

O Construtor Visual de Páginas permite montar páginas institucionais, hotsites de marcas, termos de garantia, FAQ, promoções e vitrines dinâmicas de produtos sem necessidade de programação.

### Principais Benefícios
- **Editor Drag & Drop e Inspeção Direta**: Visualização em tempo real do resultado final.
- **Blocos Inteligentes Integrados ao Catálogo**: Vitrines de produtos e carrosséis de marcas que se atualizam automaticamente conforme os preços e estoques mudam no banco de dados.
- **Histórico Inteligente (Undo / Redo)**: Até 80 níveis de desfazer/refazer com salvamento em memória.
- **Multi-Tenant Seguro**: Isolamento total de dados entre organizações e distribuidoras.

---

## 🚀 Como Acessar o Construtor Visual

1. Acesse o **Menu Lateral** no Painel do RepVendas.
2. Navegue para **Empresa** ➔ **Páginas da Empresa**.
3. Para criar uma nova página: clique no botão **"Nova Página"** no canto superior direito.
4. Para editar uma página existente: clique no ícone de edição (✏️) na lista de páginas.

---

## 🛠️ Estrutura do Editor Visual

O editor é composto por três áreas principais:

```text
┌─────────────────────────┬──────────────────────────────────┬────────────────────────┐
│  Painel de Estrutura    │        Canvas de Preview         │  Inspetor de Propried. │
│  (Esquerda)             │        (Centro)                  │  (Direita)             │
│                         │                                  │                        │
│ - Lista de Blocos       │ - Cabeçalho / Hero Capa          │ - Título & Subtítulo   │
│ - Adicionar Novo Bloco  │ - Renderização em Tempo Real     │ - Ajustes de Fonte     │
│ - Botões Desfazer/Refazer│ - Alternar Desktop / Mobile      │ - Seleção de Fontes    │
│ - Salvar Rascunho       │                                  │ - Cores e Alinhamentos │
└─────────────────────────┴──────────────────────────────────┴────────────────────────┘
```

---

## 🧩 Biblioteca de Blocos Disponíveis

### 1. 🖼️ Capa Hero (Cabeçalho da Página)
- **Finalidade**: Destaque principal no topo da página.
- **Configurações**:
  - Imagem de fundo (Upload ou URL).
  - Título principal e Subtítulo.
  - Botão de Ação (CTA) com link personalizado.
  - Alinhamento (Esquerda, Centro, Direita), altura e overlay escuro.

### 2. 📝 Bloco de Texto Rico
- **Finalidade**: Parágrafos formatados, artigos, termos legais ou comunicados.
- **Recursos**: Formatação rich text, controle de alinhamento e largura do container.

### 3. 🎯 Título de Seção (Heading)
- **Finalidade**: Dividir a página em seções com hierarquia clara (H2, H3).
- **Recursos**: Subtítulo opcional e divisores visuais.

### 4. 🖼️ Galeria de Imagens
- **Finalidade**: Exibir coleções de fotos, banners de promoções ou fotos do showroom.
- **Configurações**: Layout em Grade (2, 3 ou 4 colunas) ou Carrossel interativo.

### 5. ❓ FAQ (Perguntas Frequentes)
- **Finalidade**: Sanar dúvidas de clientes sobre frete, prazos de entrega, trocas e garantias.
- **Recursos**: Acordeão expansível. Cada pergunta possui um ID estável que preserva o estado ao reordenar.

### 6. 📊 Indicadores e Números (Stats)
- **Finalidade**: Exibir métricas de impacto (ex: "Mais de 10.000 clientes", "25 anos no mercado").
- **Configurações**: Seleção de 2, 3 ou 4 colunas responsivas.

### 7. 💬 Depoimentos (Testimonials)
- **Finalidade**: Prova social com avaliações de clientes e compradores.
- **Recursos**: Nome do cliente, cargo/empresa, texto do depoimento, foto de perfil e nota de 1 a 5 estrelas.

### 8. 🎬 Vídeo Incorporado
- **Finalidade**: Apresentação da empresa, tutoriais de produtos ou vídeos institucionais.
- **Suporte**: Links diretos do YouTube e Vimeo.
- **Segurança**: Validação automática de domínio para evitar injeção de links maliciosos.

### 9. 📞 Contato & WhatsApp
- **Finalidade**: Facilitar o atendimento direto com o cliente ou representante.
- **Recursos**: Botão nativo para conversa no WhatsApp, e-mail de contato, telefone, endereço e horário de funcionamento. Suporta puxar dados padrão da empresa automaticamente.

---

## 🛍️ Blocos Inteligentes (Fase 2B)

### 📦 Vitrine Dinâmica de Produtos (`products`)
Exibe os produtos diretamente do catálogo da empresa sem duplicar informações de preço ou foto no rascunho da página.

- **Modos de Origem (`Source`)**:
  - ⭐ **Em Destaque**: Produtos marcados como destaque no catálogo (`is_featured = true`).
  - 🚀 **Lançamentos**: Produtos marcados como lançamento (`is_launch = true`) ordenados por data de cadastro.
  - 🏷️ **Por Marca**: Exibe produtos de uma marca específica (requer selecionar a marca).
  - 📂 **Por Categoria**: Exibe produtos de uma categoria específica (requer selecionar a categoria).
  - 🖐️ **Seleção Manual**: Escolha individual de produtos com preservação da ordem selecionada.
- **Limite de Produtos**: Ajustável estritamente entre **4** e **24** itens (padrão: **8**).
- **Layout**: Grade responsiva ou Carrossel.

### 🏢 Vitrine de Marcas (`brands`)
Exibe os logotipos das marcas comercializadas pela empresa.

- **Modos de Origem (`Source`)**:
  - 🏭 **Todas da Empresa**: Exibe automaticamente todas as marcas vinculadas à organização.
  - 🖐️ **Seleção Manual**: Escolha manual de marcas específicas mantendo a ordem desejada.
- **Colunas**: Opções de 2, 3, 4 ou 6 colunas por linha.

---

## ⚙️ Regras Importantes & Boas Práticas

1. **Preços e Estoques Sempre Atualizados**:
   - Os blocos dinâmicos **nunca salvam snapshots de preço, nome ou imagem** no JSON da página.
   - Qualquer alteração feita no cadastro do produto (ex: mudança de preço ou nova foto) é refletida instantaneamente na página pública.

2. **Segurança de Slugs Reservados**:
   - Não é possível criar páginas com URLs reservadas do sistema (ex: `/produtos`, `/checkout`, `/admin`, `/login`).
   - O sistema valida a unicidade do slug garantindo isolamento por organização (`organization_id`).

3. **Histórico e Atalhos**:
   - Use `Ctrl + Z` para desfazer e `Ctrl + Y` / `Ctrl + Shift + Z` para refazer alterações.
   - As setas ⬆️ ⬇️ no painel de estrutura permitem reordenar blocos com facilidade.

---

## 🔍 Homologação e Pré-visualização

Antes de publicar uma página:
1. Use o modo **Preview** dentro do editor para verificar a aparência em desktop e mobile.
2. Certifique-se de que todos os produtos ou marcas configurados pertençam à organização atual.
3. Alterne a chave **"Ativa / Inativa"** conforme a necessidade de visibilidade no catálogo público.
