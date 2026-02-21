export type UserRole =
  | "admin"
  | "veduci_vydania"
  | "produkcia"
  | "web_editor"
  | "tn_live"
  | "office_manazerka"
  | "reporter";

export const rolaLabels: Record<UserRole, string> = {
  admin: "Admin",
  veduci_vydania: "Vedúci vydania",
  produkcia: "Produkcia",
  web_editor: "WEB editor",
  tn_live: "TN Live",
  office_manazerka: "Office manažérka",
  reporter: "Reportér",
};

export const rolaColors: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  veduci_vydania: "bg-orange-100 text-orange-700",
  produkcia: "bg-pink-100 text-pink-700",
  web_editor: "bg-cyan-100 text-cyan-700",
  tn_live: "bg-red-100 text-red-700",
  office_manazerka: "bg-emerald-100 text-emerald-700",
  reporter: "bg-blue-100 text-blue-700",
};

export const ALL_ROLES: UserRole[] = [
  "admin",
  "veduci_vydania",
  "produkcia",
  "web_editor",
  "tn_live",
  "office_manazerka",
  "reporter",
];

/** Check if a profile has a specific role */
export function hasRole(profile: Profile, role: UserRole): boolean {
  return profile.roly?.includes(role) ?? false;
}

/** Check if a profile has any of the specified roles */
export function hasAnyRole(profile: Profile, roles: UserRole[]): boolean {
  return roles.some((role) => profile.roly?.includes(role));
}

/** Check if user is admin */
export function isAdmin(profile: Profile): boolean {
  return hasRole(profile, "admin");
}

/** Check if user can manage (admin or vedúci vydania) */
export function canManage(profile: Profile): boolean {
  return hasAnyRole(profile, ["admin", "veduci_vydania"]);
}

/** Check if user can set leave (admin, vedúci vydania, or office manažérka) */
export function canSetLeave(profile: Profile): boolean {
  return hasAnyRole(profile, ["admin", "veduci_vydania", "office_manazerka"]);
}

/** Check if user is only a reporter (no other roles) */
export function isOnlyReporter(profile: Profile): boolean {
  return profile.roly?.length === 1 && profile.roly[0] === "reporter";
}

export type TemaStav = "neschvalene" | "caka" | "schvalene";

export type ReporterStav = "pracujuci" | "nepracujuci" | "volno";

export type PoziciaTyp =
  | "veduci_dna"
  | "producent_tn"
  | "editor"
  | "pomocny_editor"
  | "produkcia_1"
  | "produkcia_2"
  // | "produkcia_3"
  | "web_editor"
  | "redaktor_tn_live";

export type TypVolna =
  | "dovolenka"
  | "nahradne_volno"
  | "sick_day"
  | "lekar"
  | "ospravedlnene"
  | "neospravedlnene"
  | "ine";

export type VolnoStav = "caka" | "schvalene" | "neschvalene";

export type TemaTyp = "reportaz" | "skladacka";

export const poziciaLabels: Record<PoziciaTyp, string> = {
  veduci_dna: "Vedúci dňa",
  producent_tn: "Producent TN",
  editor: "Editor",
  pomocny_editor: "Pomocný editor",
  produkcia_1: "Produkcia 1",
  produkcia_2: "Produkcia 2",
  // produkcia_3: "Produkcia 3",
  web_editor: "WEB editor",
  redaktor_tn_live: "Redaktor TN Live",
};

export const typVolnaLabels: Record<TypVolna, string> = {
  dovolenka: "Dovolenka",
  nahradne_volno: "Náhradné voľno",
  sick_day: "Sick day",
  lekar: "Lekár",
  ospravedlnene: "Ospravedlnené",
  neospravedlnene: "Neospravedlnené",
  ine: "Iné",
};

export const volnoStavLabels: Record<VolnoStav, string> = {
  caka: "Čaká na schválenie",
  schvalene: "Schválené",
  neschvalene: "Neschválené",
};

export const temaTypLabels: Record<TemaTyp, string> = {
  reportaz: "Reportáž",
  skladacka: "Skladačka, synchrón, ilustráky",
};

export interface Profile {
  id: string;
  email: string;
  meno: string;
  priezvisko: string;
  rola: UserRole;
  roly: UserRole[];
  telefon: string | null;
  region: string | null;
  created_at: string;
}

export interface ProfilePozicia {
  id: string;
  profile_id: string;
  pozicia: PoziciaTyp;
}

export interface Tema {
  id: string;
  reporter_id: string;
  datum: string;
  nazov: string;
  popis: string | null;
  stav: TemaStav;
  typ: TemaTyp;
  miesto: string | null;
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
  typ: TypVolna;
  stav: VolnoStav;
  schvalil_id: string | null;
  poznamka: string | null;
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

export interface DennyPozicia {
  id: string;
  datum: string;
  profile_id: string;
  pozicia: PoziciaTyp;
  // Joined
  profile?: Profile;
}

export interface TemaKomentar {
  id: string;
  tema_id: string;
  autor_id: string;
  text: string;
  created_at: string;
  // Joined
  autor?: Profile;
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
      tema_komentare: {
        Row: TemaKomentar;
        Insert: Omit<TemaKomentar, "id" | "created_at" | "autor">;
        Update: Partial<Omit<TemaKomentar, "id" | "created_at" | "autor">>;
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
