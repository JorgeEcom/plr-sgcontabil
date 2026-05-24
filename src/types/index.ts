export interface Semestre {
  id: string
  nome: string
  periodo: string
  data_pagamento: string | null
  ativo: boolean
  created_at: string
}

export interface Premissas {
  id: string
  semestre_id: string
  meta_faturamento: number
  margem_minima: number
  perc_pool: number
  teto_salarios: number
  piso_salarios: number
  peso_corporativo: number
  peso_area: number
  peso_individual: number
  treinamentos_anuais: number
  perc_min_treinamentos: number
}

export interface Gatilhos {
  id?: string
  semestre_id: string
  fat_realizado: number
  margem_realizada: number
  churn_realizado: number
  inadimplencia_realizada: number
  multas_realizado: number
  nps_realizado: number
}

export interface KpiDepartamento {
  id?: string
  semestre_id: string
  departamento: string
  kpi_index: number
  realizado: number
}

export interface Colaborador {
  id: string
  nome: string
  departamento: string
  cargo: string
  nivel: string
  data_admissao: string
  data_funcao_atual: string
  ativo: boolean
}

export interface ColaboradorSemestre {
  id?: string
  semestre_id: string
  colaborador_id: string
  treinamentos_realizados: number
  nota_kpi_individual: number
  nota_ciclo_anterior: number
}

export interface ColaboradorCompleto extends Colaborador {
  semestre?: ColaboradorSemestre
}

export interface Profile {
  id: string
  nome: string | null
  role: 'admin' | 'coordenador'
  departamento: string | null
}

// Resultado dos cálculos
export interface GatilhosCalc {
  lucroRealizado: number
  plrAtivado: boolean
  fatorAjuste: number
  criticos: number
  qualidade: number
  statusFat: boolean
  statusMargem: boolean
  statusLucro: boolean
  statusChurn: boolean
  statusInadim: boolean
  statusMultas: boolean
  statusNPS: boolean
  percFat: number
  percMargem: number
  percNPS: number
}

export interface PoolCalc {
  poolBruto: number
  poolAjustado: number
  compCorporativo: number
  compArea: number
  compIndividual: number
}

export interface ResultadoColaborador extends ColaboradorCompleto {
  peso: number
  salario: number
  mesesFuncao: number
  percTreinamentos: number
  elegivel: boolean
  cotaCorp: number
  cotaArea: number
  cotaIndiv: number
  plrBruto: number
  plrFinal: number
  statusTeto: 'Normal' | 'Teto aplicado' | 'Piso aplicado' | 'Não elegível'
}
