-- Tabela para os apontamentos de Follow Up
CREATE TABLE IF NOT EXISTS public.crm_followup (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_in_codigo INTEGER NOT NULL,
    ser_st_codigo TEXT NOT NULL,
    ped_in_codigo INTEGER NOT NULL,
    tipo TEXT NOT NULL, -- follow up, compromisso, agenda, telefonema, whatsapp
    descricao TEXT NOT NULL,
    data_contato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca rápida por pedido
CREATE INDEX IF NOT EXISTS idx_crm_followup_order ON public.crm_followup(org_in_codigo, ser_st_codigo, ped_in_codigo);

-- Políticas de RLS (Row Level Security)
ALTER TABLE public.crm_followup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access" 
ON public.crm_followup 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
