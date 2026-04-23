export interface CatalogRouteContext {
  catalogSlug: string | null;
  repSlug: string | null;
  isInstitutional: boolean;
  basePath: string;
}

export function getCatalogRouteContext(pathname?: string | null): CatalogRouteContext {
  const parts = (pathname || '').split('/').filter(Boolean);

  if (parts[0] !== 'catalogo') {
    return {
      catalogSlug: null,
      repSlug: null,
      isInstitutional: false,
      basePath: '/catalogo',
    };
  }

  const catalogSlug = parts[1] || null;
  const thirdSegment = parts[2] || null;
  const isInstitutional = thirdSegment === 'empresa';
  const repSlug = !isInstitutional && thirdSegment ? thirdSegment : null;

  const basePath = catalogSlug
    ? `/catalogo/${catalogSlug}${isInstitutional ? '/empresa' : repSlug ? `/${repSlug}` : ''}`
    : '/catalogo';

  return {
    catalogSlug,
    repSlug,
    isInstitutional,
    basePath,
  };
}
