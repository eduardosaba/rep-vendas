# Plano de Retomada — Ótica e Distribuidora (Ecossistema B2B RepVendas)

## 1. Primeiro: Estabilizar o que já existe

Antes de implementar novos módulos:

- [x] Concluir o merge de `fix/product-validation-and-images` em `main` (**Concluído no PR #11 - commit e0fa416**);
- [ ] Validar imagens, edição de produtos, variantes e carrossel em produção;
- [ ] Confirmar se o código de barras voltou a aparecer nos pedidos;
- [ ] Registrar os bugs restantes ou abrir branch isolada (`fix/orders-product-barcode-display`) se necessário.

Essa etapa deve ser curta e objetiva. Depois dela, retomamos a implementação dos perfis de negócio.

---

## 2. Estrutura dos Tipos de Empresa

O sistema precisa reconhecer claramente dois modelos principais de cliente final e intermediários:

### Perfil Ótica
Voltado para quem compra produtos de representantes e distribuidoras.

**Principais necessidades:**
* Consultar catálogos liberados;
* Selecionar produtos e variantes;
* Criar pedidos B2B;
* Acompanhar status dos pedidos;
* Consultar histórico de compras;
* Controlar fornecedores vinculados;
* Visualizar condições comerciais e tabelas atribuídas;
* Salvar produtos favoritos;
* Repetir pedidos anteriores rapidamente.

### Perfil Distribuidora
Voltado para quem cadastra produtos, gerencia equipes comerciais e vende para óticas.

**Principais necessidades:**
* Cadastrar e gerenciar marcas e produtos;
* Controlar estoque (disponível, reservado, mínimo);
* Administrar representantes vinculados;
* Receber e analisar pedidos das óticas;
* Aprovar, ajustar ou rejeitar pedidos;
* Definir políticas comerciais e tabelas de preço por cliente;
* Acompanhar vendas consolidando dados da equipe;
* Gerar relatórios de desempenho e estoque;
* Disponibilizar catálogos personalizados para clientes.

### Perfil Representante
Vinculado a uma distribuidora ou operando de forma independente na carteira de clientes autorizada.

---

## 3. Cadastro e Onboarding

A primeira grande implementação deve ser um onboarding diferenciado para cada tipo de empresa.

### Cadastro da Ótica
**Dados necessários:**
* Razão Social / Nome Fantasia;
* CNPJ;
* Endereço completo (entrega e faturamento);
* Responsável legal e comprador;
* Telefone e WhatsApp comercial;
* E-mail principal;
* Número de lojas / filiais;
* Segmento de atuação;
* Marcas de interesse e fornecedores atuais.

### Cadastro da Distribuidora
**Dados necessários:**
* Razão Social / Nome Fantasia;
* CNPJ;
* Endereço completo;
* Responsável da conta;
* Marcas representadas / exclusividades;
* Regiões e estados atendidos;
* Representantes vinculados;
* Política comercial (condições de pagamento, frete);
* Pedido mínimo (em valor ou peças).

### Definição Técnica
Adicionar o tipo de organização ao modelo de domínio:

```ts
export type OrganizationType =
  | 'optical_store'
  | 'distributor'
  | 'independent_representative';
```

Esse campo controlará:
* Menus e navegação da sidebar;
* Permissões e regras no backend;
* Dashboards e KPIs principais;
* Visibilidade de dados e políticas RLS.

---

## 4. Permissões por Perfil

As permissões serão aplicadas tanto no backend/Server Actions quanto nas políticas RLS do Supabase.

### Permissões da Ótica
* **Pode:** Consultar produtos liberados, criar pedidos, consultar seus próprios pedidos, gerenciar seus usuários internos, visualizar fornecedores autorizados.
* **Não pode:** Editar produtos de distribuidoras, visualizar pedidos de outras óticas, acessar custos/margens internas da distribuidora, administrar representantes de terceiros.

### Permissões da Distribuidora
* **Pode:** Cadastrar e editar produtos/variantes, gerenciar estoque, receber e analisar pedidos das óticas, vincular representantes, definir preços/descontos por cliente, visualizar relatórios consolidados.

### Permissões do Representante
* **Pode:** Acessar somente sua carteira de clientes, criar pedidos em nome das óticas autorizadas, consultar catálogos da distribuidora vinculada, acompanhar metas e comissões estimadas.

### Administrador da Plataforma (SaaS)
* **Pode:** Gerenciar organizações, aprovar novos cadastros de distribuidoras/óticas, auditar operações e acompanhar uso global.

---

## 5. Fluxo Comercial entre Ótica e Distribuidora

### Etapa 1 — Vínculo Comercial
A ótica poderá:
1. Localizar uma distribuidora;
2. Solicitar acesso ao catálogo;
3. Receber convite de um representante;
4. Ser vinculada manualmente pela distribuidora.

**Status do vínculo:**
```text
pending | approved | blocked | inactive
```

### Etapa 2 — Catálogo Personalizado
A distribuidora poderá liberar por ótica:
* Marcas específicas autorizadas;
* Tabelas de preço diferenciadas;
* Descontos e regras de frete;
* Condições de pagamento aceitas;
* Lançamentos e campanhas exclusivas.

### Etapa 3 — Criação do Pedido
O pedido registrará:
* Ótica compradora;
* Distribuidora fornecedora;
* Representante responsável;
* Produtos e variantes selecionadas;
* Quantidades e valores unitários/totais;
* Descontos aplicados;
* Condição de pagamento e prazo negociado;
* Endereço de entrega selecionado.

### Etapa 4 — Análise da Distribuidora
A distribuidora poderá:
* Aprovar diretamente;
* Ajustar quantidades por disponibilidade;
* Informar indisponibilidade de itens;
* Sugerir substituição de cor/tamanho;
* Solicitar confirmação final da ótica.

### Etapa 5 — Acompanhamento e Status
```text
Rascunho -> Enviado -> Em análise -> Aguardando confirmação -> Aprovado -> Em separação -> Faturado -> Enviado -> Entregue (ou Cancelado)
```

---

## 6. Produtos e Variações para o Setor Óptico

Evolução da estrutura de produtos para armações e óculos solar/receituário.

### Dados Principais
* Marca, Referência, Código de Barras (EAN), Coleção, Gênero, Categoria, Tipo de Armação (ex: Balgriff/Parafusado, Fechada, Nylon), Material, Cor, Tamanho, Ponte, Haste, Formato, Estoque, Preço, Imagens.

### Arquitetura de Variantes
Estrutura recomendada para a camada de domínio:

```text
Product (Modelo Base / Referência)
└── ProductVariant (Variante de Cor / Tamanho / SKU)
    ├── color (ex: C1 - Preto Glossy)
    ├── size (ex: 54-18-140)
    ├── barcode (EAN-13)
    ├── stock (Disponível / Reservado)
    ├── price / sale_price
    └── images (Galeria da variante)
```

Essa separação elimina conflitos de chave única ao editar cores e tamanhos do mesmo modelo.

---

## 7. Estoque da Distribuidora

Controle de estoque por variante com os campos:

```ts
available_quantity: number; // Estoque livre para venda
reserved_quantity: number;  // Reservado em pedidos em análise/aprovação
minimum_quantity: number;   // Alerta de reposição
```

- **Ao criar/enviar pedido:** O sistema reserva a quantidade (`reserved_quantity`).
- **Ao aprovar/faturar pedido:** Baixa do estoque físico/disponível.
- **Ao cancelar pedido:** Libera a quantidade reservada de volta para a disponibilidade.

---

## 8. Tabelas de Preço e Política Comercial

Prioridade de precificação:
```text
Preço específico negociado da ótica
  ↓
Tabela de preço atribuída ao grupo/cliente
  ↓
Preço padrão do produto
```

---

## 9. Carteira de Clientes e Representantes

Controle de vínculo exclusivo ou compartilhado entre representantes, marcas e distribuidoras.

---

## 10. Dashboards Específicos

- **Dashboard da Ótica:** Pedidos em andamento, últimos pedidos, fornecedores vinculados, produtos favoritos, lançamentos.
- **Dashboard da Distribuidora:** Vendas consolidada no período, pedidos pendentes de aprovação, produtos mais vendidos, alertas de estoque baixo, desempenho da equipe.
- **Dashboard do Representante:** Carteira de clientes ativas, metas do mês, comissão estimada, pedidos pendentes.

---

## Ordem Recomendada de Implementação (Sprints)

### Sprint 1 — Base Multiempresa
1. Definir os tipos de organização (`organization_type`).
2. Revisar tabelas de organizações, usuários e papéis.
3. Implementar permissões backend e RLS.
4. Criar onboarding separado para Ótica e Distribuidora.
5. Ajustar menus e navegação da sidebar por perfil.

### Sprint 2 — Relação Comercial
1. Criar vínculo Ótica–Distribuidora (`commercial_links`).
2. Criar carteira de clientes do representante.
3. Implementar fluxo de convite e aprovação de catálogo.
4. Controle de visibilidade de marcas por cliente.

### Sprint 3 — Catálogo Óptico e Variantes
1. Separar Produto base de Variante (`Product` e `ProductVariant`).
2. Estruturar atributos ópticos (tamanho, ponte, haste, formato, material).
3. Gerenciar imagens por variante.
4. Estoque por variante (`available`, `reserved`).

### Sprint 4 — Pedidos B2B
1. Refatorar criação do pedido (Ótica, Distribuidora, Representante).
2. Implementar fluxo de análise e aprovação da distribuidora.
3. Histórico e alteração de status do pedido.
4. Ajuste de exibição de código de barras nos itens do pedido.

### Sprint 5 — Comercial e Políticas de Preço
1. Tabelas de preço por cliente/região.
2. Descontos e regras de pedido mínimo.
3. Comissões do representante.

---

## Plano Prático para Amanhã

### Manhã — Levantamento e Decisões de Arquitetura
Alinhar as decisões de produto:
- Tipos de organização e papéis;
- Mecanismo de conexão Ótica–Distribuidora;
- Estrutura da tabela de variantes (`product_variants`);
- Regra de reserva de estoque e ciclo de vida do pedido.

### Produção dos Documentos de Domínio
Criar na pasta `docs/domain/`:
- `docs/domain/ORGANIZATION_TYPES.md`
- `docs/domain/OPTICAL_DISTRIBUTOR_FLOW.md`
- `docs/domain/PRODUCT_VARIANTS.md`
- `docs/domain/ORDER_LIFECYCLE.md`
- `docs/domain/PRICING_RULES.md`

### Primeira Branch de Implementação (Sprint 1)
```bash
git checkout main
git pull origin main
git checkout -b feature/optical-distributor-foundation
```

**Escopo da primeira branch:**
- Tipo de organização (`organization_type`);
- Papéis e permissões iniciais;
- Vínculos básicos entre organizações;
- Menus e rotas da sidebar por perfil;
- Ajuste inicial de permissões no backend.
