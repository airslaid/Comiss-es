-- Tabela para gerenciar permissões e perfis de usuários
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'USER', -- 'ADMIN' ou 'USER'
    allowed_modules JSONB DEFAULT '[]'::jsonb, -- Lista de IDs dos menus permitidos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso total (ajustar conforme necessário para produção)
CREATE POLICY "Allow full access to permissions" 
ON public.user_permissions 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- Trigger para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_permissions_updated_at
    BEFORE UPDATE ON public.user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
