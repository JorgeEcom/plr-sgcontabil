import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  icon: LucideIcon
  defaultOpen?: boolean
  badge?: { text: string; ok: boolean }
  children: React.ReactNode
}

export default function SectionCard({ title, subtitle, icon: Icon, defaultOpen = false, badge, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="bg-brand-50 p-2 rounded-lg">
            <Icon size={20} className="text-brand-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
            {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
          </div>
          {badge && (
            <span className={badge.ok ? 'badge-ok ml-2' : 'badge-fail ml-2'}>
              {badge.text}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={20} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-5">
          {children}
        </div>
      )}
    </div>
  )
}
