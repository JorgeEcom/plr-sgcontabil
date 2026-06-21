import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { KpiDepartamento, Profile } from '../types'
import { KPIS_CONFIG, DEPARTAMENTOS, fmt } from '../lib/constants'
import { calcularNotaDept } from '../lib/calculations'
import { Save } from 'lucide-react'

interface Props {
  semestreId: string
  profile: Profile | null
  onChange: (kpis: KpiDepartamento[]) => void
}

export default function KPIsDepartamento({ semestreId, profile, onChange }: Props) {
  const [kpis, setKpis] = useState<KpiDepartamento[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [savedDept, setSavedDept] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isAdmin = profile?.role === 'admin'
  const deptsVisiveis = isAdmin ? DEPARTAMENTOS : DEPARTAMENTOS.filter(d => d === profile?.departamento)

  useEffect(() => {
    supabase.from('kpis_departamento').select('*').eq('semestre_id', semestreId)
      .then(({ data, error }) => {
        if (error) { setErrors(prev => ({ ...prev, _load: 'Erro ao carregar KPIs: ' + error.message })); return }
        if (data) { setKpis(data as KpiDepartamento[]); onChange(data as KpiDepartamento[]) }
      })
  }, [semestreId])

  function getVal(dept: string, idx: number): number {
    return kpis.find(k => k.departamento === dept && k.kpi_index === idx)?.realizado ?? 0
  }

  function setVal(dept: string, idx: number, val: string) {
    const v = Math.min(1, Math.max(0, parseFloat(val) || 0))
    setKpis(prev => {
      const existing = prev.find(k => k.departamento === dept && k.kpi_index === idx)
      const next = existing
        ? prev.map(k => k.departamento === dept && k.kpi_index === idx ? { ...k, realizado: v } : k)
        : [...prev, { semestre_id: semestreId, departamento: dept, kpi_index: idx, realizado: v }]
      onChange(next)
      return next
    })
  }

  async function saveDept(dept: string) {
    setSaving(dept)
    setErrors(prev => { const n = { ...prev }; delete n[dept]; return n })
    const deptKpis = KPIS_CONFIG[dept].map((_, i) => ({
      semestre_id: semestreId,
      departamento: dept,
      kpi_index: i,
      realizado: getVal(dept, i),
    }))
    const { error } = await supabase.from('kpis_departamento')
      .upsert(deptKpis, { onConflict: 'semestre_id,departamento,kpi_index' })
    setSaving(null)
    if (error) {
      setErrors(prev => ({ ...prev, [dept]: 'Erro ao salvar: ' + error.message }))
      return
    }
    setSavedDept(dept)
    setTimeout(() => setSavedDept(null), 2000)
  }

  function canEdit(dept: string) {
    return isAdmin || profile?.departamento === dept
  }

  return (
    <div className="space-y-8">
      {errors._load && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
          {errors._load}
        </div>
      )}
      {deptsVisiveis.map(dept => {
        const kpisCfg = KPIS_CONFIG[dept] ?? []
        const notaFinal = calcularNotaDept(dept, kpis)

        return (
          <div key={dept} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-brand-50 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-brand-800">{dept}</h3>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${notaFinal >= 0.7 ? 'text-green-600' : notaFinal >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  Nota final: {fmt.perc(notaFinal)}
                </span>
                {errors[dept] && (
                  <span className="text-xs text-red-600">{errors[dept]}</span>
                )}
                {canEdit(dept) && (
                  <button onClick={() => saveDept(dept)} disabled={saving === dept} className="btn-primary text-xs py-1.5 px-3">
                    <Save size={13} />
                    {saving === dept ? 'Salvando...' : savedDept === dept ? 'Salvo! ✓' : 'Salvar'}
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-th">KPI</th>
                    <th className="table-th w-32">Meta</th>
                    <th className="table-th w-20">Peso</th>
                    <th className="table-th w-36">Realizado (0–1)</th>
                    <th className="table-th w-28">Nota ponderada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kpisCfg.map((kpi, i) => {
                    const val = getVal(dept, i)
                    const nota = val * kpi.peso
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="table-td">
                          <span className="font-medium">{kpi.label}</span>
                          <p className="text-xs text-gray-400">{kpi.hint}</p>
                        </td>
                        <td className="table-td text-gray-500">{kpi.meta}</td>
                        <td className="table-td text-center">{fmt.perc(kpi.peso)}</td>
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <input
                              type="number" step="0.01" min="0" max="1"
                              className="input w-24"
                              disabled={!canEdit(dept)}
                              value={val}
                              onChange={e => setVal(dept, i, e.target.value)}
                            />
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-8">
                              <div
                                className={`h-1.5 rounded-full transition-all ${val >= 0.9 ? 'bg-green-500' : val >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, val * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="table-td font-medium text-brand-700">{fmt.perc(nota)}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-brand-50 font-semibold">
                    <td className="table-td" colSpan={2}>TOTAL {dept.toUpperCase()}</td>
                    <td className="table-td text-center">{fmt.perc(kpisCfg.reduce((s, k) => s + k.peso, 0))}</td>
                    <td className="table-td">—</td>
                    <td className="table-td text-brand-700 font-bold">{fmt.perc(notaFinal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
