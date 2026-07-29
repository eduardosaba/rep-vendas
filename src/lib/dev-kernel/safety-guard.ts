/**
 * Safety Guard para Ferramentas de Desenvolvimento
 * 
 * ATENÇÃO: NENHUM arquivo dentro de `src/lib/dev-kernel` ou `src/plugins/developer-tools`
 * deve ser executado, renderizado ou importado em ambiente de produção.
 */

export function assertDevelopmentMode() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'Developer tools and DevKernel are STRICTLY DISABLED in this environment. ' +
      'If you are seeing this error in production, a developer tool was accidentally included in the build or requested.'
    );
  }
}
