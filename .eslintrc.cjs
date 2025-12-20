module.exports = {
  root: true,
  rules: {
    // Forçar desligamento enquanto investigamos a origem do no-undef
    'no-undef': 'off',
    // manter aviso para any durante migração
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
