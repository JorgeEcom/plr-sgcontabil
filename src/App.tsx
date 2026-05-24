import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type {
  Profile, Semestre, Premissas as TPremissas,
  Gatilhos as TGatilhos, KpiDepartamento, ColaboradorCompleto, GatilhosCalc,
} from './types'

import Auth from './components/Auth'
import Header from './components/Header'
import SectionCard from './components/SectionCard'
import PremissasComp from './components/Premissas'
import GatilhosCorporativos from './components/GatilhosCorporativos'
import KPIsDepartamento from './components/KPIsDepartamento'
import CadastroColaboradores from './components/CadastroColaboradores'
import ResultadoFinal from './components/ResultadoFinal'

import { Settings, Target, BarChart2, Users, Trophy } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [semestre, setSemestre] = useState<Semestre | null>(null)
  const [loading, setLoading] = useState(true)

  // Estado compartilhado entre seções
  const [premissas, setPremissas] = useState<TPremissas | null>(null)
  const [gatilhos, setGatilhos] = useState<TGatilhos | null>(null)
  const [gatilhosCalc, setGatilhosCalc] = useState<GatilhosCalc | null>(null)
  const [kpis, setKpis] = useState<KpiDepartamento[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorCompleto[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setLoading(false); return }
    Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('semestres').select('*').eq('ativo', true).single(),
    ]).then(([{ data: p }, { data: s }]) => {
      setProfile(p as Profile)
      setSemestre(s as Semestre)
      setLoading(false)
    })
  }, [session])

  if (!session) return <Auth />
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    </div>
  )

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} semestre={semestre} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Banner PLR ativo/inativo */}
        {gatilhosCalc && (
          <div className={`rounded-xl p-4 flex items-center justify-between shadow-sm ${gatilhosCalc.plrAtivado ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            <div>
              <p className="font-bold text-lg">
                PLR {gatilhosCalc.plrAtivado ? '✓ ATIVADO' : '✗ NÃO ATIVADO'} — {semestre?.nome}
              </p>
              <p className="text-sm opacity-90">
                {gatilhosCalc.plrAtivado
                  ? `Fator de ajuste: ×${gatilhosCalc.fatorAjuste}`
                  : `Gatilhos críticos: ${gatilhosCalc.criticos}/3 · Qualidade: ${gatilhosCalc.qualidade}/4`}
              </p>
            </div>
            {premissas && gatilhosCalc.plrAtivado && (
              <div className="text-right">
                <p className="text-sm opacity-75">Pool ajustado estimado</p>
                <p className="text-2xl font-bold">
                  {gatilhos ? (gatilhosCalc.lucroRealizado * premissas.perc_pool * gatilhosCalc.fatorAjuste)
                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 1 - Premissas */}
        <SectionCard
          title="1. Premissas do Programa"
          subtitle="Metas financeiras, pesos e regras de elegibilidade"
          icon={Settings}
          defaultOpen={isAdmin && !premissas}
        >
          {semestre && (
            <PremissasComp
              semestreId={semestre.id}
              isAdmin={isAdmin}
              onChange={setPremissas}
            />
          )}
        </SectionCard>

        {/* 2 - Gatilhos Corporativos */}
        <SectionCard
          title="2. Gatilhos Corporativos"
          subtitle="Preencher após o fechamento do semestre"
          icon={Target}
          badge={gatilhosCalc ? { text: gatilhosCalc.plrAtivado ? 'PLR Ativado' : 'PLR Bloqueado', ok: gatilhosCalc.plrAtivado } : undefined}
          defaultOpen={false}
        >
          {semestre && (
            <GatilhosCorporativos
              semestreId={semestre.id}
              premissas={premissas}
              isAdmin={isAdmin}
              onChange={(g, calc) => { setGatilhos(g); setGatilhosCalc(calc) }}
            />
          )}
        </SectionCard>

        {/* 3 - KPIs por Departamento */}
        <SectionCard
          title="3. KPIs por Departamento"
          subtitle="Coordenadores preenchem os resultados do próprio time"
          icon={BarChart2}
          defaultOpen={false}
        >
          {semestre && (
            <KPIsDepartamento
              semestreId={semestre.id}
              profile={profile}
              onChange={setKpis}
            />
          )}
        </SectionCard>

        {/* 4 - Cadastro de Colaboradores */}
        <SectionCard
          title="4. Colaboradores e Avaliações"
          subtitle="Cadastro, treinamentos e notas individuais do ciclo"
          icon={Users}
          defaultOpen={false}
        >
          {semestre && (
            <CadastroColaboradores
              semestreId={semestre.id}
              premissas={premissas}
              isAdmin={isAdmin}
              onChange={setColaboradores}
            />
          )}
        </SectionCard>

        {/* 5 - Resultado Final */}
        <SectionCard
          title="5. Resultado Final do PLR"
          subtitle="Distribuição individual calculada automaticamente"
          icon={Trophy}
          defaultOpen={false}
          badge={premissas && gatilhosCalc
            ? { text: gatilhosCalc.plrAtivado ? 'Pool liberado' : 'Pool bloqueado', ok: gatilhosCalc.plrAtivado }
            : undefined}
        >
          <ResultadoFinal
            premissas={premissas}
            gatilhos={gatilhos}
            gatilhosCalc={gatilhosCalc}
            kpis={kpis}
            colaboradores={colaboradores}
          />
        </SectionCard>

      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        SG Contábil · Sistema de PLR + Plano de Carreira 2026
      </footer>
    </div>
  )
}
