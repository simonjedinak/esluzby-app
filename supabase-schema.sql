-- =============================================
-- eSlužby - Databázová schéma
-- Spusti tento SQL v Supabase SQL Editor
-- =============================================

-- Enum typy
CREATE TYPE user_role AS ENUM ('admin', 'veduci', 'reporter');
CREATE TYPE tema_stav AS ENUM ('neschvalene', 'caka', 'schvalene');
CREATE TYPE reporter_stav AS ENUM ('pracujuci', 'nepracujuci', 'volno');

-- =============================================
-- Profiles tabuľka (prepojená s auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  meno TEXT NOT NULL,
  priezvisko TEXT NOT NULL,
  rola user_role NOT NULL DEFAULT 'reporter',
  telefon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Témy (služby reportérov)
-- =============================================
CREATE TABLE temy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  nazov TEXT NOT NULL,
  popis TEXT,
  stav tema_stav NOT NULL DEFAULT 'caka',
  poznamka_veduceho TEXT,
  schvalil_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Voľná (dovolenky/voľno)
-- =============================================
CREATE TABLE volna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  datum_od DATE NOT NULL,
  datum_do DATE NOT NULL,
  dovod TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Denný stav reportéra
-- =============================================
CREATE TABLE denny_stav (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  stav reporter_stav NOT NULL DEFAULT 'pracujuci',
  nastavil_id UUID REFERENCES profiles(id),
  UNIQUE(reporter_id, datum)
);

-- =============================================
-- Vedúci dňa
-- =============================================
CREATE TABLE veduci_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  veduci_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(datum, veduci_id)
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE temy ENABLE ROW LEVEL SECURITY;
ALTER TABLE volna ENABLE ROW LEVEL SECURITY;
ALTER TABLE denny_stav ENABLE ROW LEVEL SECURITY;
ALTER TABLE veduci_dna ENABLE ROW LEVEL SECURITY;

-- Profiles: každý prihlásený vidí všetky profily
CREATE POLICY "Prihlásení vidia profily" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Používatelia upravujú svoj profil" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin vytvára profily" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rola = 'admin')
  );

-- Témy: prihlásení vidia všetky, reporter pridáva svoje
CREATE POLICY "Prihlásení vidia témy" ON temy
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reporter pridáva témy" ON temy
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reporter upravuje vlastné témy" ON temy
  FOR UPDATE TO authenticated
  USING (
    reporter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM veduci_dna
      WHERE veduci_dna.veduci_id = auth.uid()
      AND veduci_dna.datum = temy.datum
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rola = 'admin')
  );

CREATE POLICY "Reporter maže vlastné témy" ON temy
  FOR DELETE TO authenticated
  USING (
    reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rola = 'admin')
  );

-- Voľná
CREATE POLICY "Prihlásení vidia voľná" ON volna
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reporter pridáva voľná" ON volna
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reporter maže vlastné voľná" ON volna
  FOR DELETE TO authenticated
  USING (
    reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rola = 'admin')
  );

-- Denný stav
CREATE POLICY "Prihlásení vidia denný stav" ON denny_stav
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vedúci/admin nastavuje stav" ON denny_stav
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND rola IN ('veduci', 'admin')
    )
  );

CREATE POLICY "Vedúci/admin upravuje stav" ON denny_stav
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND rola IN ('veduci', 'admin')
    )
  );

-- Vedúci dňa
CREATE POLICY "Prihlásení vidia vedúcich dňa" ON veduci_dna
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin spravuje vedúcich dňa" ON veduci_dna
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND rola IN ('veduci', 'admin')
    )
  );

CREATE POLICY "Admin maže vedúcich dňa" ON veduci_dna
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND rola IN ('veduci', 'admin')
    )
  );

-- =============================================
-- Trigger na automatické vytváranie profilu pri registrácii
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, meno, priezvisko, rola)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'meno', ''),
    COALESCE(NEW.raw_user_meta_data->>'priezvisko', ''),
    COALESCE((NEW.raw_user_meta_data->>'rola')::public.user_role, 'reporter'::public.user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Trigger na updated_at pre témy
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER temy_updated_at
  BEFORE UPDATE ON temy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Indexy pre výkon
-- =============================================
CREATE INDEX idx_temy_datum ON temy(datum);
CREATE INDEX idx_temy_reporter ON temy(reporter_id);
CREATE INDEX idx_volna_reporter ON volna(reporter_id);
CREATE INDEX idx_volna_datumy ON volna(datum_od, datum_do);
CREATE INDEX idx_denny_stav_datum ON denny_stav(datum);
CREATE INDEX idx_veduci_dna_datum ON veduci_dna(datum);
