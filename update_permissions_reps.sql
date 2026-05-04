ALTER TABLE public.user_permissions 
ADD COLUMN IF NOT EXISTS linked_reps JSONB DEFAULT '[]'::jsonb;
