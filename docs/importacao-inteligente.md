# Importação Inteligente de Produtos

## 📋 Visão Geral

A funcionalidade de **Importação Inteligente** permite importar produtos em massa a partir de planilhas Excel, com mapeamento automático de colunas e criação inteligente de ficha técnica para produtos ópticos.

## 🎯 Funcionalidades

### 1. Mapeamento Automático

O sistema detecta automaticamente as colunas da planilha e mapeia para os campos do produto:

- **Nome** (obrigatório)
- **Referência** (obrigatório)
- **Preço** (obrigatório)
- **SKU**
- **EAN / Código de Barras**
- **Marca**
- **Categoria**
- **Cor**
- **Descrição**
- **Imagens** (URLs separadas por vírgula ou ponto e vírgula)

### 2. Ficha Técnica Automática

Colunas específicas são automaticamente incluídas na ficha técnica do produto em formato de tabela:

- **Gênero** (Masculino, Feminino, Unissex)
- **Tamanho**
- **Ponte** (medida da ponte do óculos)
- **Haste** (comprimento da haste)
- **Altura** (altura da lente)
- **Material**
- **Formato**
- **Tipo**

### 3. Múltiplas Imagens

Aceita múltiplos links de imagens separados por:

- Vírgula (`,`)
- Ponto e vírgula (`;`)

Exemplo: `https://exemplo.com/img1.jpg, https://exemplo.com/img2.jpg`

## 📊 Formato da Planilha

### Exemplo para Produtos Ópticos

| Nome                     | Referencia | Preco  | SKU     | EAN           | Marca   | Categoria | Cor       | Genero   | Tamanho | Ponte | Haste | Altura | Material | Formato  | Imagens                                                          |
| ------------------------ | ---------- | ------ | ------- | ------------- | ------- | --------- | --------- | -------- | ------- | ----- | ----- | ------ | -------- | -------- | ---------------------------------------------------------------- |
| Óculos Solar Aviador     | AV-001     | 299.90 | AV001BK | 7891234567890 | Ray-Ban | Solar     | Preto     | Unissex  | 58      | 14    | 145   | 50     | Metal    | Aviador  | https://exemplo.com/av001-1.jpg, https://exemplo.com/av001-2.jpg |
| Óculos de Grau Wayfarer  | WF-002     | 399.90 | WF002TT | 7891234567891 | Ray-Ban | Grau      | Tartaruga | Unissex  | 52      | 18    | 140   | 45     | Acetato  | Wayfarer | https://exemplo.com/wf002.jpg                                    |
| Armação Feminina Cat Eye | CE-003     | 249.90 | CE003RD | 7891234567892 | Vogue   | Grau      | Vermelho  | Feminino | 54      | 16    | 135   | 48     | Acetato  | Cat Eye  | https://exemplo.com/ce003.jpg                                    |

### Colunas Obrigatórias

- **Nome**: Nome do produto
- **Referencia**: Código de referência único (se não fornecido, será gerado automaticamente)
- **Preco**: Preço do produto (aceita vírgula ou ponto como separador decimal)

### Colunas Opcionais (Recomendadas)

- **SKU**: Código SKU
- **EAN**: Código de barras (EAN/GTIN)
- **Marca**: Nome da marca
- **Categoria**: Categoria do produto
- **Cor**: Cor do produto
- **Descrição**: Descrição detalhada

### Colunas de Ficha Técnica (Personalizáveis) ⭐ NOVO

**Você escolhe quais colunas vão para a ficha técnica!**

Após fazer upload do Excel, uma seção visual aparece permitindo selecionar quais colunas serão incluídas na ficha técnica. Exemplos comuns:

- **Gênero** ou **Genero** (Masculino/Feminino/Unissex)
- **Tamanho** (52-18-145, 54, etc.)
- **Ponte** (18mm, 14mm, etc.)
- **Haste** (145mm, 140mm, etc.)
- **Altura** (40mm, 50mm, etc.)
- **Material** (Acetato, Metal, TR90, etc.)
- **Formato** (Quadrado, Redondo, Aviador, Cat Eye, etc.)
- **Tipo** (Solar, Grau, etc.)

**Recursos:**

- ✅ Seleção visual com checkboxes
- ✅ Contador de colunas selecionadas
- ✅ Remove automaticamente colunas já mapeadas (nome, preço, etc.)
- ✅ Preserva acentuação e capitalização original

### Coluna de Imagens

- **Imagens**: URLs separadas por vírgula ou ponto e vírgula
  - A primeira imagem será a capa do produto
  - As demais ficam na galeria

## 🚀 Como Usar

1. **Prepare sua planilha Excel** com as colunas conforme o exemplo acima
2. **Acesse** Dashboard → Produtos → Importar em Massa
3. **Faça upload** do arquivo Excel (.xlsx ou .xls)
4. **Revise o mapeamento** automático das colunas
5. **Selecione as colunas** que deseja incluir na ficha técnica (seção com checkboxes)
6. **Visualize o preview** dos produtos que serão importados
7. **Confirme a importação**

## ⚙️ Detalhes Técnicos

### Formato de Preço

O sistema aceita preços em diversos formatos:

- `299.90`
- `299,90`
- `R$ 299,90`

### Geração Automática de Referência

Se a coluna **Referencia** não for fornecida ou estiver vazia:

- Usa o **SKU** se disponível
- Caso contrário, gera automaticamente: `AUTO-{timestamp}-{random}`

### Validação de Imagens

Apenas URLs válidas (começando com `http://` ou `https://`) são aceitas.

### Ficha Técnica em JSON

A ficha técnica é salva no formato de array JSON:

```json
[
  { "key": "Gênero", "value": "Unissex" },
  { "key": "Tamanho", "value": "58" },
  { "key": "Ponte", "value": "14" },
  { "key": "Haste", "value": "145" },
  { "key": "Altura", "value": "50" },
  { "key": "Material", "value": "Metal" },
  { "key": "Formato", "value": "Aviador" }
]
```

## 📝 Dicas

1. **Use nomes de colunas em português** para melhor detecção automática
2. **Evite células mescladas** na planilha
3. **Primeira linha deve conter os cabeçalhos** das colunas
4. **Teste com poucas linhas** primeiro para validar o mapeamento
5. **URLs de imagens** devem estar acessíveis publicamente

## 🔧 Solução de Problemas

### Importação falhou para alguns produtos

- Verifique se Nome, Referência e Preço estão preenchidos
- Confirme que o formato do preço está correto

### Imagens não aparecem

- Verifique se as URLs começam com `http://` ou `https://`
- Teste se as URLs estão acessíveis no navegador

### Ficha técnica não foi criada

- Verifique se os nomes das colunas estão corretos (Gênero, Tamanho, etc.)
- Certifique-se de que as células não estão vazias

## 📧 Suporte

Para dúvidas ou problemas, entre em contato com o suporte técnico.

---

**Última atualização**: 4 de dezembro de 2025
