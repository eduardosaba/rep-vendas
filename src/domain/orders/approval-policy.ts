export interface ApprovalContext {
  tenantId: string;
  customerId: string;
  representativeId: string;
  subtotal: number;
  discountPercent: number;
  paymentConditionId: string;
  marginPercent: number;
  brands: string[];
}

export const ApprovalPolicy = {
  /**
   * Avalia o contexto comercial da negociação para determinar o direcionamento da alçada de risco.
   * Se o representante conceder mais de 10% de desconto marginal na folha de pré-venda, trava em mesa de análise.
   */
  requiresCorporateApproval(context: ApprovalContext): boolean {
    if (context.discountPercent > 10) return true;
    
    // Regras de salvaguarda futuras: Margens críticas ou marcas sob proteção de grife
    if (context.brands.includes('Boss') && context.marginPercent < 40) return true;

    return false;
  }
};
