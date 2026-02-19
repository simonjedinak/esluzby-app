-- =============================================
-- Migrácia: Komentáre k témam
-- Podpora viacerých komentárov na jednu tému
-- =============================================

-- Nová tabuľka pre komentáre k témam
CREATE TABLE tema_komentare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id UUID NOT NULL REFERENCES temy(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_tema_komentare_tema ON tema_komentare(tema_id);
CREATE INDEX idx_tema_komentare_autor ON tema_komentare(autor_id);

-- RLS
ALTER TABLE tema_komentare ENABLE ROW LEVEL SECURITY;

-- Všetci prihlásení vidia komentáre
CREATE POLICY "Prihlásení vidia komentáre" ON tema_komentare
  FOR SELECT TO authenticated USING (true);

-- Vedúci/admin pridáva komentáre
CREATE POLICY "Vedúci/admin pridáva komentáre" ON tema_komentare
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND rola IN ('veduci', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM veduci_dna WHERE veduci_id = auth.uid()
    )
  );

-- Autor maže vlastné komentáre
CREATE POLICY "Autor maže vlastné komentáre" ON tema_komentare
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rola = 'admin')
  );
