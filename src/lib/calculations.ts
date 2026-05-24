import type {
  Premissas, Gatilhos, KpiDepartamento,
  ColaboradorCompleto, GatilhosCalc, PoolCalc, ResultadoColaborador,
} from '../types'
import { KPIS_CONFIG, getPesoSalario, DEPARTAMENTOS } from './constants'

// ── Meses na função (equivalente ao DATEDIF do Excel) ─────────────────────────
export function mesesNaFuncao(dataFuncaoAtual: string, refDate = new Date(2026, 5, 30)): number {
  const d = new Date(dataFuncaoAtual)
  const months = (refDate.getFullYear() - d.getFullYear()) * 12 + (refDate.getMonth() - d.getMonth())
  return Math.max(0, months)
}

// ── Elegibilidade ─────────────────────────────────────────────────────────────
export function isElegivel(
  colab: ColaboradorCompleto,
  premissas: Premissas,
): boolean {
  const meses = mesesNaFuncao(colab.data_funcao_atual)
  const trein = colab.semestre?.treinamentos_realizados ?? 0
  const nota  = colab.semestre?.nota_kpi_individual ?? 0
  const percTrein = trein / premissas.treinamentos_anuais
  return meses >= 3 && percTrein >= premissas.perc_min_treinamentos && nota >= 0.6
}

// ── Gatilhos Corporativos ─────────────────────────────────────────────────────
export function calcularGatilhos(g: Gatilhos, p: Premissas): GatilhosCalc {
  const lucroRealizado = g.fat_realizado * g.margem_realizada
  const lucroMeta      = p.meta_faturamento * p.margem_minima

  const statusFat    = g.fat_realizado >= p.meta_faturamento
  const statusMargem = g.margem_realizada >= p.margem_minima
  const statusLucro  = lucroRealizado >= lucroMeta
  const statusChurn  = g.churn_realizado <= 0.05
  const statusInadim = g.inadimplencia_realizada <= 0.05
  const statusMultas = g.multas_realizado <= 0
  const statusNPS    = g.nps_realizado >= 70

  const criticos  = [statusFat, statusMargem, statusLucro].filter(Boolean).length
  const qualidade = [statusChurn, statusInadim, statusMultas, statusNPS].filter(Boolean).length

  // Regra de ativação: margem OK + fat >= 90% meta + ≥2 críticos + ≥2 qualidade
  const plrAtivado =
    g.margem_realizada >= p.margem_minima &&
    g.fat_realizado >= p.meta_faturamento * 0.9 &&
    criticos >= 2 &&
    qualidade >= 2

  const fatorAjuste =
    g.fat_realizado >= p.meta_faturamento * 1.1 ? 1.1
    : g.fat_realizado >= p.meta_faturamento     ? 1.0
    : g.fat_realizado >= p.meta_faturamento * 0.9 ? 0.85
    : 0

  const percFat    = p.meta_faturamento > 0 ? g.fat_realizado / p.meta_faturamento : 0
  const percMargem = p.margem_minima > 0    ? g.margem_realizada / p.margem_minima : 0
  const percNPS    = 100 > 0 ? g.nps_realizado / 100 : 0

  return {
    lucroRealizado, plrAtivado, fatorAjuste, criticos, qualidade,
    statusFat, statusMargem, statusLucro,
    statusChurn, statusInadim, statusMultas, statusNPS,
    percFat, percMargem, percNPS,
  }
}

// ── Pool de PLR ───────────────────────────────────────────────────────────────
export function calcularPool(gc: GatilhosCalc, p: Premissas): PoolCalc {
  const poolBruto    = gc.lucroRealizado * p.perc_pool
  const poolAjustado = gc.plrAtivado ? poolBruto * gc.fatorAjuste : 0
  return {
    poolBruto,
    poolAjustado,
    compCorporativo: poolAjustado * p.peso_corporativo,
    compArea:        poolAjustado * p.peso_area,
    compIndividual:  poolAjustado * p.peso_individual,
  }
}

// ── Nota final por departamento ───────────────────────────────────────────────
export function calcularNotaDept(departamento: string, kpis: KpiDepartamento[]): number {
  const config = KPIS_CONFIG[departamento] ?? []
  return config.reduce((sum, kpiCfg, i) => {
    const kpi = kpis.find(k => k.departamento === departamento && k.kpi_index === i)
    return sum + (kpi?.realizado ?? 0) * kpiCfg.peso
  }, 0)
}

// ── Distribuição Individual ───────────────────────────────────────────────────
export function calcularDistribuicao(
  colaboradores: ColaboradorCompleto[],
  kpis: KpiDepartamento[],
  pool: PoolCalc,
  premissas: Premissas,
): ResultadoColaborador[] {
  const ativos = colaboradores.filter(c => c.ativo)

  // Notas por departamento
  const notasDept: Record<string, number> = {}
  DEPARTAMENTOS.forEach(d => {
    notasDept[d] = calcularNotaDept(d, kpis)
  })
  const totalNotasDept = Object.values(notasDept).reduce((a, b) => a + b, 0)

  // Pool por área
  const poolPorArea: Record<string, number> = {}
  DEPARTAMENTOS.forEach(d => {
    poolPorArea[d] = totalNotasDept > 0
      ? pool.compArea * (notasDept[d] / totalNotasDept)
      : 0
  })

  // Elegíveis por departamento
  const elegiveisDept: Record<string, number> = {}
  DEPARTAMENTOS.forEach(d => {
    elegiveisDept[d] = ativos.filter(c => c.departamento === d && isElegivel(c, premissas)).length
  })

  // Cota de área por colaborador elegível no dept
  const cotaAreaPorDept: Record<string, number> = {}
  DEPARTAMENTOS.forEach(d => {
    cotaAreaPorDept[d] = elegiveisDept[d] > 0 ? poolPorArea[d] / elegiveisDept[d] : 0
  })

  // Total elegíveis
  const totalElegiveis = ativos.filter(c => isElegivel(c, premissas)).length
  const cotaCorporativa = totalElegiveis > 0 ? pool.compCorporativo / totalElegiveis : 0

  // SUMPRODUCT: SUM(elegível * peso * nota_individual)
  const sumProd = ativos.reduce((sum, c) => {
    if (!isElegivel(c, premissas)) return sum
    const { peso } = getPesoSalario(c.cargo, c.departamento, c.nivel)
    return sum + peso * (c.semestre?.nota_kpi_individual ?? 0)
  }, 0)

  return ativos.map(c => {
    const { peso, salario } = getPesoSalario(c.cargo, c.departamento, c.nivel)
    const meses = mesesNaFuncao(c.data_funcao_atual)
    const trein = c.semestre?.treinamentos_realizados ?? 0
    const percTrein = trein / premissas.treinamentos_anuais
    const elegivel = isElegivel(c, premissas)

    if (!elegivel) {
      return {
        ...c, peso, salario, mesesFuncao: meses, percTreinamentos: percTrein,
        elegivel: false, cotaCorp: 0, cotaArea: 0, cotaIndiv: 0,
        plrBruto: 0, plrFinal: 0, statusTeto: 'Não elegível' as const,
      }
    }

    const cotaCorp = cotaCorporativa
    const cotaArea = cotaAreaPorDept[c.departamento] ?? 0
    const nota     = c.semestre?.nota_kpi_individual ?? 0
    const cotaIndiv = sumProd > 0
      ? (peso * nota / sumProd) * pool.compIndividual
      : 0

    const plrBruto = cotaCorp + cotaArea + cotaIndiv
    const teto     = salario * premissas.teto_salarios
    const piso     = salario * premissas.piso_salarios
    const plrFinal = Math.min(Math.max(plrBruto, piso), teto)

    const statusTeto: ResultadoColaborador['statusTeto'] =
      plrBruto > teto ? 'Teto aplicado'
      : plrBruto < piso ? 'Piso aplicado'
      : 'Normal'

    return {
      ...c, peso, salario, mesesFuncao: meses, percTreinamentos: percTrein,
      elegivel, cotaCorp, cotaArea, cotaIndiv, plrBruto, plrFinal, statusTeto,
    }
  })
}
