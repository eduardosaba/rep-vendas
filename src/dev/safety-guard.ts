/**
 * Safety Guard para Ferramentas de Desenvolvimento
 * 
 * ATENÇÃO: NENHUM arquivo dentro de `src/dev` ou `src/app/dev`
 * deve ser executado, renderizado ou importado em ambiente de produção.
 */

export function assertDevelopmentEnvironment() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'Developer tools are STRICTLY DISABLED in this environment. ' +
      'If you are seeing this error in production, a developer tool was accidentally included in the build or requested.'
    );
  }
}
