export type UserRole = "admin" | "veduci" | "reporter";

export type TemaStav = "neschvalene" | "caka" | "schvalene";

export type ReporterStav = "pracujuci" | "nepracujuci" | "volno";

export interface Profile {
  id: string;
  email: string;
  meno: string;
  priezvisko: string;
  rola: UserRole;
  telefon: string | null;
  created_at: string;
}

export interface Tema {
  id: string;
  reporter_id: string;
  datum: string;
  nazov: string;
  popis: string | null;
  stav: TemaStav;
  poznamka_veduceho: string | null;
  schvalil_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  reporter?: Profile;
  schvalil?: Profile;
}

export interface Volno {
  id: string;
  reporter_id: string;
  datum_od: string;
  datum_do: string;
  dovod: string | null;
  created_at: string;
  // Joined
  reporter?: Profile;
}

export interface DennyStav {
  id: string;
  reporter_id: string;
  datum: string;
  stav: ReporterStav;
  nastavil_id: string | null;
  // Joined
  reporter?: Profile;
}

export interface VeduciDna {
  id: string;
  datum: string;
  veduci_id: string;
  // Joined
  veduci?: Profile;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      temy: {
        Row: Tema;
        Insert: Omit<
          Tema,
          "id" | "created_at" | "updated_at" | "reporter" | "schvalil"
        >;
        Update: Partial<
          Omit<Tema, "id" | "created_at" | "reporter" | "schvalil">
        >;
      };
      volna: {
        Row: Volno;
        Insert: Omit<Volno, "id" | "created_at" | "reporter">;
        Update: Partial<Omit<Volno, "id" | "created_at" | "reporter">>;
      };
      denny_stav: {
        Row: DennyStav;
        Insert: Omit<DennyStav, "id" | "reporter">;
        Update: Partial<Omit<DennyStav, "id" | "reporter">>;
      };
      veduci_dna: {
        Row: VeduciDna;
        Insert: Omit<VeduciDna, "id" | "veduci">;
        Update: Partial<Omit<VeduciDna, "id" | "veduci">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      tema_stav: TemaStav;
      reporter_stav: ReporterStav;
    };
  };
}
