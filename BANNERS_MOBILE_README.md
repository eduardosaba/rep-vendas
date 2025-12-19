# BANNERS MOBILE - INSTRUÇÕES DE INSTALAÇÃO

## 1. Aplicar Migration SQL no Supabase

Execute o arquivo `SQL/add_banners_mobile.sql` no **SQL Editor** do Supabase:

```sql
-- Migração: Adicionar coluna banners_mobile à tabela settings
-- Para permitir banners específicos para dispositivos móveis

-- Adicionar coluna banners_mobile (array de URLs) se não existir
ALTER TABLE settings ADD COLUMN IF NOT EXISTS banners_mobile TEXT[];

-- Comentário explicativo
COMMENT ON COLUMN settings.banners_mobile IS 'Array de URLs de banners otimizados para dispositivos móveis. Se vazio, usa banners padrão com CSS responsivo.';
```

## 2. Funcionalidade Implementada

### No Admin (/dashboard/settings):

- **Banners Desktop**: Upload de banners para telas grandes (1400×400px recomendado).
- **Banners Mobile (Opcional)**: Upload de banners otimizados para mobile (768×400px recomendado).
- Se não adicionar banners mobile, o sistema usa automaticamente os banners desktop com CSS responsivo.

### No Catálogo Público:

- Detecta automaticamente se é mobile (< 768px).
- Se houver `banners_mobile` cadastrados, usa eles no mobile.
- Caso contrário, faz fallback para `banners` desktop com proporções adaptáveis.

## 3. Recomendações de Tamanho

| Tipo    | Dimensão Ideal | Aspect Ratio |
| ------- | -------------- | ------------ |
| Desktop | 1920×540px     | ~3.55:1      |
| Mobile  | 768×400px      | ~1.92:1      |

**Dica**: Elementos importantes (textos/CTAs) devem estar centralizados para evitar corte em diferentes proporções.

## 4. Testando

1. Execute a migration SQL acima no Supabase.
2. Acesse `/dashboard/settings` → Aba **Aparência**.
3. Faça upload de **Banners Promocionais** (Desktop).
4. (Opcional) Faça upload de **Banners Mobile**.
5. Salve as configurações.
6. Abra o catálogo público no mobile (ou use DevTools F12 → Mobile view) e verifique que o banner correto é exibido.

---

**Status**: ✅ Implementado e pronto para uso após aplicar a migration SQL.
