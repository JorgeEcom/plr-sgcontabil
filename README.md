# PLR + Plano de Carreira — SG Contábil

Dashboard web para gestão do programa de PLR semestral e plano de carreira.

---

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend / Banco de dados**: Supabase (PostgreSQL, Auth, RLS) — plano gratuito
- **Deploy**: Vercel — plano gratuito, deploy automático via GitHub

---

## 1. Criar projeto no Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Dê um nome (ex: `plr-sgcontabil`) e escolha uma senha de banco
3. Aguarde o projeto criar (~2 min)
4. Vá em **SQL Editor** → cole e execute o conteúdo de `supabase/migrations/001_initial.sql`
5. Anote:
   - **Project URL** (em Settings → API): `https://xxxx.supabase.co`
   - **anon public key** (em Settings → API)

### Criar o primeiro usuário admin

No **SQL Editor** do Supabase, após criar o usuário pelo painel Authentication → Users:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'UUID_DO_USUARIO';
```

### Criar coordenadores

Para cada coordenador, crie o usuário em Authentication → Users, depois:

```sql
UPDATE profiles
SET role = 'coordenador', departamento = 'Fiscal'  -- ajuste o departamento
WHERE id = 'UUID_DO_COORDENADOR';
```

---

## 2. Configurar o projeto localmente

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/plr-sgcontabil.git
cd plr-sgcontabil

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env

# Edite .env e preencha as variáveis com os dados do Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key

# Inicie o servidor de desenvolvimento
npm run dev
```

---

## 3. Subir para o GitHub

```bash
# Na pasta do projeto
git init
git add .
git commit -m "feat: PLR SG Contábil — dashboard inicial"
git remote add origin https://github.com/SEU_USUARIO/plr-sgcontabil.git
git push -u origin main
```

---

## 4. Deploy no Vercel (gratuito)

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório GitHub `plr-sgcontabil`
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` = chave anon do Supabase
4. Clique em **Deploy**
5. Pronto — a cada `git push` o Vercel atualiza automaticamente

---

## 5. Como usar

### Perfis de acesso

| Papel | O que pode fazer |
|-------|-----------------|
| **Admin** | Tudo: premissas, gatilhos, colaboradores, visualizar resultados |
| **Coordenador** | Preencher KPIs do próprio departamento; visualizar resultado |

### Fluxo semestral

1. **Admin** preenche as **Premissas** (meta de faturamento, margem, % pool, etc.)
2. Após o fechamento do semestre, **admin** preenche os **Gatilhos Corporativos** (valores realizados)
3. Cada **coordenador** preenche os **KPIs** do seu departamento
4. **Admin** atualiza **treinamentos e notas individuais** de cada colaborador
5. A seção **Resultado Final** calcula e exibe automaticamente o PLR de cada um

### Regras de elegibilidade

Para receber PLR, o colaborador precisa:
- ≥ 3 meses na função atual
- ≥ 75% de aderência aos treinamentos obrigatórios do período
- Nota KPI individual ≥ 60%

### Fórmula de distribuição

```
PLR bruto = Cota Corporativa (50%) + Cota da Área (30%) + Cota Individual (20%)
PLR final = MIN(MAX(PLR bruto, salário × piso), salário × teto)
```

---

## Estrutura de arquivos

```
src/
├── types/index.ts          # Tipos TypeScript
├── lib/
│   ├── supabase.ts         # Cliente Supabase
│   ├── constants.ts        # Pesos, salários, KPIs por departamento
│   └── calculations.ts     # Todas as fórmulas (equivalente ao Excel)
└── components/
    ├── Auth.tsx            # Tela de login
    ├── Header.tsx          # Barra superior
    ├── SectionCard.tsx     # Seção expansível (wrapper)
    ├── Premissas.tsx       # Seção 1 — premissas financeiras
    ├── GatilhosCorporativos.tsx  # Seção 2 — gatilhos
    ├── KPIsDepartamento.tsx      # Seção 3 — KPIs por área
    ├── CadastroColaboradores.tsx # Seção 4 — colaboradores
    └── ResultadoFinal.tsx        # Seção 5 — resultado PLR
```
