export type ImportSheetType = 
  | 'FULL_CATALOG'
  | 'ONLY_OUT_OF_STOCK'
  | 'ONLY_IN_STOCK'
  | 'STATUS_COLUMN';

export type ImportScope = 'GLOBAL' | 'ORGANIZATION' | 'COMPANY';

export type ImportStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'ROLLBACK_PROCESSING'
  | 'ROLLED_BACK'
  | 'PARTIALLY_ROLLED_BACK'
  | 'ROLLBACK_FAILED';

export interface ParseExcelResult {
  brand: string;
  fileName: string;
  sheetType: ImportSheetType;
  fileHash: string; // for idempotency/validation
  totalRows: number;
  validRows: number;
  invalidRows: number;
  uniqueReferences: number;
  duplicateReferences: number;
  foundReferences: number;
  notFoundReferences: number;
  totalProductsAffected: number;
  totalUsersAffected: number;
  totalCompaniesAffected: number;
  totalOrganizationsAffected: number;
  productsKeptActive: number;
  productsToActivate: number;
  productsToDeactivate: number;
  productsUnchanged: number;
  details: PreviewRowDetail[];
  error?: string;
}

export interface PreviewRowDetail {
  originalReference: string;
  normalizedReference: string;
  originalName: string;
  factoryStatus: string; // The raw status in the sheet
  normalizedStatus: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
  matchingProductsCount: number;
  affectedRepsCount: number;
  affectedCompaniesCount: number;
  affectedOrgsCount: number;
  currentSystemStatus: 'ACTIVE' | 'INACTIVE' | 'MIXED' | 'NOT_FOUND';
  simulatedAction: 'KEEP_ACTIVE' | 'KEEP_INACTIVE' | 'ACTIVATE' | 'DEACTIVATE' | 'NONE' | 'ERROR';
  validationMessage: string;
}

export interface ProductBatchRecord {
  id: string;
  reference_code: string;
  is_active: boolean;
  user_id: string;
  company_id: string | null;
  organization_id: string | null;
  brand: string | null;
}

export const BRAND_ALIASES: Record<string, string[]> = {
  'TOMMY HILFIGER': ['TOMMY HILFIGER', 'TOMMY', 'TH'],
  'CALVIN KLEIN': ['CALVIN KLEIN', 'CK', 'CALVIN'],
  'OAKLEY': ['OAKLEY', 'OKLY'],
  // This will be expanded later or fetched from the DB
};
