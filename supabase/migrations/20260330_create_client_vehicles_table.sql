-- Create client_vehicles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.client_vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  vehicle text NOT NULL,
  plate text UNIQUE,
  is_national boolean NOT NULL DEFAULT true,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  vehicle_photo_url text,
  CONSTRAINT client_vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT client_vehicles_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Enable RLS on client_vehicles table
ALTER TABLE public.client_vehicles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.client_vehicles;
DROP POLICY IF EXISTS "Admins can manage all vehicles" ON public.client_vehicles;

-- RLS Policy: Users can view vehicles of their clients
CREATE POLICY "Users can view their own vehicles"
  ON public.client_vehicles FOR SELECT TO authenticated
  USING (
    -- Allow if user is admin OR if the client_id matches their own client record
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert vehicles for their own clients
CREATE POLICY "Users can insert their own vehicles"
  ON public.client_vehicles FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if user is admin OR if the client_id matches their own client record
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own vehicles
CREATE POLICY "Users can update their own vehicles"
  ON public.client_vehicles FOR UPDATE TO authenticated
  USING (
    -- Allow if user is admin OR if the client_id matches their own client record
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Allow if user is admin OR if the client_id matches their own client record
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can DELETE their own vehicles
CREATE POLICY "Users can delete their own vehicles"
  ON public.client_vehicles FOR DELETE TO authenticated
  USING (
    -- Allow if user is admin OR if the client_id matches their own client record
    public.has_role(auth.uid(), 'admin'::app_role)
    OR client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Admins can manage all vehicles
CREATE POLICY "Admins can manage all vehicles"
  ON public.client_vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_client_vehicles_updated_at ON public.client_vehicles;
CREATE TRIGGER update_client_vehicles_updated_at
  BEFORE UPDATE ON public.client_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_vehicles_client_id ON public.client_vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_client_vehicles_plate ON public.client_vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_client_vehicles_is_primary ON public.client_vehicles(is_primary);
