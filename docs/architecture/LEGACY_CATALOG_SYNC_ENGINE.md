# 📖 Contexto do Sistema: Engenharia de Catálogos e Sincronização

Este documento descreve as engrenagens operacionais e o comportamento das tabelas do RepVendas no modelo **PERSONAL (Representante Comercial Autônomo)** e sua transição para o modelo **BUSINESS (Distribuidora/Corporativo)**.

---

## 🚀 1. Arquitetura de Portfólio e Ownership (Quem é o Dono?)

A tabela `public.products` acomoda de forma pacífica dois modelos de negócios concorrentes por meio do controle estrito do `CatalogScopeResolver`:

```text
Cenário PERSONAL (Legado Representante)  │ Cenário BUSINESS (Distribuidora Master)
─────────────────────────────────────────┼─────────────────────────────────────────
organizations (Tenant: Representante)     │ organizations (Tenant: Distribuidora)
    └── profiles.role = 'user'           │     └── profiles.role = 'admin' / 'master'
    └── products.user_id = FK (Dono)     │     └── products.organization_id = FK (Dono)
    └── products.organization_id = FK    │     └── products.user_id = Operador/Criador

```

* **Regra de Ouro:** No cenário `PERSONAL`, o representante é o dono absoluto de suas próprias referências, imagens e preços. No cenário `BUSINESS`, a Distribuidora é a dona do Catálogo Master e os representantes vinculados apenas consomem o grafo de dados.

---

## 📦 2. Cadastro e Importação de Produtos em Massa

Os representantes gerenciam e alimentam o inventário por meio de três canais integrados:

### A. Cadastro Manual Individual

* Formulário especializado com taxonomia do mercado óptico: **Referência (Código de Fábrica), Grife/Marca, Gênero, Material do Frame/Haste, Formato do Frame, Cor Nominal, Coleção, Fotocromático (bool) e Polarizado (bool)**.
* Os preços são salvos de forma híbrida e convertidos em centavos ou decimais (`price`, `sale_price`, `cost`) para garantir precisão nas operações financeiras.

### B. Importação de Planilhas (Excel/CSV)

* O processamento é registrado na tabela de histórico (`import_history`).
* Cada produto inserido recebe a tag `last_import_id` para permitir auditoria, rollback ou atualizações em lote caso a planilha seja reenviada.
* **A trava de unicidade** é governada pelo índice composto do banco: `unique_user_reference (user_id, reference_code)`. Isso impede que o mesmo representante duplique uma referência, mas permite que representantes diferentes vendam o mesmo modelo de óculos de forma isolada.

---

## 🖼️ 3. O Motor de Imagens em Massa & Otimização CDN

O RepVendas lida com volumes massivos de fotos de armações sem sobrecarregar o servidor Node.js por meio de um pipeline assíncrono:

```text
Upload em Lote ──> Supabase Storage (Bucket) ──> Webhook/Trigger do Banco
                                                         │
Direct CDN URL <── Public Img (image_path) <── Image Otimizada (Tiny/WebP)

```

1. **Upload Direto:** As imagens são injetadas diretamente no Storage do Supabase.
2. **Otimização de Mídia:** O sistema atualiza as colunas de metadados (`image_optimized`, `original_size_kb`, `optimized_size_kb`) após processar e comprimir os arquivos.
3. **Entrega via CDN:** As lógicas e componentes front-end (`SmartImage.tsx`, `imageUtils.ts`) são terminantemente proibidas de usar proxies de rotas internas do Next.js (como `/api/storage-image`). Elas constroem a URL pública **direto da CDN do Supabase** (`buildSupabaseImageUrl`), poupando os workers e acelerando o carregamento da vitrine.

---

## 👥 4. Clonagem de Catálogos & O Matcher (Compartilhamento)

Para evitar retrabalho quando um representante ou distribuidora já possui o catálogo de uma marca (ex: Safilo) cadastrado com fotos perfeitas, o sistema utiliza o **Catálogo Espelho (Clone)**:

### A. O Vínculo de Cópia (`original_product_id`)

* Quando um representante "clona" um catálogo autorizado, o sistema gera novos registros para ele, porém amarra a coluna `original_product_id` apontando para o produto matriz.
* **Atributo `image_is_shared = true`:** Indica que o clone não precisa fazer upload de novas imagens para o Storage; ele aponta e consome o `image_path` ou a `gallery_images` do produto original. Se a matriz atualizar a foto, todos os clones herdam a imagem na hora.

### B. O Mecanismo do Matcher

* Ao rodar uma importação em massa, o **Matcher Engine** varre as referências enviadas pelo usuário.
* Se ele encontrar um `reference_code` idêntico em um produto corporativo global ou de outro representante parceiro, o Matcher faz a conciliação automática: sugere o vínculo das especificações técnicas e das fotos otimizadas, preenchendo a coluna `sync_status = 'synced'`.

---

## 🏁 5. Diretrizes Rigorosas para o Desenvolvimento (Antigravity IDE)

> **⚠️ Atenção Agente:** A arquitetura estrutural e o core de infraestrutura estão congelados. Nenhuma nova camada de abstração (EventBus, Services extras, Registries ou arquivos de planejamento `.md`) deve ser criada.

Ao codificar as próximas telas da **Fase 2 (Produtos/Edição, Equipe, Estoque e Pedidos)**, você deve obrigatoriamente:

1. **Respeitar o Escopo Nativo:** Utilizar as colunas existentes de taxonomia óptica da tabela `products`.
2. **Filtrar por Contexto:** Chamar o `resolveCatalogScope` antes de listar ou inserir para isolar os dados corporativos (`BUSINESS`) dos dados de representantes (`PERSONAL`).
3. **Utilizar a Factory:** Instanciar as conexões de persistência através da `RepositoryFactory` e dos mappers gerados do lado do servidor.

---

## 🔒 6. Controle de Acesso e Equipe

* **O usuário não é necessariamente o dono do catálogo.**
* O ownership vem do `CatalogScopeResolver`. Se for `BUSINESS`, a Distribuidora é a dona, e a equipe apenas consome ou gerencia baseado nos papéis (`OWNER`, `ADMIN`, `MANAGER`, `REPRESENTATIVE`, `VIEWER`).
* O fluxo de equipe deve criar um vínculo formal na tabela `team_invites` e, no aceite, alterar o `organization_id` do novo representante para integrá-lo ao catálogo unificado da empresa.
