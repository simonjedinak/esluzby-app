export type UserRole =
  | "admin"
  | "veduci_vydania"
  | "editor"
  | "produkcia"
  | "web_editor"
  | "tn_live"
  | "office_manazer"
  | "sefproducent"
  | "reporter";

export const rolaLabels: Record<UserRole, string> = {
  admin: "Admin",
  veduci_vydania: "Vedúci vydania",
  editor: "Editor",
  produkcia: "Produkcia",
  web_editor: "WEB editor",
  tn_live: "TN Live",
  office_manazer: "Office manažér",
  sefproducent: "Šéfproducent",
  reporter: "Reportér",
};

export const rolaColors: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  veduci_vydania: "bg-orange-100 text-orange-700",
  editor: "bg-indigo-100 text-indigo-700",
  produkcia: "bg-pink-100 text-pink-700",
  web_editor: "bg-cyan-100 text-cyan-700",
  tn_live: "bg-red-100 text-red-700",
  office_manazer: "bg-emerald-100 text-emerald-700",
  sefproducent: "bg-slate-100 text-slate-700",
  reporter: "bg-blue-100 text-blue-700",
};

export const ALL_ROLES: UserRole[] = [
  "admin",
  "veduci_vydania",
  "editor",
  "produkcia",
  "web_editor",
  "tn_live",
  "office_manazer",
  "sefproducent",
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
  if (hasRole(profile, "sefproducent")) return false;
  return hasRole(profile, "admin");
}

/** Check if user can manage (admin or vedúci vydania) */
export function canManage(profile: Profile): boolean {
  if (hasRole(profile, "sefproducent")) return false;
  return hasAnyRole(profile, ["admin", "veduci_vydania"]);
}

/** Check if user can edit the leaders/positions table (vedenie dňa) */
export function canEditTable(profile: Profile): boolean {
  if (hasRole(profile, "sefproducent")) return false;
  return hasAnyRole(profile, [
    "admin",
    "veduci_vydania",
    "produkcia",
    "web_editor",
    "office_manazer",
    "tn_live",
  ]);
}

/** Check if user can approve/reject topics */
export function canApproveTopics(profile: Profile): boolean {
  if (hasRole(profile, "sefproducent")) return false;
  return hasAnyRole(profile, ["admin", "veduci_vydania", "tn_live"]);
}

/** Check if user can change reporter daily status (pracuje/nepracuje/voľno) */
export function canChangeReporterStatus(profile: Profile): boolean {
  if (hasRole(profile, "sefproducent")) return false;
  return hasAnyRole(profile, ["admin", "office_manazer"]);
}

/** Check if user can set leave (admin, vedúci vydania, or office manažér) */
export function canSetLeave(profile: Profile): boolean {
  if (hasRole(profile, "sefproducent")) return false;
  return hasAnyRole(profile, ["admin", "veduci_vydania", "office_manazer"]);
}

/** Check if user can approve/reject leave (admin or office manažér) */
export function canApproveLeave(profile: Profile): boolean {
  if (hasRole(profile, "sefproducent")) return false;
  return hasAnyRole(profile, ["admin", "office_manazer"]);
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
  | "platene_volno"
  | "neplatene_volno"
  | "nahradne_volno"
  | "sluzobna_cesta";

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
  redaktor_tn_live: "TN Live",
};

/** Mapping of each position to the roles that can fill it */
export const poziciaRoly: Record<PoziciaTyp, UserRole[]> = {
  veduci_dna: ["veduci_vydania"],
  producent_tn: ["veduci_vydania"],
  editor: ["veduci_vydania", "editor"],
  pomocny_editor: ["veduci_vydania", "editor"],
  produkcia_1: ["produkcia"],
  produkcia_2: ["produkcia"],
  web_editor: ["web_editor"],
  redaktor_tn_live: ["tn_live"],
};

/** Get profiles eligible for a given position (matching role only, excludes admin-only) */
export function getProfilesForPozicia(
  profiles: Profile[],
  pozicia: PoziciaTyp,
): Profile[] {
  const allowedRoles = poziciaRoly[pozicia];
  return profiles.filter((p) => allowedRoles.some((r) => hasRole(p, r)));
}

export const typVolnaLabels: Record<TypVolna, string> = {
  platene_volno: "Platené voľno",
  neplatene_volno: "Neplatené voľno",
  nahradne_volno: "Náhradné voľno",
  sluzobna_cesta: "Služobná cesta",
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
  roly: UserRole[];
  telefon: string | null;
  region: string | null;
  je_regionalny: boolean;
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
  je_hodnotenie: boolean;
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
