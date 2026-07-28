import { PerformanceScoreResult } from './types'

export class PerformanceScoreCalculator {
  /**
   * Calcula o Performance Score balanceando produtividade e precisão.
   * - Precisão: 60% do peso
   * - Velocidade: 40% do peso
   * 
   * @param operatorId ID do operador
   * @param averageTimeMinutes Tempo médio do operador
   * @param targetTimeMinutes SLA alvo da organização
   * @param errorRate Taxa de erro (exceções não justificadas / total de itens)
   */
  static calculate(
    operatorId: string,
    averageTimeMinutes: number,
    targetTimeMinutes: number,
    errorRate: number
  ): PerformanceScoreResult {
    // 1. Cálculo da Velocidade (40% do peso)
    // Se fez no tempo exato do alvo, leva 100%. Se foi mais rápido, também leva 100%. 
    // Se demorou mais, cai proporcionalmente.
    let speedScore = 100
    if (averageTimeMinutes > targetTimeMinutes) {
      speedScore = (targetTimeMinutes / averageTimeMinutes) * 100
    }

    // 2. Cálculo de Precisão (60% do peso)
    // 0% de erro = 100 pontos. Cada 1% de erro penaliza a precisão.
    // Exemplo: 5% de erro = 95 pontos de precisão.
    const precisionScore = Math.max(0, 100 - (errorRate * 100))

    // 3. Score Final
    const finalScore = (precisionScore * 0.6) + (speedScore * 0.4)

    return {
      operatorId,
      speedScore: Math.round(speedScore),
      precisionScore: Math.round(precisionScore),
      finalScore: Math.round(finalScore)
    }
  }
}
