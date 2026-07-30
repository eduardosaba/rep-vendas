# ORGANIZATION_TYPES.md - Especificação de Perfis e Organizações no RepVendas

## 1. Tipos de Organização (`organization_type`)

O sistema RepVendas suporta 3 perfis de negócios principais:

```typescript
export type OrganizationType =
  | 'optical_store'               // Ótica (Comprador B2B)
  | 'distributor'                 // Distribuidora (Vendedor B2B / Gestor de Marcas)
  | 'independent_representative'; // Representante Comercial Independente
```

---

## 2. Perfil Ótica (`optical_store`)

### Descrição
Empresas varejistas do setor óptico (lojas físicas ou e-commerce) que compram produtos de distribuidoras e representantes.

### Funcionalidades Liberadas
- **Catálogo Virtual B2B**: Busca, filtro, favoritos e carrinho de pedidos.
- **Gestão de Fornecedores**: Lista de distribuidoras vinculadas e representantes autorizados.
- **Pedidos de Compra**: Criação, acompanhamento de status e histórico de compras.
- **Condições Comerciais**: Visualização de tabelas de preço e prazos concedidos pelas distribuidoras.

---

## 3. Perfil Distribuidora (`distributor`)

### Descrição
Empresas detentoras de marcas, importadoras ou distribuidores atacadistas que vendem para óticas.

### Funcionalidades Liberadas
- **Gestão de Produtos e Marcas**: Cadastro de referências, variações (cor/tamanho/código de barras) e imagens.
- **Controle de Estoque**: Gestão por variante com reserva de estoque em pedidos.
- **Gestão de Carteira e Equipe**: Cadastro e vínculo de representantes comerciais e óticas compradoras.
- **Aprovação de Pedidos**: Análise comercial, aceite, ajuste ou rejeição de pedidos recebidos.
- **Políticas Comerciais**: Tabelas de preço por cliente, descontos máximos e pedido mínimo.

---

## 4. Perfil Representante Comercial (`independent_representative`)

### Descrição
Profissionais ou agências de representação comercial vinculados a distribuidoras ou operando de forma autônoma.

### Funcionalidades Liberadas
- **Carteira de Clientes**: Atendimento de óticas autorizadas pela distribuidora.
- **Emissão de Pedidos**: Criação de pedidos em nome da ótica cliente.
- **Acompanhamento Comercial**: Metas, relatórios de vendas e comissões estimadas.

---

## 5. Matriz de Permissões RLS e Acessos

| Recurso / Módulo | Ótica (`optical_store`) | Distribuidora (`distributor`) | Representante (`representative`) |
| :--- | :--- | :--- | :--- |
| **Visualizar Produtos** | Somente de distribuidoras vinculadas | Produtos da sua organização | Produtos das marcas representadas |
| **Editar Produtos/Estoque** | ❌ Não permitido | ✅ Total | ❌ Somente leitura |
| **Criar Pedidos** | ✅ Para sua própria ótica | ✅ Em nome da ótica | ✅ Para clientes da sua carteira |
| **Aprovar/Ajustar Pedidos**| ❌ Não permitido | ✅ Total | ❌ Leitura de status |
| **Ver Custos Internos** | ❌ Não permitido | ✅ Total | ❌ Somente comissão |
