"use client";

import { useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  subDays,
} from "date-fns";
import { sk } from "date-fns/locale";
import type {
  Profile,
  DennyStav,
  Tema,
  Volno,
  ReporterStav,
  TemaStav,
  UserRole,
} from "@/lib/types/database";
import {
  typVolnaLabels,
  temaTypLabels,
  rolaLabels,
  rolaColors,
  isAdmin as checkIsAdmin,
  canManage as checkCanManage,
  canSetLeave,
} from "@/lib/types/database";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  FileText,
  CalendarDays,
  Filter,
} from "lucide-react";

interface ProfilClientProps {
  profile: Profile;
  currentProfile: Profile;
  isOwnProfile: boolean;
  denneStavy: DennyStav[];
  temy: Tema[];
  volna: Volno[];
  allProfiles: Profile[];
}

const DAY_NAMES = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function ProfilClient({
  profile,
  currentProfile,
  isOwnProfile,
  denneStavy,
  temy: initialTemy,
  volna,
  allProfiles,
}: ProfilClientProps) {
  // Profile edit state
  const [meno, setMeno] = useState(profile.meno);
  const [priezvisko, setPriezvisko] = useState(profile.priezvisko);
  const [telefon, setTelefon] = useState(profile.telefon || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [denneStavyLocal, setDenneStavyLocal] =
    useState<DennyStav[]>(denneStavy);

  // Topics filter state
  const [temyFilter, setTemyFilter] = useState<"all" | "mesiac" | "rok">("all");
  const [temyStavFilter, setTemyStavFilter] = useState<TemaStav | "all">("all");

  // Active tab
  const [activeTab, setActiveTab] = useState<
    "calendar" | "temy" | "volna" | "settings"
  >(isOwnProfile ? "calendar" : "calendar");

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const router = useRouter();

  const isAdminUser = checkIsAdmin(currentProfile);
  const canManageService =
    checkCanManage(currentProfile) || canSetLeave(currentProfile);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get day of week for first day (Monday = 0)
    let startDay = getDay(monthStart) - 1;
    if (startDay < 0) startDay = 6;

    // Pad start with previous month days
    const paddedDays: (Date | null)[] = Array(startDay).fill(null);
    paddedDays.push(...days);

    // Pad end to complete the week
    while (paddedDays.length % 7 !== 0) {
      paddedDays.push(null);
    }

    return paddedDays;
  }, [calendarMonth]);

  const getStavForDate = (dateStr: string): ReporterStav | null => {
    const stav = denneStavyLocal.find((s) => s.datum === dateStr);
    return stav?.stav || null;
  };

  const isVolnoDate = (dateStr: string): boolean => {
    return volna.some(
      (v) =>
        v.stav === "schvalene" &&
        dateStr >= v.datum_od &&
        dateStr <= v.datum_do,
    );
  };

  const handleSetStav = async (dateStr: string, stav: ReporterStav) => {
    const existing = denneStavyLocal.find((s) => s.datum === dateStr);

    if (existing && existing.stav === stav) {
      // Toggle off — remove
      await supabase.from("denny_stav").delete().eq("id", existing.id);
      setDenneStavyLocal((prev) => prev.filter((s) => s.id !== existing.id));
    } else if (existing) {
      // Update
      await supabase
        .from("denny_stav")
        .update({ stav, nastavil_id: currentProfile.id } as any)
        .eq("id", existing.id);
      setDenneStavyLocal((prev) =>
        prev.map((s) =>
          s.id === existing.id
            ? { ...s, stav, nastavil_id: currentProfile.id }
            : s,
        ),
      );
    } else {
      // Insert
      const { data } = await supabase
        .from("denny_stav")
        .insert({
          reporter_id: profile.id,
          datum: dateStr,
          stav,
          nastavil_id: currentProfile.id,
        } as any)
        .select()
        .single();
      if (data) {
        setDenneStavyLocal((prev) => [...prev, data as unknown as DennyStav]);
      }
    }
  };

  // Filter topics
  const filteredTemy = useMemo(() => {
    let filtered = initialTemy;

    if (temyFilter === "mesiac") {
      const monthAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      filtered = filtered.filter((t) => t.datum >= monthAgo);
    } else if (temyFilter === "rok") {
      const yearAgo = format(subDays(new Date(), 365), "yyyy-MM-dd");
      filtered = filtered.filter((t) => t.datum >= yearAgo);
    }

    if (temyStavFilter !== "all") {
      filtered = filtered.filter((t) => t.stav === temyStavFilter);
    }

    return filtered;
  }, [initialTemy, temyFilter, temyStavFilter]);

  // Profile update handlers
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error: err } = await supabase
      .from("profiles")
      .update({ meno, priezvisko, telefon: telefon || null } as any)
      .eq("id", profile.id);

    if (err) {
      setError("Nepodarilo sa aktualizovať profil");
    } else {
      setSuccess("Profil bol aktualizovaný");
      router.refresh();
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Heslá sa nezhodujú");
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Heslo musí mať aspoň 6 znakov");
      setPasswordLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (err) {
      setError("Nepodarilo sa zmeniť heslo");
    } else {
      setSuccess("Heslo bolo zmenené");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  const stavConfig: Record<
    TemaStav,
    { label: string; color: string; icon: typeof CheckCircle }
  > = {
    schvalene: {
      label: "Schválené",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
    },
    caka: {
      label: "Čaká",
      color: "bg-yellow-100 text-yellow-700",
      icon: Clock,
    },
    neschvalene: {
      label: "Neschválené",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
    },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-2xl font-semibold">
            {profile.meno[0]}
            {profile.priezvisko[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {profile.meno} {profile.priezvisko}
            </h1>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {profile.roly?.map((r: UserRole) => (
                <span
                  key={r}
                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${rolaColors[r]}`}
                >
                  {rolaLabels[r]}
                </span>
              ))}
              {profile.telefon && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {profile.telefon}
                </span>
              )}
              {profile.region && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.region}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(
          [
            { key: "calendar", label: "Kalendár", icon: CalendarDays },
            { key: "temy", label: "Témy", icon: FileText },
            { key: "volna", label: "Voľná", icon: Calendar },
            ...(isOwnProfile
              ? [{ key: "settings" as const, label: "Nastavenia", icon: User }]
              : []),
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h3 className="font-semibold text-gray-900 capitalize">
              {format(calendarMonth, "LLLL yyyy", { locale: sk })}
            </h3>
            <button
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="p-4">
            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-gray-400 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }

                const dateStr = format(day, "yyyy-MM-dd");
                const stav = getStavForDate(dateStr);
                const hasVolno = isVolnoDate(dateStr);
                const current = isToday(day);
                const inMonth = isSameMonth(day, calendarMonth);

                // Weekend check (Sat=6, Sun=0)
                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                let bgColor = "bg-gray-50 hover:bg-gray-100"; // default
                if (stav === "pracujuci") {
                  bgColor = "bg-green-100 hover:bg-green-200 text-green-800";
                } else if (stav === "nepracujuci") {
                  bgColor = "bg-red-100 hover:bg-red-200 text-red-800";
                } else if (stav === "volno" || hasVolno) {
                  bgColor = "bg-gray-200 hover:bg-gray-300 text-gray-600";
                } else if (isWeekend) {
                  bgColor = "bg-gray-100 text-gray-400";
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (canManageService) {
                        // Cycle: none -> pracujuci -> nepracujuci -> volno -> none
                        const cycle: (ReporterStav | null)[] = [
                          null,
                          "pracujuci",
                          "nepracujuci",
                          "volno",
                        ];
                        const currentIdx = cycle.indexOf(stav);
                        const nextIdx = (currentIdx + 1) % cycle.length;
                        const nextStav = cycle[nextIdx];
                        if (nextStav) {
                          handleSetStav(dateStr, nextStav);
                        } else if (stav) {
                          // Remove
                          handleSetStav(dateStr, stav); // toggle off
                        }
                      }
                    }}
                    disabled={!canManageService}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${bgColor} ${
                      !inMonth ? "opacity-40" : ""
                    } ${current ? "ring-2 ring-blue-500 ring-offset-1" : ""} ${
                      canManageService ? "cursor-pointer" : "cursor-default"
                    }`}
                    title={
                      stav
                        ? stav === "pracujuci"
                          ? "Pracujúci"
                          : stav === "nepracujuci"
                            ? "Nepracujúci"
                            : "Voľno"
                        : hasVolno
                          ? "Schválené voľno"
                          : undefined
                    }
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-200" />
                <span className="text-xs text-gray-500">Pracujúci</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-200" />
                <span className="text-xs text-gray-500">Nepracujúci</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-300" />
                <span className="text-xs text-gray-500">Voľno</span>
              </div>
              {canManageService && (
                <span className="text-xs text-blue-500 ml-auto">
                  Kliknite na deň pre nastavenie
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {(["pracujuci", "nepracujuci", "volno"] as ReporterStav[]).map(
                (s) => {
                  const count = denneStavyLocal.filter(
                    (d) =>
                      d.stav === s &&
                      isSameMonth(
                        new Date(d.datum + "T12:00:00"),
                        calendarMonth,
                      ),
                  ).length;
                  const label =
                    s === "pracujuci"
                      ? "Pracujúcich"
                      : s === "nepracujuci"
                        ? "Nepracujúcich"
                        : "Voľných";
                  const color =
                    s === "pracujuci"
                      ? "text-green-600"
                      : s === "nepracujuci"
                        ? "text-red-600"
                        : "text-gray-500";
                  return (
                    <div
                      key={s}
                      className="text-center py-2 rounded-lg bg-gray-50"
                    >
                      <div className={`text-lg font-bold ${color}`}>
                        {count}
                      </div>
                      <div className="text-xs text-gray-400">{label} dní</div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}

      {/* Temy Tab */}
      {activeTab === "temy" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(
                [
                  { key: "all", label: "Všetky" },
                  { key: "mesiac", label: "Mesiac" },
                  { key: "rok", label: "Rok" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTemyFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    temyFilter === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(
                [
                  { key: "all", label: "Všetky" },
                  { key: "caka", label: "Čaká" },
                  { key: "schvalene", label: "Schválené" },
                  { key: "neschvalene", label: "Neschválené" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTemyStavFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    temyStavFilter === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 px-1">
            {filteredTemy.length} tém
          </p>

          {filteredTemy.length > 0 ? (
            <div className="space-y-2">
              {filteredTemy.map((tema) => {
                const stavI = stavConfig[tema.stav];
                const StavIcon = stavI.icon;
                return (
                  <div
                    key={tema.id}
                    className={`bg-white rounded-xl border border-gray-100 p-3`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${stavI.color}`}
                          >
                            <StavIcon className="w-3 h-3" />
                            {stavI.label}
                          </span>
                          <span className="font-medium text-sm text-gray-900">
                            {tema.nazov}
                          </span>
                          {tema.typ && tema.typ !== "reportaz" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                              {temaTypLabels[tema.typ]}
                            </span>
                          )}
                        </div>
                        {tema.popis && (
                          <p className="text-xs text-gray-500 mt-1">
                            {tema.popis}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(
                              new Date(tema.datum + "T12:00:00"),
                              "d. MMM yyyy",
                              { locale: sk },
                            )}
                          </span>
                          {tema.miesto && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {tema.miesto}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Žiadne témy</p>
            </div>
          )}
        </div>
      )}

      {/* Volna Tab */}
      {activeTab === "volna" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">
            {volna.length} voľien celkovo
          </p>
          {volna.length > 0 ? (
            <div className="space-y-2">
              {volna.map((v) => {
                const stavLabel =
                  v.stav === "schvalene"
                    ? "Schválené"
                    : v.stav === "neschvalene"
                      ? "Neschválené"
                      : "Čaká";
                const stavColor =
                  v.stav === "schvalene"
                    ? "bg-green-100 text-green-700"
                    : v.stav === "neschvalene"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700";
                const StavIcon =
                  v.stav === "schvalene"
                    ? CheckCircle
                    : v.stav === "neschvalene"
                      ? XCircle
                      : Clock;

                return (
                  <div
                    key={v.id}
                    className="bg-white rounded-xl border border-gray-100 p-3"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${stavColor}`}
                      >
                        <StavIcon className="w-3 h-3" />
                        {stavLabel}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {typVolnaLabels[v.typ] || "Dovolenka"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-600">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {format(
                        new Date(v.datum_od + "T12:00:00"),
                        "d. MMM yyyy",
                        {
                          locale: sk,
                        },
                      )}
                      {v.datum_od !== v.datum_do && (
                        <>
                          {" — "}
                          {format(
                            new Date(v.datum_do + "T12:00:00"),
                            "d. MMM yyyy",
                            { locale: sk },
                          )}
                        </>
                      )}
                    </div>
                    {v.dovod && (
                      <p className="text-xs text-gray-500 mt-1">{v.dovod}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Žiadne voľná</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab (only own profile) */}
      {activeTab === "settings" && isOwnProfile && (
        <div className="space-y-6">
          {/* Profile Edit */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Osobné údaje
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-gray-400" />
                      Meno
                    </div>
                  </label>
                  <input
                    type="text"
                    value={meno}
                    onChange={(e) => setMeno(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Priezvisko
                  </label>
                  <input
                    type="text"
                    value={priezvisko}
                    onChange={(e) => setPriezvisko(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                  </div>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    Telefón
                  </div>
                </label>
                <input
                  type="tel"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="+421 ..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? "Ukladám..." : "Uložiť zmeny"}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" />
              Zmena hesla
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nové heslo
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Minimálne 6 znakov"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Potvrdiť heslo
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Zopakujte heslo"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 focus:ring-4 focus:ring-gray-200 transition-all disabled:opacity-50"
              >
                {passwordLoading ? "Mením heslo..." : "Zmeniť heslo"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
