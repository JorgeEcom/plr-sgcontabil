import { Building2, LogOut, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Profile, Semestre } from '../types'

interface Props {
  profile: Profile | null
  semestre: Semestre | null
}

export default function Header({ profile, semestre }: Props) {
  return (
    <header className="bg-brand-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={24} />
          <div>
            <span className="font-bold text-lg">SG Contábil</span>
            {semestre && (
              <span className="ml-3 text-brand-200 text-sm hidden sm:inline">
                {semestre.nome} · {semestre.periodo}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-brand-100">
            <User size={16} />
            <span className="hidden sm:inline">{profile?.nome ?? 'Usuário'}</span>
            <span className="text-brand-300 text-xs capitalize">
              ({profile?.role === 'admin' ? 'Admin' : profile?.departamento ?? 'Coordenador'})
            </span>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 text-brand-200 hover:text-white transition-colors text-sm"
            title="Sair"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
