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
  | 'remove_invisible';

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

export interface PreviewRowDetail {
  rowNumber: number;
  rawIdentifierValues: Record<string, any>;
  normalizedIdentifierValues: Record<string, string>;
  matchedProductId?: string;
  matchedProductName?: string;
  filterMatched: boolean;
  proposedChanges: {
    targetLayer: TargetLayer;
    targetField: string;
    oldValue: any;
    newValue: any;
    actionType: StructuredOperationType;
  }[];
  status: 'READY' | 'SKIPPED_FILTER' | 'NO_CHANGE' | 'NOT_FOUND' | 'ERROR';
  message?: string;
}

export interface PreviewEngineResult {
  fileHash?: string;
  totalRows: number;
  matchedRows: number;
  matchedProducts?: number;
  changedRows: number;
  changedProducts?: number;
  changedFields?: number;
  skippedRows: number;
  notFoundRows: number;
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
