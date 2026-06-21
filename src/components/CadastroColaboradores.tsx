import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Colaborador, ColaboradorCompleto, ColaboradorSemestre, Premissas } from '../types'
import { DEPARTAMENTOS, CARGOS_POR_DEPTO, NIVEIS, fmt } from '../lib/constants'
import { isElegivel, mesesNaFuncao } from '../lib/calculations'
import { Plus, Trash2, Save, UserCheck, UserX } from 'lucide-react'

interface Props {
  semestreId: string
  premissas: Premissas | null
  isAdmin: boolean
  onChange: (colabs: ColaboradorCompleto[]) => void
}

const EMPTY_COLAB: Omit<Colaborador, 'id' | 'ativo'> = {
  nome: '', departamento: 'Contabilidade', cargo: 'Auxiliar', nivel: 'Júnior',
  data_admissao: '', data_funcao_atual: '',
}

export default function CadastroColaboradores({ semestreId, premissas, isAdmin, onChange }: Props) {
  const [colabs, setColabs] = useState<ColaboradorCompleto[]>([])
  const [novo, setNovo] = useState(EMPTY_COLAB)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function load() {
    const { data: cs, error: e1 } = await supabase.from('colaboradores').select('*').eq('ativo', true).order('nome')
    const { data: ss, error: e2 } = await supabase.from('colaboradores_semestre').select('*').eq('semestre_id', semestreId)
    if (e1 || e2) {
      setSaveError('Erro ao carregar colaboradores: ' + (e1?.message ?? e2?.message))
      return
    }
    if (cs) {
      const merged: ColaboradorCompleto[] = (cs as Colaborador[]).map(c => ({
        ...c,
        semestre: (ss as ColaboradorSemestre[])?.find(s => s.colaborador_id === c.id),
      }))
      setColabs(merged)
      onChange(merged)
    }
  }

  useEffect(() => { load() }, [semestreId])

  async function addColab() {
    if (!novo.nome || !novo.data_admissao || !novo.data_funcao_atual) return
    setAdding(true)
    setSaveError(null)
    const { data, error: e } = await supabase.from('colaboradores').insert({ ...novo, ativo: true }).select().single()
    if (e) { setSaveError('Erro ao adicionar colaborador: ' + e.message); setAdding(false); return }
    if (data) {
      const { error: e2 } = await supabase.from('colaboradores_semestre').insert({
        semestre_id: semestreId, colaborador_id: data.id,
        treinamentos_realizados: 0, nota_kpi_individual: 0, nota_ciclo_anterior: 0,
      })
      if (e2) { setSaveError('Colaborador criado mas erro ao vincular semestre: ' + e2.message) }
      setNovo(EMPTY_COLAB)
      setShowForm(false)
      await load()
    }
    setAdding(false)
  }

  async function removeColab(id: string) {
    if (!confirm('Desativar colaborador?')) return
    const { error: e } = await supabase.from('colaboradores').update({ ativo: false }).eq('id', id)
    if (e) { setSaveError('Erro ao desativar: ' + e.message); return }
    await load()
  }

  async function updateSemestre(colabId: string, field: keyof Omit<ColaboradorSemestre, 'id' | 'semestre_id' | 'colaborador_id'>, val: string) {
    const v = parseFloat(val) || 0

    // Optimistic local update so input doesn't revert while DB call is in-flight
    setColabs(prev => {
      const updated = prev.map(c => {
        if (c.id !== colabId) return c
        const semestre = c.semestre
          ? { ...c.semestre, [field]: v }
          : { id: '', semestre_id: semestreId, colaborador_id: colabId, treinamentos_realizados: 0, nota_kpi_individual: 0, nota_ciclo_anterior: 0, [field]: v }
        return { ...c, semestre }
      })
      onChange(updated)
      return updated
    })

    const existing = colabs.find(c => c.id === colabId)?.semestre
    let err = null
    if (existing?.id) {
      const { error } = await supabase.from('colaboradores_semestre').update({ [field]: v }).eq('id', existing.id)
      err = error
    } else {
      const { error } = await supabase.from('colaboradores_semestre').insert({
        semestre_id: semestreId, colaborador_id: colabId,
        treinamentos_realizados: 0, nota_kpi_individual: 0, nota_ciclo_anterior: 0,
        [field]: v,
      })
      err = error
    }
    if (err) {
      setSaveError('Erro ao salvar: ' + err.message)
      await load() // revert to DB state on error
    }
  }

  const eligibleCount = premissas ? colabs.filter(c => isElegivel(c, premissas)).length : 0

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm flex justify-between items-center">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-2 text-red-500 hover:text-red-700 font-bold">×</button>
        </div>
      )}
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-brand-600">{colabs.length}</p>
          <p className="text-xs text-gray-500">Colaboradores ativos</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{eligibleCount}</p>
          <p className="text-xs text-gray-500">Elegíveis ao PLR</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{colabs.length - eligibleCount}</p>
          <p className="text-xs text-gray-500">Não elegíveis</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-th">Nome</th>
              <th className="table-th">Depto / Cargo / Nível</th>
              <th className="table-th">Meses na função</th>
              <th className="table-th">Treinamentos</th>
              <th className="table-th">Nota KPI</th>
              <th className="table-th">Nota anterior</th>
              <th className="table-th">Elegibilidade</th>
              {isAdmin && <th className="table-th">Ação</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {colabs.map(c => {
              const meses = mesesNaFuncao(c.data_funcao_atual)
              const elegivel = premissas ? isElegivel(c, premissas) : null
              const trein = c.semestre?.treinamentos_realizados ?? 0
              const nota = c.semestre?.nota_kpi_individual ?? 0
              const notaAnt = c.semestre?.nota_ciclo_anterior ?? 0
              const percT = premissas ? trein / premissas.treinamentos_anuais : 0

              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{c.nome}</td>
                  <td className="table-td">
                    <span className="text-xs text-gray-500">{c.departamento}</span><br />
                    <span>{c.cargo} {c.nivel}</span>
                  </td>
                  <td className="table-td text-center">
                    <span className={meses >= 3 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                      {meses}m
                    </span>
                    <span className="text-xs text-gray-400 block">{meses >= 3 ? '✓' : '✗ min 3m'}</span>
                  </td>
                  <td className="table-td">
                    <input type="number" min="0" max={premissas?.treinamentos_anuais ?? 4}
                      className="input w-16 text-center"
                      value={trein}
                      onChange={e => updateSemestre(c.id, 'treinamentos_realizados', e.target.value)} />
                    <span className={`text-xs block mt-0.5 ${percT >= 0.75 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmt.perc(percT)}
                    </span>
                  </td>
                  <td className="table-td">
                    <input type="number" step="0.01" min="0" max="1"
                      className="input w-20 text-center"
                      value={nota}
                      onChange={e => updateSemestre(c.id, 'nota_kpi_individual', e.target.value)} />
                    <span className={`text-xs block mt-0.5 ${nota >= 0.6 ? 'text-green-600' : 'text-red-500'}`}>
                      {nota >= 0.6 ? '✓' : '✗ min 60%'}
                    </span>
                  </td>
                  <td className="table-td">
                    <input type="number" step="0.01" min="0" max="1"
                      className="input w-20 text-center"
                      value={notaAnt}
                      onChange={e => updateSemestre(c.id, 'nota_ciclo_anterior', e.target.value)} />
                  </td>
                  <td className="table-td">
                    {elegivel === null ? '—' : elegivel
                      ? <span className="badge-ok"><UserCheck size={12} /> Elegível</span>
                      : <span className="badge-fail"><UserX size={12} /> Não elegível</span>}
                  </td>
                  {isAdmin && (
                    <td className="table-td">
                      <button onClick={() => removeColab(c.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Desativar">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Adicionar colaborador */}
      {isAdmin && (
        <div>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="btn-secondary">
              <Plus size={16} /> Adicionar colaborador
            </button>
          ) : (
            <div className="border border-dashed border-brand-300 rounded-xl p-4 bg-brand-50 space-y-3">
              <h4 className="font-semibold text-brand-800">Novo colaborador</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="label">Nome</label>
                  <input className="input" value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Departamento</label>
                  <select className="input" value={novo.departamento}
                    onChange={e => setNovo(p => ({ ...p, departamento: e.target.value, cargo: CARGOS_POR_DEPTO[e.target.value][0] }))}>
                    {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Cargo</label>
                  <select className="input" value={novo.cargo}
                    onChange={e => setNovo(p => ({ ...p, cargo: e.target.value }))}>
                    {(CARGOS_POR_DEPTO[novo.departamento] ?? []).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Nível</label>
                  <select className="input" value={novo.nivel}
                    onChange={e => setNovo(p => ({ ...p, nivel: e.target.value }))}>
                    {NIVEIS.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Data de admissão</label>
                  <input type="date" className="input" value={novo.data_admissao}
                    onChange={e => setNovo(p => ({ ...p, data_admissao: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Data início na função atual</label>
                  <input type="date" className="input" value={novo.data_funcao_atual}
                    onChange={e => setNovo(p => ({ ...p, data_funcao_atual: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addColab} disabled={adding} className="btn-primary">
                  <Save size={16} /> {adding ? 'Salvando...' : 'Salvar colaborador'}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
