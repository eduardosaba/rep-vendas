# Guia Prático — Atualização de Produtos Saindo de Linha via Planilha

Este manual orienta passo a passo como utilizar o **Motor de Atualização Inteligente por Planilha** para inativar, alterar estoques ou atualizar a situação de produtos que estão **saindo de linha**.

---

## 📍 Rota de Acesso
No seu navegador, acesse:
```text
http://localhost:4000/admin/produtos/atualizacao-inteligente
```
*(Se você acessar a URL antiga `/admin/produtos/atualizacao-linha`, você será redirecionado automaticamente).*

---

## 📋 Passo a Passo de Execução

### **Passo 1: Carregar a Planilha**
1. Clique no botão **"Escolher Arquivo"**.
2. Selecione o arquivo Excel (`.xlsx` ou `.xls`) fornecido pela fábrica com os produtos fora de linha.
3. Aguarde a barra de progresso ler as colunas e extrair as amostras dos dados.

---

### **Passo 2: Mapear os Identificadores**
Neste passo você ensina o sistema a encontrar o produto certo no seu catálogo.
- **Identificador Único**: Se a planilha usa o código do item (ex: `SKU` ou `REFERENCIA`), selecione a coluna correspondente no campo **"Coluna da Planilha"** e marque a correspondência no banco (ex: `Referência do Produto`).
- **Identificador Composto (opcional)**: Se precisar identificar por 2 colunas (ex: `REFERENCIA` + `COR`), clique em **"Adicionar Coluna Composta"**.
- **Regras de Limpeza (Normalização)**:
  - Marque `Preservar zeros à esquerda` se seus códigos tiverem zeros (ex: `000123`).
  - Marque `Converter para Maiúsculas` ou `Remover Espaços` para garantir que `ox001` encontre `OX001`.

---

### **Passo 3: Configurar Filtros (Quem será afetado?)**
Se a sua planilha contém todos os produtos da fábrica (ativos e inativos), você pode filtrar para afetar apenas os fora de linha:
1. Clique em **"Adicionar Condição de Filtro"**.
2. Selecione a coluna da planilha (ex: `CORE` ou `SITUACAO`).
3. Escolha o operador (ex: `Igual a` ou `Contém`).
4. Digite o valor do filtro (ex: `FORA DE LINHA`, `INATIVO` ou `CANCELADO`).

---

### **Passo 4: Definir a Ação de Atualização (O que alterar?)**
Para inativar os produtos que estão saindo de linha:
1. Em **Camada de Destino**, mantenha selecionado **"Catálogo Global (products)"**.
2. Em **Campo da Whitelist**, escolha:
   - **`Produto Ativo (is_active)`**
3. Em **Operação**, escolha:
   - **`Definir Valor (set)`**
4. No valor de destino, marque ou digite **`falso`** (para desativar o produto do catálogo).
   *(Se desejar zerar o estoque ao mesmo tempo, clique em "Adicionar Segunda Ação", selecione o campo `Estoque (stock)` e defina como `0`).*

---

### **Passo 5: Escopo**
- Mantenha o escopo definido como **"GLOBAL"** (afeta o catálogo base do sistema).

---

### **Passo 6: Visualizar o Preview e Confirmar**
1. Clique em **"Gerar Prévia de Impacto"**.
2. O sistema fará uma simulação sem alterar nada no banco de dados e mostrará:
   - **Total de linhas lidas**: (ex: 500 linhas)
   - **Produtos encontrados**: (ex: 480 encontrados)
   - **Produtos afetados**: (ex: 120 fora de linha)
   - **Tabela de Amostra**: Exibindo a Referência, Nome do Produto, Valor Atual (ex: `Ativo`) e Novo Valor (ex: `Inativo`).
3. **Trava de Segurança Crítica**: Como inativar produtos é uma ação importante, se afetar mais de 30% do catálogo, o sistema exigirá que você digite a palavra:
   ```text
   ATUALIZAR
   ```
   no campo de confirmação.

---

### **Passo 7: Executar Importação com Barra de Progresso**
1. Clique em **"Confirmar e Executar Importação"**.
2. Acompanhe a barra de progresso em tempo real enquanto os lotes de 200 em 200 itens são gravados com auditoria item por item.

---

### **Passo 8: Relatório e Rollback**
1. Ao finalizar, o sistema exibe o resumo completo: **Itens Aplicados**, **Ignorados por Filtro** e **Falhas**.
2. Se por algum motivo a fábrica enviou a planilha errada, basta ir na rota:
   ```text
   http://localhost:4000/admin/produtos/historico-alteracoes
   ```
   Localizar essa importação e clicar no botão **"Rollback"**. Todos os produtos voltarão instantaneamente para o estado original!
