# Notas de Performance

## Avisos de "Message Handler" no Console

### O que são?

Os avisos `[Violation] 'message' handler took <N>ms` que aparecem no console do navegador são **avisos de desenvolvimento** causados principalmente por:

1. **React DevTools** - extensão do navegador que monitora componentes
2. **Hot Module Reload (HMR)** - atualização automática do Next.js em desenvolvimento
3. **Extensões do navegador** - AdBlock, LastPass, etc.

### São um problema?

**NÃO** em produção! Esses avisos:

- ✅ Aparecem apenas em modo de desenvolvimento
- ✅ Não afetam o usuário final
- ✅ São esperados em aplicações React modernas
- ✅ Desaparecem quando o build de produção é executado

### Como minimizar em desenvolvimento?

1. **Desabilite React DevTools temporariamente**:
   - Abra DevTools (F12)
   - Vá em Extensions
   - Desabilite "React Developer Tools"

2. **Desabilite outras extensões**:
   - Use modo anônimo/privado para testar
   - Ou desabilite extensões uma por uma

3. **Use build de produção para testes finais**:
   ```bash
   pnpm build
   pnpm start
   ```

## Otimizações Já Implementadas

✅ **Debounced localStorage** (400ms) - store-context.tsx
✅ **Lazy loading de imagens** - Next.js Image component
✅ **ChartWrapper** - ResizeObserver otimizado
✅ **Memoização de filtros** - useMemo nos arrays filtrados
✅ **Scroll suave otimizado** - WebKit overflow scrolling

## Web Worker (Futuro)

Para casos de uso com MUITOS produtos (>1000) ou criptografia pesada, considerar mover para Web Worker:

- Criptografia/descriptografia
- Processamento de grandes listas
- Operações de busca complexas

**Atualmente não é necessário** - o sistema funciona bem com centenas de produtos.
