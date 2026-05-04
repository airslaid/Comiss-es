CREATE TABLE IF NOT EXISTS public.crm_agenda (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rep_in_codigo BIGINT NOT NULL,
    rep_nome TEXT NOT NULL,
    assunto TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_termino TIME NOT NULL,
    atividade TEXT NOT NULL,
    prioridade TEXT NOT NULL,
    cliente_nome TEXT,
    local TEXT,
    descricao TEXT,
    status TEXT DEFAULT 'AGENDADO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and allow public access for API usage
ALTER TABLE public.crm_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access" 
ON public.crm_agenda 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
