// Mapa de peso PLR e salário base por cargo+departamento|nível
// Fonte: planilha 07_Matriz de Pesos (SG Contábil 2026)
export const PESO_SALARIO: Record<string, { peso: number; salario: number }> = {
  'Auxiliar Contabilidade|Júnior':       { peso: 0.5, salario: 1600 },
  'Auxiliar Contabilidade|Pleno':        { peso: 0.6, salario: 1800 },
  'Auxiliar Contabilidade|Sênior':       { peso: 0.7, salario: 2000 },
  'Assistente Contabilidade|Júnior':     { peso: 0.7, salario: 2500 },
  'Assistente Contabilidade|Pleno':      { peso: 0.8, salario: 2900 },
  'Assistente Contabilidade|Sênior':     { peso: 0.9, salario: 3300 },
  'Analista Contabilidade|Júnior':       { peso: 0.9, salario: 3600 },
  'Analista Contabilidade|Pleno':        { peso: 1.0, salario: 4000 },
  'Analista Contabilidade|Sênior':       { peso: 1.1, salario: 4500 },
  'Coordenador Contabilidade|Júnior':    { peso: 1.6, salario: 5800 },
  'Coordenador Contabilidade|Pleno':     { peso: 1.8, salario: 6300 },
  'Coordenador Contabilidade|Sênior':    { peso: 2.0, salario: 7000 },
  'Assistente Fiscal|Júnior':            { peso: 0.7, salario: 2500 },
  'Assistente Fiscal|Pleno':             { peso: 0.8, salario: 2900 },
  'Assistente Fiscal|Sênior':            { peso: 0.9, salario: 3300 },
  'Analista Fiscal|Júnior':              { peso: 0.9, salario: 3600 },
  'Analista Fiscal|Pleno':               { peso: 1.0, salario: 4000 },
  'Analista Fiscal|Sênior':              { peso: 1.1, salario: 4500 },
  'Coordenador Fiscal|Júnior':           { peso: 1.6, salario: 5800 },
  'Coordenador Fiscal|Pleno':            { peso: 1.8, salario: 6300 },
  'Coordenador Fiscal|Sênior':           { peso: 2.0, salario: 7000 },
  'Assistente Legalização|Júnior':       { peso: 0.6, salario: 2100 },
  'Assistente Legalização|Pleno':        { peso: 0.7, salario: 2500 },
  'Assistente Legalização|Sênior':       { peso: 0.8, salario: 2800 },
  'Analista Legalização|Júnior':         { peso: 0.9, salario: 3200 },
  'Analista Legalização|Pleno':          { peso: 1.0, salario: 3600 },
  'Analista Legalização|Sênior':         { peso: 1.1, salario: 4000 },
  'Coordenador Legalização|Sênior':      { peso: 1.5, salario: 4500 },
  'ADM Unidade Administrativo|Júnior':   { peso: 0.6, salario: 2100 },
  'ADM Unidade Administrativo|Pleno':    { peso: 0.7, salario: 2500 },
  'ADM Unidade Administrativo|Sênior':   { peso: 0.8, salario: 3000 },
  'Líder ADM Administrativo|Júnior':     { peso: 1.2, salario: 3200 },
  'Líder ADM Administrativo|Pleno':      { peso: 1.3, salario: 3500 },
  'Líder ADM Administrativo|Sênior':     { peso: 1.4, salario: 4000 },
}

export function getPesoSalario(cargo: string, departamento: string, nivel: string) {
  const key = `${cargo} ${departamento}|${nivel}`
  return PESO_SALARIO[key] ?? { peso: 0, salario: 0 }
}

// Opções para dropdowns
export const DEPARTAMENTOS = ['Contabilidade', 'Fiscal', 'Legalização', 'Administrativo'] as const
export const NIVEIS = ['Júnior', 'Pleno', 'Sênior'] as const

export const CARGOS_POR_DEPTO: Record<string, string[]> = {
  Contabilidade: ['Auxiliar', 'Assistente', 'Analista', 'Coordenador'],
  Fiscal:        ['Assistente', 'Analista', 'Coordenador'],
  Legalização:   ['Assistente', 'Analista', 'Coordenador'],
  Administrativo:['ADM Unidade', 'Líder ADM'],
}

export const CAPACIDADE_POR_CARGO: Record<string, string> = {
  'Auxiliar Contabilidade':    'Até 20 CNPJs',
  'Assistente Contabilidade':  'Até 40 CNPJs',
  'Analista Contabilidade':    'Até 100 CNPJs',
  'Coordenador Contabilidade': '3 mesas',
  'Assistente Fiscal':         'Até 70 CNPJs',
  'Analista Fiscal':           'Até 35 CNPJs',
  'Coordenador Fiscal':        '210 CNPJs',
  'Assistente Legalização':    'Até 100 CNPJs',
  'Analista Legalização':      'Até 100 CNPJs',
  'Coordenador Legalização':   'Departamento',
  'ADM Unidade Administrativo':'1 escritório',
  'Líder ADM Administrativo':  'Multi-unidades',
}

// KPIs de cada departamento (fonte: aba 06_KPIs por Departamento)
export interface KpiConfig {
  label: string
  meta: string
  peso: number
  hint: string
  inverso?: boolean // para KPIs onde menor = melhor (churn, retrabalho)
}

export const KPIS_CONFIG: Record<string, KpiConfig[]> = {
  Contabilidade: [
    { label: 'Fechamento de balancetes no prazo', meta: 'Até dia 20 do mês seguinte', peso: 0.25, hint: 'Digite o % atingido (ex: 0.95 para 95%)' },
    { label: 'Conciliação bancária',              meta: '100% mensal',                 peso: 0.20, hint: '% de contas conciliadas no prazo' },
    { label: 'Integração de APIs (XMLs/marketplaces)', meta: '100% APIs ativas',      peso: 0.15, hint: '% de integrações funcionando' },
    { label: 'Retrabalho / pendências reabertas', meta: '<5%',                         peso: 0.15, hint: '% de tarefas sem retrabalho (inverso: 0.96 = 4% retrabalho)', inverso: false },
    { label: 'Reuniões mensais de DRE entregues', meta: '100% clientes elegíveis',     peso: 0.15, hint: '% de reuniões realizadas com clientes' },
    { label: 'SLA de resposta (≤30 min)',         meta: '≥90%',                        peso: 0.10, hint: '% de respostas em até 30 min' },
  ],
  Fiscal: [
    { label: 'Pontualidade de guias e obrigações',      meta: '100% no prazo',     peso: 0.30, hint: '% guias entregues no prazo' },
    { label: 'Conformidade — zero multas por erro',     meta: '0 multas',           peso: 0.20, hint: '1.0 = zero multas; reduza conforme incidentes' },
    { label: 'SLA atendimento WhatsApp (≤30 min)',      meta: '≥90%',               peso: 0.15, hint: '% respondidas em até 30 min' },
    { label: 'Acurácia tributária / SKU',               meta: '0 erros de tributação', peso: 0.15, hint: '1.0 = zero erros; reduza conforme erros' },
    { label: 'Apresentação de alíquota efetiva mensal', meta: '100% clientes',      peso: 0.10, hint: '% clientes que receberam apresentação' },
    { label: 'Retenção da carteira (churn área)',       meta: '<2% churn',          peso: 0.10, hint: '% de retenção (ex: 0.98 = 2% churn)' },
  ],
  Legalização: [
    { label: 'Onboarding de novos clientes no prazo',        meta: '100% em até 15 dias', peso: 0.30, hint: '% clientes ativados no prazo' },
    { label: 'Alterações contratuais executadas no prazo',   meta: '100%',               peso: 0.20, hint: '% solicitações concluídas no SLA' },
    { label: 'Validade de certificados digitais monitorada', meta: '100% sem vencimento', peso: 0.15, hint: '% clientes com certificado válido' },
    { label: 'Acompanhamento RBT12 / mudança de regime',     meta: '100% mapeados',       peso: 0.15, hint: '% clientes monitorados para mudança de regime' },
    { label: 'Transição entre contadores sem ruído',         meta: '100%',                peso: 0.10, hint: '% transições sem reclamação' },
    { label: 'SLA de resposta (�$30 min)',                    meta: '≥90%',                peso: 0.10, hint: '% atendimentos rápidos' },
  ],
  Administrativo: [
    { label: 'Infraestrutura operacional (TI, acessos, compras)', meta: '100% atendido', peso: 0.25, hint: '% solicitações resolvidas no SLA' },
    { label: 'Onboarding administrativo de clientes',              meta: '100% no prazo', peso: 0.20, hint: '% clientes ativados administrativamente' },
    { label: 'Qualidade do atendimento (NPS)',                      meta: 'NPS ≥70',       peso: 0.20, hint: 'Digite o NPS / 100 (ex: 0.75 para NPS 75)' },
    { label: 'Parcerias com Marketplaces',                          meta: '≥3 ações/sem.', peso: 0.15, hint: '% de iniciativas executadas' },
    { label: 'Aderência a treinamentos trimestrais',               meta: '≥75%',           peso: 0.10, hint: '% de participação nos treinamentos' },
    { label: 'SLA suporte interno (≤30 min)',                      meta: '≥90%',           peso: 0.10, hint: '% respostas rápidas ao time interno' },
  ],
}

export const fmt = {
  moeda: (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  perc:  (v: number) => (v * 100).toFixed(1) + '%',
  num:   (v: number) => v.toLocaleString('pt-BR'),
}
