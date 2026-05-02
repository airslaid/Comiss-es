CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.crm_metas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rep_in_codigo BIGINT NOT NULL,
    rep_nome TEXT NOT NULL,
    mes_ano VARCHAR(7) NOT NULL,
    valor_meta DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Evita que um representante tenha duas metas cadastradas no mesmo mês
ALTER TABLE public.crm_metas 
ADD CONSTRAINT unique_rep_mes_ano UNIQUE (rep_in_codigo, mes_ano);

-- Tabela para o Pipeline do CRM
CREATE TABLE IF NOT EXISTS crm_pipeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_in_codigo INTEGER NOT NULL,
    ser_st_codigo TEXT NOT NULL,
    ped_in_codigo INTEGER NOT NULL,
    stage TEXT NOT NULL DEFAULT 'PROCESSO INTERNO',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_in_codigo, ser_st_codigo, ped_in_codigo)
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_order ON crm_pipeline(org_in_codigo, ser_st_codigo, ped_in_codigo);

-- Configuração de Segurança (RLS) para permitir acesso via API
ALTER TABLE public.crm_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access" 
ON public.crm_metas 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
