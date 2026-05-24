import type { ColaboradorCompleto, KpiDepartamento, Premissas, GatilhosCalc, Gatilhos } from '../types'
import { calcularGatilhos, calcularPool, calcularDistribuicao, calcularNotaDept } from '../lib/calculations'
import { DEPARTAMENTOS, fmt } from '../lib/constants'
import { TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react'

interface Props {
  premissas: Premissas | null
  gatilhos: Gatilhos | null
  gatilhosCalc: GatilhosCalc | null
  kpis: KpiDepartamento[]
  colaboradores: ColaboradorCompleto[]
}

export default function ResultadoFinal({ premissas, gatilhos, gatilhosCalc, kpis, colaboradores }: Props) {
  if (!premissas || !gatilhos || !gatilhosCalc) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <AlertCircle size={16} />
        Preencha premissas e gatilhos para ver os resultados.
      </div>
    )
  }

  const pool = calcularPool(gatilhosCalc, premissas)
  const resultados = calcularDistribuicao(colaboradores, kpis, pool, premissas)
  const elegiveis = resultados.filter(r => r.elegivel)
  const totalPago = resultados.reduce((s, r) => s + r.plrFinal, 0)

  const notasDept = Object.fromEntries(
    DEPARTAMENTOS.map(d => [d, calcularNotaDept(d, kpis)])
  )

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <DollarSign size={24} className="text-brand-500 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Pool bruto</p>
          <p className="text-xl font-bold text-gray-800">{fmt.moeda(pool.poolBruto)}</p>
        </div>
        <div className={`card text-center ${gatilhosCalc.plrAtivado ? 'border-green-200' : 'border-red-200'}`}>
          <TrendingUp size={24} className={`mx-auto mb-1 ${gatilhosCalc.plrAtivado ? 'text-green-500' : 'text-red-500'}`} />
          <p className="text-xs text-gray-500">Pool ajustado (× {gatilhosCalc.fatorAjuste})</p>
          <p className="text-xl font-bold text-gray-800">{fmt.moeda(pool.poolAjustado)}</p>
        </div>
        <div className="card text-center">
          <Users size={24} className="text-brand-500 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Elegíveis / Total</p>
          <p className="text-xl font-bold text-gray-800">{elegiveis.length} / {resultados.length}</p>
        </div>
        <div className="card text-center">
          <DollarSign size={24} className="text-green-500 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Total distribuído</p>
          <p className="text-xl font-bold text-green-700">{fmt.moeda(totalPago)}</p>
        </div>
      </div>

      {/* Pool por componente */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Distribuição do Pool (50/30/20)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Corporativo (50%)', val: pool.compCorporativo, color: 'bg-brand-500' },
            { label: 'Área / Depto (30%)', val: pool.compArea, color: 'bg-blue-500' },
            { label: 'Individual (20%)', val: pool.compIndividual, color: 'bg-purple-500' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-lg p-3 border border-gray-200">
              <div className={`w-3 h-3 rounded-full ${color} mb-2`} />
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-800">{fmt.moeda(val)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notas por área */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Notas por Departamento</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DEPARTAMENTOS.map(d => {
            const nota = notasDept[d] ?? 0
            const elegivDept = elegiveis.filter(r => r.departamento === d).length
            return (
              <div key={d} className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500">{d}</p>
                <p className={`text-2xl font-bold ${nota >= 0.7 ? 'text-green-600' : nota >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {fmt.perc(nota)}
                </p>
                <p className="text-xs text-gray-400">{elegivDept} elegív.</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabela individual */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Distribuição Individual</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">Colaborador</th>
                <th className="table-th">Cargo / Nível</th>
                <th className="table-th">Salário base</th>
                <th className="table-th">Cota corp. (50%)</th>
                <th className="table-th">Cota área (30%)</th>
                <th className="table-th">Cota indiv. (20%)</th>
                <th className="table-th">PLR bruto</th>
                <th className="table-th">PLR final</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resultados.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${!r.elegivel ? 'opacity-50' : ''}`}>
                  <td className="table-td font-medium">
                    {r.nome}
                    <span className="text-xs text-gray-400 block">{r.departamento}</span>
                  </td>
                  <td className="table-td">{r.cargo} {r.nivel}</td>
                  <td className="table-td">{fmt.moeda(r.salario)}</td>
                  <td className="table-td">{r.elegivel ? fmt.moeda(r.cotaCorp) : '—'}</td>
                  <td className="table-td">{r.elegivel ? fmt.moeda(r.cotaArea) : '—'}</td>
                  <td className="table-td">{r.elegivel ? fmt.moeda(r.cotaIndiv) : '—'}</td>
                  <td className="table-td">{r.elegivel ? fmt.moeda(r.plrBruto) : '—'}</td>
                  <td className="table-td font-bold text-green-700">
                    {r.elegivel ? fmt.moeda(r.plrFinal) : '—'}
                  </td>
                  <td className="table-td">
                    <span className={
                      r.statusTeto === 'Normal' ? 'badge-ok'
                      : r.statusTeto === 'Não elegível' ? 'badge-fail'
                      : 'badge-warn'
                    }>
                      {r.statusTeto}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-brand-50 font-bold">
                <td className="table-td" colSpan={7}>TOTAL DISTRIBUÍDO</td>
                <td className="table-td text-green-700 text-base">{fmt.moeda(totalPago)}</td>
                <td className="table-td" />
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          Teto: {premissas.teto_salarios}× salário base · Piso: {premissas.piso_salarios}× salário base
        </p>
      </div>
    </div>
  )
}
