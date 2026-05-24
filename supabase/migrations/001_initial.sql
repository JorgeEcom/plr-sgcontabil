-- PLR SG Contábil — Schema Inicial
-- Execute no Supabase SQL Editor

-- Semestres (ciclos de apuração)
CREATE TABLE IF NOT EXISTS semestres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  periodo TEXT NOT NULL,
  data_pagamento DATE,
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Premissas financeiras por semestre
CREATE TABLE IF NOT EXISTS premissas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semestre_id UUID NOT NULL REFERENCES semestres(id) ON DELETE CASCADE,
  meta_faturamento NUMERIC NOT NULL DEFAULT 600000,
  margem_minima NUMERIC NOT NULL DEFAULT 0.20,
  perc_pool NUMERIC NOT NULL DEFAULT 0.15,
  teto_salarios NUMERIC NOT NULL DEFAULT 1.5,
  piso_salarios NUMERIC NOT NULL DEFAULT 0.3,
  peso_corporativo NUMERIC NOT NULL DEFAULT 0.5,
  peso_area NUMERIC NOT NULL DEFAULT 0.3,
  peso_individual NUMERIC NOT NULL DEFAULT 0.2,
  treinamentos_anuais INTEGER NOT NULL DEFAULT 4,
  perc_min_treinamentos NUMERIC NOT NULL DEFAULT 0.75,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semestre_id)
);

-- Gatilhos Corporativos por semestre
CREATE TABLE IF NOT EXISTS gatilhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semestre_id UUID NOT NULL REFERENCES semestres(id) ON DELETE CASCADE,
  fat_realizado NUMERIC DEFAULT 0,
  margem_realizada NUMERIC DEFAULT 0,
  churn_realizado NUMERIC DEFAULT 0,
  inadimplencia_realizada NUMERIC DEFAULT 0,
  multas_realizado INTEGER DEFAULT 0,
  nps_realizado NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semestre_id)
);

-- KPIs por departamento (realizados) por semestre
CREATE TABLE IF NOT EXISTS kpis_departamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semestre_id UUID NOT NULL REFERENCES semestres(id) ON DELETE CASCADE,
  departamento TEXT NOT NULL,
  kpi_index INTEGER NOT NULL,
  realizado NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semestre_id, departamento, kpi_index)
);

-- Colaboradores (dados base)
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  departamento TEXT NOT NULL,
  cargo TEXT NOT NULL,
  nivel TEXT NOT NULL,
  data_admissao DATE NOT NULL,
  data_funcao_atual DATE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avaliações por semestre por colaborador
CREATE TABLE IF NOT EXISTS colaboradores_semestre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semestre_id UUID NOT NULL REFERENCES semestres(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  treinamentos_realizados INTEGER DEFAULT 0,
  nota_kpi_individual NUMERIC DEFAULT 0,
  nota_ciclo_anterior NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semestre_id, colaborador_id)
);

-- Perfis de usuário (admin ou coordenador)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  role TEXT DEFAULT 'coordenador' CHECK (role IN ('admin', 'coordenador')),
  departamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE semestres            ENABLE ROW LEVEL SECURITY;
ALTER TABLE premissas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE gatilhos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis_departamento    ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores_semestre ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;

-- Leitura para todos autenticados
CREATE POLICY "read_all" ON semestres FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all" ON premissas FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all" ON gatilhos FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all" ON kpis_departamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all" ON colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all" ON colaboradores_semestre FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_own" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());

-- Admin pode escrever tudo
CREATE POLICY "admin_all" ON semestres FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON premissas FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON gatilhos FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON colaboradores FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON colaboradores_semestre FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Coordenador pode escrever KPIs do próprio departamento
CREATE POLICY "coord_or_admin" ON kpis_departamento FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR (SELECT departamento FROM profiles WHERE id = auth.uid()) = departamento
  );

-- Trigger: criar profile ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, nome, role, departamento)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'coordenador'),
    NEW.raw_user_meta_data->>'departamento'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── Seed: primeiro semestre ───────────────────────────────────
INSERT INTO semestres (nome, periodo, data_pagamento, ativo)
VALUES ('1º Semestre 2026', 'Janeiro a Junho/2026', '2026-08-31', true)
ON CONFLICT DO NOTHING;
