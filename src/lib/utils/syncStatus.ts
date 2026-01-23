export function formatSyncStatus(status?: string | null) {
  switch (status) {
    case 'synced':
      return 'Sincronizado';
    case 'pending':
      return 'Pendente';
    case 'failed':
      return 'Falha';
    default:
      return status ?? '-';
  }
}

export default formatSyncStatus;
