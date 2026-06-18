-- Configuração de Políticas para o Bucket product-documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-documents', 'product-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Acesso Público Leitura - product-documents" ON storage.objects FOR SELECT USING (bucket_id = 'product-documents');
CREATE POLICY "Acesso Autenticado Inserção - product-documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Acesso Autenticado Deleção - product-documents" ON storage.objects FOR DELETE USING (bucket_id = 'product-documents' AND auth.role() = 'authenticated');

-- Configuração de Políticas para o Bucket vehicle-photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Acesso Público Leitura - vehicle-photos" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Acesso Autenticado Inserção - vehicle-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicle-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Acesso Autenticado Deleção - vehicle-photos" ON storage.objects FOR DELETE USING (bucket_id = 'vehicle-photos' AND auth.role() = 'authenticated');

-- Configuração de Políticas para o Bucket appointment-videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('appointment-videos', 'appointment-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Acesso Público Leitura - appointment-videos" ON storage.objects FOR SELECT USING (bucket_id = 'appointment-videos');
CREATE POLICY "Acesso Autenticado Inserção - appointment-videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'appointment-videos' AND auth.role() = 'authenticated');
CREATE POLICY "Acesso Autenticado Deleção - appointment-videos" ON storage.objects FOR DELETE USING (bucket_id = 'appointment-videos' AND auth.role() = 'authenticated');
