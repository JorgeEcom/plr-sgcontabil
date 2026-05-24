import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Premissas as TPremissas } from '../types'
import { Save } from 'lucide-react'
import { fmt } from '../lib/constants'

interface Props {
  semestreId: string
  isAdmin: boolean
  onChange: (p: TPremissas) => void
}

const DEFAULTS: Omit<TPremissas, 'id' | 'semestre_id'> = {
  meta_faturamento: 600000,
  margem_minima: 0.20,
  perc_pool: 0.15,
  teto_salarios: 1.5,
  piso_salarios: 0.3,
  peso_corporativo: 0.5,
  peso_area: 0.3,
  peso_individual: 0.2,
  treinamentos_anuais: 4,
  perc_min_treinamentos: 0.75,
}

export default function Premissas({ semestreId, isAdmin, onChange }: Props) {
  const [data, setData] = useState<Omit<TPremissas, 'id' | 'semestre_id'>>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('premissas').select('*').eq('semestre_id', semestreId).maybeSingle()
      .then(({ data: d }) => {
        if (d) {
          const { id: _id, semestre_id: _sid, ...rest } = d as TPremissas
          setData(rest)
          onChange(d as TPremissas)
        }
      })
  }, [semestreId])

  function update(k: keyof typeof DEFAULTS, v: string) {
    setData(prev => ({ ...prev, [k]: parseFloat(v) || 0 }))
  }

  async function save() {
    setSaving(true)
    const payload = { semestre_id: semestreId, ...data }
    const { data: saved } = await supabase
      .from('premissas')
      .upsert(payload, { onConflict: 'semestre_id' })
      .select()
      .single()
    if (saved) onChange(saved as TPremissas)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const pesoTotal = data.peso_corporativo + data.peso_area + data.peso_individual

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="label">Meta de faturamento semestral (R$)</label>
          <input type="number" className="input" disabled={!isAdmin}
            value={data.meta_faturamento}
            onChange={e => update('meta_faturamento', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Total de honorários no semestre</p>
        </div>
        <div>
          <label className="label">Margem líquida mínima (%)</label>
          <input type="number" step="0.01" className="input" disabled={!isAdmin}
            value={data.margem_minima}
            onChange={e => update('margem_minima', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Ex: 0.20 = 20% — gatilho de ativação</p>
        </div>
        <div>
          <label className="label">% do lucro líquido destinado ao pool</label>
          <input type="number" step="0.01" className="input" disabled={!isAdmin}
            value={data.perc_pool}
            onChange={e => update('perc_pool', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Ex: 0.15 = 15% do lucro</p>
        </div>
        <div>
          <label className="label">Teto individual (× salário base)</label>
          <input type="number" step="0.1" className="input" disabled={!isAdmin}
            value={data.teto_salarios}
            onChange={e => update('teto_salarios', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Ex: 1.5 = máximo 1,5× salário</p>
        </div>
        <div>
          <label className="label">Piso individual (× salário base)</label>
          <input type="number" step="0.1" className="input" disabled={!isAdmin}
            value={data.piso_salarios}
            onChange={e => update('piso_salarios', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Ex: 0.3 = mínimo 0,3× salário</p>
        </div>
        <div>
          <label className="label">Treinamentos obrigatórios / ano</label>
          <input type="number" className="input" disabled={!isAdmin}
            value={data.treinamentos_anuais}
            onChange={e => update('treinamentos_anuais', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Quantidade mínima para elegibilidade</p>
        </div>
        <div>
          <label className="label">% mínimo de aderência a treinamentos</label>
          <input type="number" step="0.05" className="input" disabled={!isAdmin}
            value={data.perc_min_treinamentos}
            onChange={e => update('perc_min_treinamentos', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Ex: 0.75 = 75% dos treinamentos</p>
        </div>
      </div>

      {/* Pesos da distribuição */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Pesos da Distribuição (devem somar 100%)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            ['peso_corporativo', 'Resultado Corporativo (50%)', 'Todos ganham igual quando empresa vai bem'],
            ['peso_area',        'Resultado da Área (30%)',     'Premia performance do time / setor'],
            ['peso_individual',  'Desempenho Individual (20%)', 'Reconhece a entrega de cada um'],
          ] as [keyof typeof DEFAULTS, string, string][]).map(([k, lbl, desc]) => (
            <div key={k}>
              <label className="label">{lbl}</label>
              <input type="number" step="0.05" className="input" disabled={!isAdmin}
                value={data[k] as number}
                onChange={e => update(k, e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-sm font-medium ${Math.abs(pesoTotal - 1) < 0.001 ? 'text-green-600' : 'text-red-600'}`}>
          Total: {fmt.perc(pesoTotal)} {Math.abs(pesoTotal - 1) < 0.001 ? '✓' : '— deve ser 100%'}
        </p>
      </div>

      {isAdmin && (
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save size={16} />
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar premissas'}
        </button>
      )}
    </div>
  )
}
