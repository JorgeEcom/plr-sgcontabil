import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Gatilhos as TGatilhos, Premissas, GatilhosCalc } from '../types'
import { calcularGatilhos } from '../lib/calculations'
import { fmt } from '../lib/constants'
import { Save, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  semestreId: string
  premissas: Premissas | null
  isAdmin: boolean
  onChange: (g: TGatilhos, calc: GatilhosCalc) => void
}

function MoneyInput({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false)
  const [rawText, setRawText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className="input w-36"
      disabled={disabled}
      value={focused ? rawText : formatted}
      onFocus={() => {
        const editVal = value > 0 ? value.toFixed(2).replace('.', ',') : ''
        setRawText(editVal)
        setFocused(true)
        setTimeout(() => inputRef.current?.select(), 0)
      }}
      onChange={e => {
        const t = e.target.value.replace(/[^\d,.]/g, '')
        setRawText(t)
        const parsed = parseFloat(t.replace(/\./g, '').replace(',', '.')) || 0
        onChange(parsed)
      }}
      onBlur={() => setFocused(false)}
    />
  )
}

const EMPTY: Omit<TGatilhos, 'id' | 'semestre_id'> = {
  fat_realizado: 0, margem_realizada: 0, churn_realizado: 0,
  inadimplencia_realizada: 0, multas_realizado: 0, nps_realizado: 0,
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? 'badge-ok' : 'badge-fail'}>
      {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {label}
    </span>
  )
}

export default function GatilhosCorporativos({ semestreId, premissas, isAdmin, onChange }: Props) {
  const [data, setData] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('gatilhos').select('*').eq('semestre_id', semestreId).maybeSingle()
      .then(({ data: d, error: e }) => {
        if (e) { setError('Erro ao carregar gatilhos: ' + e.message); return }
        if (d) {
          const { id: _id, semestre_id: _sid, ...rest } = d as TGatilhos
          setData(rest)
          if (premissas) onChange(d as TGatilhos, calcularGatilhos(d as TGatilhos, premissas))
        }
      })
  }, [semestreId, premissas])

  function set(k: keyof typeof EMPTY, v: string) {
    const next = { ...data, [k]: parseFloat(v) || 0 }
    setData(next)
    if (premissas) {
      const full = { ...next, semestre_id: semestreId }
      onChange(full as TGatilhos, calcularGatilhos(full as TGatilhos, premissas))
    }
  }

  function setMoney(k: keyof typeof EMPTY, v: number) {
    const next = { ...data, [k]: v }
    setData(next)
    if (premissas) {
      const full = { ...next, semestre_id: semestreId }
      onChange(full as TGatilhos, calcularGatilhos(full as TGatilhos, premissas))
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('gatilhos')
      .upsert({ semestre_id: semestreId, ...data }, { onConflict: 'semestre_id' })
    setSaving(false)
    if (err) {
      setError('Erro ao salvar: ' + err.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!premissas) return <p className="text-gray-400 text-sm">Preencha as premissas primeiro.</p>

  const g = { ...data, semestre_id: semestreId, id: '' } as TGatilhos
  const calc = calcularGatilhos(g, premissas)

  const lucroMeta = premissas.meta_faturamento * premissas.margem_minima

  return (
    <div className="space-y-6">
      {/* Status PLR */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${calc.plrAtivado ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className={`text-3xl ${calc.plrAtivado ? 'text-green-600' : 'text-red-600'}`}>
          {calc.plrAtivado ? '✓' : '✗'}
        </div>
        <div>
          <p className={`font-bold text-lg ${calc.plrAtivado ? 'text-green-700' : 'text-red-700'}`}>
            PLR {calc.plrAtivado ? 'ATIVADO' : 'NÃO ATIVADO'}
          </p>
          <p className="text-sm text-gray-600">
            Fator de ajuste do pool:{' '}
            <strong>{calc.fatorAjuste === 1.1 ? '1,10× (acima de 110% da meta)' : calc.fatorAjuste === 1 ? '1,00× (meta cumprida)' : calc.fatorAjuste === 0.85 ? '0,85× (90–99% da meta)' : '0 (abaixo de 90%)'}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Gatilhos críticos: {calc.criticos}/3 atingidos · Qualidade: {calc.qualidade}/4 atingidos
          </p>
        </div>
      </div>

      {/* Tabela de gatilhos */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-th rounded-tl-lg">Indicador</th>
              <th className="table-th">Meta</th>
              <th className="table-th">Realizado</th>
              <th className="table-th">% Atingido</th>
              <th className="table-th rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="table-td font-medium">Faturamento semestral (R$)</td>
              <td className="table-td">{fmt.moeda(premissas.meta_faturamento)}</td>
              <td className="table-td">
                <MoneyInput value={data.fat_realizado} onChange={v => setMoney('fat_realizado', v)} disabled={!isAdmin} />
              </td>
              <td className="table-td">{fmt.perc(calc.percFat)}</td>
              <td className="table-td"><Status ok={calc.statusFat} label={calc.statusFat ? 'Atingido' : 'Não atingido'} /></td>
            </tr>
            <tr>
              <td className="table-td font-medium">Margem líquida (%)</td>
              <td className="table-td">{fmt.perc(premissas.margem_minima)}</td>
              <td className="table-td">
                <input type="number" step="0.01" className="input w-28" disabled={!isAdmin}
                  value={data.margem_realizada} onChange={e => set('margem_realizada', e.target.value)} />
                <span className="text-xs text-gray-400 ml-1">Ex: 0.22</span>
              </td>
              <td className="table-td">{fmt.perc(calc.percMargem)}</td>
              <td className="table-td"><Status ok={calc.statusMargem} label={calc.statusMargem ? 'Atingido' : 'Não atingido'} /></td>
            </tr>
            <tr className="bg-gray-50">
              <td className="table-td font-medium text-gray-500">Lucro líquido (calculado)</td>
              <td className="table-td text-gray-500">{fmt.moeda(lucroMeta)}</td>
              <td className="table-td text-gray-500">{fmt.moeda(calc.lucroRealizado)}</td>
              <td className="table-td text-gray-500">{lucroMeta > 0 ? fmt.perc(calc.lucroRealizado / lucroMeta) : '—'}</td>
              <td className="table-td"><Status ok={calc.statusLucro} label={calc.statusLucro ? 'Atingido' : 'Abaixo'} /></td>
            </tr>
            <tr>
              <td className="table-td font-medium">Churn da carteira (%)</td>
              <td className="table-td">≤5%</td>
              <td className="table-td">
                <input type="number" step="0.01" className="input w-28" disabled={!isAdmin}
                  value={data.churn_realizado} onChange={e => set('churn_realizado', e.target.value)} />
                <span className="text-xs text-gray-400 ml-1">Ex: 0.03</span>
              </td>
              <td className="table-td">{fmt.perc(data.churn_realizado)}</td>
              <td className="table-td"><Status ok={calc.statusChurn} label={calc.statusChurn ? 'Dentro do limite' : 'Acima do limite'} /></td>
            </tr>
            <tr>
              <td className="table-td font-medium">Inadimplência (%)</td>
              <td className="table-td">≤5%</td>
              <td className="table-td">
                <input type="number" step="0.01" className="input w-28" disabled={!isAdmin}
                  value={data.inadimplencia_realizada} onChange={e => set('inadimplencia_realizada', e.target.value)} />
                <span className="text-xs text-gray-400 ml-1">Ex: 0.02</span>
              </td>
              <td className="table-td">{fmt.perc(data.inadimplencia_realizada)}</td>
              <td className="table-td"><Status ok={calc.statusInadim} label={calc.statusInadim ? 'Dentro do limite' : 'Acima do limite'} /></td>
            </tr>
            <tr>
              <td className="table-td font-medium">Multas / contingências graves (un.)</td>
              <td className="table-td">0</td>
              <td className="table-td">
                <input type="number" className="input w-24" disabled={!isAdmin}
                  value={data.multas_realizado} onChange={e => set('multas_realizado', e.target.value)} />
              </td>
              <td className="table-td">—</td>
              <td className="table-td"><Status ok={calc.statusMultas} label={calc.statusMultas ? 'Sem incidentes' : 'Houve incidente'} /></td>
            </tr>
            <tr>
              <td className="table-td font-medium">NPS / Satisfação do cliente</td>
              <td className="table-td">≥70</td>
              <td className="table-td">
                <input type="number" className="input w-24" disabled={!isAdmin}
                  value={data.nps_realizado} onChange={e => set('nps_realizado', e.target.value)} />
              </td>
              <td className="table-td">{fmt.perc(calc.percNPS)}</td>
              <td className="table-td"><Status ok={calc.statusNPS} label={calc.statusNPS ? 'Atingido' : 'Abaixo'} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {isAdmin && (
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save size={16} />
          {saving ? 'Salvando...' : saved ? 'Salvo! ✓' : 'Salvar gatilhos'}
        </button>
      )}
    </div>
  )
}
