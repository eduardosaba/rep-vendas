import { TargetLayer } from './field-registry';
import { ScopeConfig } from './layer-scope-matrix';

export type StructuredOperationType =
  | 'set'
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'percentage_increase'
  | 'percentage_decrease'
  | 'round';

export type ValueSourceType = 'fixed' | 'spreadsheet';

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in_list'
  | 'not_in_list'
  | 'greater_than'
  | 'greater_equal'
  | 'less_than'
  | 'less_equal'
  | 'is_empty'
  | 'is_not_empty';

export type FilterConnective = 'AND' | 'OR';

export type NormalizerRule =
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'remove_accents'
  | 'remove_hyphens'
  | 'remove_dots'
  | 'remove_invisible'
  | 'remove_spaces'
  | 'remove_slashes'
  | 'alphanumeric_only';

export interface SpreadsheetColumn {
  name: string;
  inferredType: 'text' | 'integer' | 'decimal' | 'currency' | 'boolean' | 'date';
  sampleValues: any[];
}

export interface IdentifierMapping {
  spreadsheetColumn: string;
  dbField: 'reference_code' | 'brand' | 'name' | 'color_nome' | 'colecao';
}

export interface IdentifierConfig {
  mappings: IdentifierMapping[];
  normalizations: NormalizerRule[];
}

export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: any;
}

export interface FilterGroup {
  connective: FilterConnective;
  conditions: FilterCondition[];
}

export interface UpdateActionConfig {
  targetLayer: TargetLayer;
  targetField: string; // Must be in UPDATE_FIELD_REGISTRY
  operation: StructuredOperationType;
  valueSource: ValueSourceType;
  sourceColumn?: string;
  fixedValue?: any;
}

export interface EngineConfiguration {
  sheetName: string;
  identifier: IdentifierConfig;
  filters: FilterGroup;
  actions: UpdateActionConfig[];
  scope: ScopeConfig;
  configHash?: string;
}

export interface AnalyzeSpreadsheetResult {
  fileName: string;
  fileHash: string;
  sheets: string[];
  selectedSheet: string;
  columns: SpreadsheetColumn[];
  sampleRows: Record<string, any>[];
  totalRows: number;
  error?: string;
}

export type InvalidIdentifierReason =
  | 'MISSING_BRAND'
  | 'MISSING_REFERENCE'
  | 'MISSING_BRAND_AND_REFERENCE';

export type PreviewStatus =
  | 'READY'
  | 'PARTIAL_CHANGE'
  | 'NO_CHANGE'
  | 'NOT_FOUND'
  | 'PARTIAL_AMBIGUITY'
  | 'AMBIGUOUS_IN_ORGANIZATION'
  | 'INVALID_IDENTIFIER'
  | 'SKIPPED_FILTER'
  | 'ERROR';

export interface OrganizationPreviewItem {
  organizationId: string;
  organizationName?: string;
  productId: string;
  productName: string;
  status: 'READY' | 'NO_CHANGE' | 'AMBIGUOUS' | 'ERROR';
  proposedChanges: {
    targetLayer: TargetLayer;
    targetField: string;
    oldValue: any;
    newValue: any;
    actionType: StructuredOperationType;
  }[];
}

export interface PreviewRowDetail {
  rowNumber: number;
  brand?: string;
  reference?: string;
  lookupKey?: string;
  rawIdentifierValues: Record<string, any>;
  normalizedIdentifierValues: Record<string, string>;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedProductsCount: number;
  affectedOrganizationsCount: number;
  changedCount: number;
  noChangeCount: number;
  ambiguousOrganizationsCount: number;
  invalidReason?: InvalidIdentifierReason;
  filterMatched: boolean;
  proposedChanges: {
    targetLayer: TargetLayer;
    targetField: string;
    oldValue: any;
    newValue: any;
    actionType: StructuredOperationType;
  }[];
  organizationBreakdown?: OrganizationPreviewItem[];
  status: PreviewStatus;
  message?: string;
}

export interface BrandBreakdownStats {
  brand: string;
  referenceCount: number;
  matchedProductsCount: number;
  affectedOrganizationsCount: number;
  changedProductsCount: number;
}

export interface PreviewEngineResult {
  fileHash?: string;
  configHash?: string;
  totalRows: number;
  matchedRows: number;
  matchedProducts?: number;
  affectedOrganizations?: number;
  changedRows: number;
  changedProducts?: number;
  changedFields?: number;
  noChangeProducts?: number;
  skippedRows: number;
  notFoundRows: number;
  invalidRows?: number;
  ambiguousOrganizationsRows?: number;
  brandsIncluded?: string[];
  brandBreakdown?: BrandBreakdownStats[];
  criticalConfirmationRequired: boolean;
  criticalReason?: string;
  sampleDetails: PreviewRowDetail[];
  error?: string;
}

export interface JobProcessResult {
  jobId: string;
  status: 'completed' | 'partially_completed' | 'failed';
  totalProcessed: number;
  appliedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

