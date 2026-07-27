export type ImportSheetType = 
  | 'FULL_CATALOG'
  | 'ONLY_OUT_OF_STOCK'
  | 'ONLY_IN_STOCK'
  | 'STATUS_COLUMN';

export interface ParseExcelResult {
  brand: string;
  fileName: string;
  sheetType: ImportSheetType;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  uniqueReferences: number;
  duplicateReferences: number;
  foundReferences: number;
  notFoundReferences: number;
  totalProductsAffected: number;
  totalUsersAffected: number;
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
  brand_id: string | null;
  brand_name?: string; // we'll need to join or match this
}
