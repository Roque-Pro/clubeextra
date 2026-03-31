-- Adicionar coluna de vídeo aos agendamentos
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS appointment_video_url text;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_appointments_video ON public.appointments(appointment_video_url);
