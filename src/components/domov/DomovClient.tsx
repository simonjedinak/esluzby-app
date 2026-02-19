"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { format, addDays, subDays } from "date-fns";
import { sk } from "date-fns/locale";
import Link from "next/link";
import type {
  Profile,
  Tema,
  VeduciDna,
  DennyStav,
  DennyPozicia,
  TemaStav,
  ReporterStav,
  PoziciaTyp,
  TemaTyp,
  TemaKomentar,
} from "@/lib/types/database";
import { poziciaLabels, temaTypLabels } from "@/lib/types/database";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  MapPin,
  Pencil,
  Trash2,
  X,
  SlidersHorizontal,
  Send,
  RotateCcw,
  ArrowUpDown,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";

interface DomovClientProps {
  currentProfile: Profile;
  allProfiles: Profile[];
}

const POZICIA_ORDER: PoziciaTyp[] = [
  "veduci_dna",
  "producent_tn",
  "editor",
  "pomocny_editor",
  "produkcia_1",
  "produkcia_2",
  // "produkcia_3",
  "web_editor",
  "redaktor_tn_live",
];

export function DomovClient({ currentProfile, allProfiles }: DomovClientProps) {
  const [datum, setDatum] = useState(format(new Date(), "yyyy-MM-dd"));
  const [temy, setTemy] = useState<Tema[]>([]);
  const [veduciDna, setVeduciDna] = useState<VeduciDna[]>([]);
  const [denneStavy, setDenneStavy] = useState<DennyStav[]>([]);
  const [dennePozicie, setDennePozicie] = useState<DennyPozicia[]>([]);
  const [komentare, setKomentare] = useState<TemaKomentar[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [schvalovaniModal, setSchvalovaniModal] = useState<{
    tema: Tema;
    action: "schvalene" | "neschvalene";
  } | null>(null);
  const [editModal, setEditModal] = useState<Tema | null>(null);
  const [editNazov, setEditNazov] = useState("");
  const [editPopis, setEditPopis] = useState("");
  const [editMiesto, setEditMiesto] = useState("");
  const [editTyp, setEditTyp] = useState<TemaTyp>("reportaz");
  const [poznamka, setPoznamka] = useState("");
  const [stavLoading, setStavLoading] = useState(false);
  const [novyKomentar, setNovyKomentar] = useState<{
    temaId: string;
    text: string;
  } | null>(null);
  const [stavChangeModal, setStavChangeModal] = useState<{
    tema: Tema;
    newStav: TemaStav;
  } | null>(null);
  const [stavChangePoznamka, setStavChangePoznamka] = useState("");
  // Filters
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterStav, setFilterStav] = useState<string>("all");
  const [filterTemaStav, setFilterTemaStav] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  // Sorting
  const [sortMode, setSortMode] = useState<"alphabetical" | "region">(
    "alphabetical",
  );
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const scrollRestoreRef = useRef<number | null>(null);

  const isVeduci =
    currentProfile.rola === "veduci" || currentProfile.rola === "admin";
  const isVeduciDna = veduciDna.some((v) => v.veduci_id === currentProfile.id);

  // Restore scroll position synchronously after DOM update (before paint)
  useLayoutEffect(() => {
    if (scrollRestoreRef.current !== null) {
      window.scrollTo(0, scrollRestoreRef.current);
      scrollRestoreRef.current = null;
    }
  });

  const fetchData = useCallback(
    async (silent = false) => {
      if (silent) {
        scrollRestoreRef.current = window.scrollY;
      } else {
        setLoading(true);
      }

      const [temyRes, veduciRes, stavyRes, pozicieRes, komentareRes] =
        await Promise.all([
          supabase
            .from("temy")
            .select("*")
            .eq("datum", datum)
            .order("created_at"),
          supabase.from("veduci_dna").select("*").eq("datum", datum),
          supabase.from("denny_stav").select("*").eq("datum", datum),
          supabase.from("denny_pozicie").select("*").eq("datum", datum),
          supabase.from("tema_komentare").select("*").order("created_at"),
        ]);

      const temyData = (temyRes.data || []) as unknown as Tema[];
      const temaIds = temyData.map((t) => t.id);
      const filteredKomentare = (
        (komentareRes.data || []) as unknown as TemaKomentar[]
      ).filter((k) => temaIds.includes(k.tema_id));

      setTemy(temyData);
      setVeduciDna((veduciRes.data || []) as unknown as VeduciDna[]);
      setDenneStavy((stavyRes.data || []) as unknown as DennyStav[]);
      setDennePozicie((pozicieRes.data || []) as unknown as DennyPozicia[]);
      setKomentare(filteredKomentare);
      setLoading(false);
      setInitialLoad(false);
    },
    [datum, supabase],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProfile = (id: string) => allProfiles.find((p) => p.id === id);

  const getReporterStav = (reporterId: string): ReporterStav => {
    const stav = denneStavy.find((s) => s.reporter_id === reporterId);
    return stav?.stav || "pracujuci";
  };

  const getReporterTemy = (reporterId: string) => {
    return temy.filter((t) => t.reporter_id === reporterId);
  };

  const activeReporterIds = new Set([
    ...temy.map((t) => t.reporter_id),
    ...denneStavy.map((s) => s.reporter_id),
  ]);

  const reporters = allProfiles.filter(
    (p) => p.rola === "reporter" || activeReporterIds.has(p.id),
  );

  const sortedReporters = [...reporters].sort((a, b) => {
    const aActive = activeReporterIds.has(a.id);
    const bActive = activeReporterIds.has(b.id);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return a.priezvisko.localeCompare(b.priezvisko);
  });

  // Apply filters
  const filteredReporters = sortedReporters.filter((r) => {
    // Region filter
    if (filterRegion !== "all" && r.region !== filterRegion) return false;
    // Working status filter
    if (filterStav !== "all") {
      const stav = getReporterStav(r.id);
      if (stav !== filterStav) return false;
    }
    // Topic status filter
    if (filterTemaStav !== "all") {
      const rTemy = getReporterTemy(r.id);
      if (!rTemy.some((t) => t.stav === filterTemaStav)) return false;
    }
    return true;
  });

  // Unique regions for filter
  const uniqueRegions = [
    ...new Set(
      allProfiles.filter((p) => p.region).map((p) => p.region as string),
    ),
  ].sort();

  // Apply sorting — current user always on top
  const sortedFilteredReporters = [...filteredReporters].sort((a, b) => {
    if (a.id === currentProfile.id) return -1;
    if (b.id === currentProfile.id) return 1;
    if (sortMode === "region") {
      const currentRegion = currentProfile.region || "";
      const regionA = a.region || "";
      const regionB = b.region || "";
      // Current user's region always first
      const aIsCurrent = regionA === currentRegion;
      const bIsCurrent = regionB === currentRegion;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      const regionCmp = regionA.localeCompare(regionB);
      if (regionCmp !== 0) return regionCmp;
    }
    return a.priezvisko.localeCompare(b.priezvisko);
  });

  // Group reporters by region when sorting by region
  const reporterGroups: {
    region: string | null;
    reporters: typeof sortedFilteredReporters;
  }[] = [];
  if (sortMode === "region") {
    const groupMap = new Map<string, typeof sortedFilteredReporters>();
    for (const r of sortedFilteredReporters) {
      const key = r.region || "Bez regiónu";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(r);
    }
    // Current user's region first
    const currentRegionKey = currentProfile.region || "Bez regiónu";
    if (groupMap.has(currentRegionKey)) {
      reporterGroups.push({ region: currentRegionKey, reporters: groupMap.get(currentRegionKey)! });
    }
    for (const [region, reporters] of groupMap) {
      if (region === currentRegionKey) continue;
      reporterGroups.push({ region, reporters });
    }
  } else {
    reporterGroups.push({ region: null, reporters: sortedFilteredReporters });
  }

  const handleSchvalenie = async () => {
    if (!schvalovaniModal) return;
    setStavLoading(true);

    await supabase
      .from("temy")
      .update({
        stav: schvalovaniModal.action,
        schvalil_id: currentProfile.id,
      } as any)
      .eq("id", schvalovaniModal.tema.id);

    // Add comment if provided
    if (poznamka.trim()) {
      await supabase.from("tema_komentare").insert({
        tema_id: schvalovaniModal.tema.id,
        autor_id: currentProfile.id,
        text: poznamka.trim(),
      } as any);
    }

    setSchvalovaniModal(null);
    setPoznamka("");
    setStavLoading(false);
    fetchData(true);
  };

  const handleEditTema = async () => {
    if (!editModal) return;
    setStavLoading(true);

    const isReporterEdit =
      editModal.reporter_id === currentProfile.id &&
      currentProfile.rola === "reporter";
    const wasApproved =
      editModal.stav === "schvalene" || editModal.stav === "neschvalene";

    await supabase
      .from("temy")
      .update({
        nazov: editNazov,
        popis: editPopis || null,
        miesto: editMiesto || null,
        typ: editTyp,
        // Auto-revert to caka when reporter edits approved/rejected topic
        ...(isReporterEdit && wasApproved ? { stav: "caka" } : {}),
      } as any)
      .eq("id", editModal.id);

    setEditModal(null);
    setStavLoading(false);
    fetchData(true);
  };

  const handleDeleteTema = async (temaId: string) => {
    if (!confirm("Naozaj chcete zmazať túto tému?")) return;
    await supabase.from("temy").delete().eq("id", temaId);
    fetchData(true);
  };

  const openEditModal = (tema: Tema) => {
    setEditNazov(tema.nazov);
    setEditPopis(tema.popis || "");
    setEditMiesto(tema.miesto || "");
    setEditTyp(tema.typ || "reportaz");
    setEditModal(tema);
  };

  const handleAddKomentar = async (temaId: string, text: string) => {
    if (!text.trim()) return;
    await supabase.from("tema_komentare").insert({
      tema_id: temaId,
      autor_id: currentProfile.id,
      text: text.trim(),
    } as any);
    setNovyKomentar(null);
    fetchData(true);
  };

  const handleStavChange = async () => {
    if (!stavChangeModal) return;
    setStavLoading(true);

    await supabase
      .from("temy")
      .update({
        stav: stavChangeModal.newStav,
        schvalil_id: currentProfile.id,
      } as any)
      .eq("id", stavChangeModal.tema.id);

    if (stavChangePoznamka.trim()) {
      await supabase.from("tema_komentare").insert({
        tema_id: stavChangeModal.tema.id,
        autor_id: currentProfile.id,
        text: stavChangePoznamka.trim(),
      } as any);
    }

    setStavChangeModal(null);
    setStavChangePoznamka("");
    setStavLoading(false);
    fetchData(true);
  };

  const getKomentareForTema = (temaId: string) => {
    return komentare.filter((k) => k.tema_id === temaId);
  };

  const handleReporterStav = async (reporterId: string, stav: ReporterStav) => {
    const existing = denneStavy.find((s) => s.reporter_id === reporterId);

    if (existing) {
      await supabase
        .from("denny_stav")
        .update({ stav, nastavil_id: currentProfile.id } as any)
        .eq("id", existing.id);
    } else {
      await supabase.from("denny_stav").insert({
        reporter_id: reporterId,
        datum,
        stav,
        nastavil_id: currentProfile.id,
      } as any);
    }

    fetchData(true);
  };

  const handleSetPozicia = async (
    pozicia: PoziciaTyp,
    profileId: string | "",
  ) => {
    const existing = dennePozicie.find((p) => p.pozicia === pozicia);
    if (existing) {
      await supabase.from("denny_pozicie").delete().eq("id", existing.id);
    }
    if (profileId) {
      await supabase.from("denny_pozicie").insert({
        datum,
        profile_id: profileId,
        pozicia,
      } as any);
    }
    fetchData(true);
  };

  const stavConfig: Record<
    TemaStav,
    { label: string; color: string; icon: typeof CheckCircle }
  > = {
    schvalene: {
      label: "Schválené",
      color: "bg-green-100 text-green-700 border-green-200",
      icon: CheckCircle,
    },
    caka: {
      label: "Čaká",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: Clock,
    },
    neschvalene: {
      label: "Neschválené",
      color: "bg-red-100 text-red-700 border-red-200",
      icon: XCircle,
    },
  };

  const reporterStavConfig: Record<
    ReporterStav,
    {
      label: string;
      color: string;
      dot: string;
      hoverBorder: string;
      hoverBg: string;
    }
  > = {
    pracujuci: {
      label: "Pracujúci",
      color: "text-green-700",
      dot: "bg-green-500",
      hoverBorder: "hover:border-green-600/30",
      hoverBg: "hover:bg-green-500/10",
    },
    nepracujuci: {
      label: "Nepracujúci",
      color: "text-red-700",
      dot: "bg-red-500",
      hoverBorder: "hover:border-red-600/30",
      hoverBg: "hover:bg-red-500/10",
    },
    volno: {
      label: "Voľno",
      color: "text-gray-500",
      dot: "bg-gray-400",
      hoverBorder: "hover:border-gray-600/30",
      hoverBg: "hover:bg-gray-400/20",
    },
  };

  const formattedDate = format(
    new Date(datum + "T12:00:00"),
    "EE, d. MMM yyyy",
    { locale: sk },
  );

  const todayIso = format(new Date(), "yyyy-MM-dd");
  const tomorrowIso = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const isTodaySelected = datum === todayIso;
  const isTomorrowSelected = datum === tomorrowIso;

  const getPoziciaProfile = (pozicia: PoziciaTyp): Profile | undefined => {
    const assignment = dennePozicie.find((p) => p.pozicia === pozicia);
    return assignment ? getProfile(assignment.profile_id) : undefined;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Date Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 flex flex-col justify-between lg:w-72">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() =>
                setDatum(
                  format(
                    subDays(new Date(datum + "T12:00:00"), 1),
                    "yyyy-MM-dd",
                  ),
                )
              }
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <button
              onClick={() =>
                setDatum(
                  format(
                    addDays(new Date(datum + "T12:00:00"), 1),
                    "yyyy-MM-dd",
                  ),
                )
              }
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-30">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 capitalize mb-2">
              {formattedDate}
            </h2>
            <DatePicker value={datum} onChange={setDatum} className="mt-2" />
          </div>

          <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={() => setDatum(format(new Date(), "yyyy-MM-dd"))}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                isTodaySelected
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Dnes
            </button>
            <button
              onClick={() =>
                setDatum(format(addDays(new Date(), 1), "yyyy-MM-dd"))
              }
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                isTomorrowSelected
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Zajtra
            </button>
          </div>
        </div>
        {/* Leaders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 py-2 sm:py-3">
          <div className="flex flex-col md:flex-row h-full">
            {/* First Column */}
            <div className="flex-1 flex flex-col divide-y divide-gray-50">
              {POZICIA_ORDER.slice(0, 4).map((pozicia) => {
                const assignedProfile = getPoziciaProfile(pozicia);
                return (
                  <div
                    key={pozicia}
                    className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 even:bg-gray-50 transition-colors gap-1 sm:gap-2"
                  >
                    <span className="text-xs sm:text-sm font-medium text-gray-600 sm:w-32 lg:w-40 shrink-0">
                      {poziciaLabels[pozicia]}
                    </span>
                    <div className="flex items-center gap-2 w-full sm:flex-1 justify-start sm:justify-end">
                      {isVeduci ? (
                        <select
                          value={assignedProfile?.id || ""}
                          onChange={(e) =>
                            handleSetPozicia(pozicia, e.target.value)
                          }
                          className="text-xs sm:text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-200 text-gray-700 w-full sm:max-w-50"
                        >
                          <option value="">— Neobsadené —</option>
                          {allProfiles
                            .filter((p) => p.rola !== "reporter")
                            .sort((a, b) =>
                              a.priezvisko.localeCompare(b.priezvisko),
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.priezvisko} {p.meno}
                              </option>
                            ))}
                        </select>
                      ) : assignedProfile ? (
                        <Link
                          href={`/profil?user=${assignedProfile.id}`}
                          className="group flex items-center gap-2 no-underline rounded-lg px-1 py-1 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 hover:underline">
                            {assignedProfile.priezvisko} {assignedProfile.meno}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-400 italic">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Vertical Divider */}
            <div className="w-full md:w-px h-px md:h-full bg-gray-100" />
            {/* Second Column */}
            <div className="flex-1 flex flex-col divide-y divide-gray-50">
              {POZICIA_ORDER.slice(4).map((pozicia) => {
                const assignedProfile = getPoziciaProfile(pozicia);
                return (
                  <div
                    key={pozicia}
                    className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 even:bg-gray-50 transition-colors gap-1 sm:gap-2"
                  >
                    <span className="text-xs sm:text-sm font-medium text-gray-600 sm:w-32 lg:w-40 shrink-0">
                      {poziciaLabels[pozicia]}
                    </span>
                    <div className="flex items-center gap-2 w-full sm:flex-1 justify-start sm:justify-end">
                      {isVeduci ? (
                        <select
                          value={assignedProfile?.id || ""}
                          onChange={(e) =>
                            handleSetPozicia(pozicia, e.target.value)
                          }
                          className="text-xs sm:text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-200 text-gray-700 w-full sm:max-w-50"
                        >
                          <option value="">— Neobsadené —</option>
                          {allProfiles
                            .filter((p) => p.rola !== "reporter")
                            .sort((a, b) =>
                              a.priezvisko.localeCompare(b.priezvisko),
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.priezvisko} {p.meno}
                              </option>
                            ))}
                        </select>
                      ) : assignedProfile ? (
                        <Link
                          href={`/profil?user=${assignedProfile.id}`}
                          className="group flex items-center gap-2 no-underline rounded-lg px-1 py-1 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-xs sm:text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 hover:underline">
                            {assignedProfile.priezvisko} {assignedProfile.meno}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-400 italic">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reporters & Themes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Reportéri a témy</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {sortedFilteredReporters.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setSortMode(
                  sortMode === "alphabetical" ? "region" : "alphabetical",
                )
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                sortMode === "region"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortMode === "region" ? "Podľa regiónu" : "Abecedne"}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showFilters ||
                filterRegion !== "all" ||
                filterStav !== "all" ||
                filterTemaStav !== "all"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Region */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Región
                </label>
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 text-gray-700"
                >
                  <option value="all">Všetky regióny</option>
                  {uniqueRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Working status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Stav
                </label>
                <select
                  value={filterStav}
                  onChange={(e) => setFilterStav(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 text-gray-700"
                >
                  <option value="all">Všetky stavy</option>
                  <option value="pracujuci">Pracujúci</option>
                  <option value="nepracujuci">Nepracujúci</option>
                  <option value="volno">Voľno</option>
                </select>
              </div>

              {/* Topic status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Témy
                </label>
                <select
                  value={filterTemaStav}
                  onChange={(e) => setFilterTemaStav(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 text-gray-700"
                >
                  <option value="all">Všetky témy</option>
                  <option value="caka">Čaká na schválenie</option>
                  <option value="schvalene">Schválené</option>
                  <option value="neschvalene">Neschválené</option>
                </select>
              </div>
            </div>
            {(filterRegion !== "all" ||
              filterStav !== "all" ||
              filterTemaStav !== "all") && (
              <button
                onClick={() => {
                  setFilterRegion("all");
                  setFilterStav("all");
                  setFilterTemaStav("all");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Zrušiť filtre
              </button>
            )}
          </div>
        )}

        {initialLoad ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className={`space-y-3 transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {reporterGroups.map((group) => (
              <div key={group.region || "all"} className="space-y-3">
                {sortMode === "region" && group.region && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                      {group.region}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}
                {group.reporters.map((reporter) => {
                  const reporterTemy = getReporterTemy(reporter.id);
                  const stav = getReporterStav(reporter.id);
                  const stavInfo = reporterStavConfig[stav];
                  const isCurrentUser = reporter.id === currentProfile.id;

                  return (
                    <div
                      key={reporter.id}
                      className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative transition-all ${
                        isCurrentUser
                          ? "border-blue-200 ring-1 ring-blue-100"
                          : "border-gray-100"
                      }`}
                    >
                      {reporterTemy.length === 0 ? (
                        /* Compact: no topics - single line */
                        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
                          <Link
                            href={`/profil?user=${reporter.id}`}
                            className="group flex items-center gap-2.5 no-underline hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                isCurrentUser
                                  ? "bg-blue-100 text-blue-700"
                                  : stav === "nepracujuci"
                                    ? "bg-red-100 text-red-700"
                                    : stav === "volno"
                                      ? "bg-gray-100 text-gray-500"
                                      : "bg-green-100 text-green-700"
                              }`}
                            >
                              {reporter.meno[0]}
                              {reporter.priezvisko[0]}
                            </div>
                            <span className="font-medium text-sm text-gray-900 group-hover:text-blue-600">
                              {reporter.priezvisko} {reporter.meno}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                                Vy
                              </span>
                            )}
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${stavInfo.dot}`}
                            />
                            <span
                              className={`text-xs font-medium ${stavInfo.color}`}
                            >
                              {stavInfo.label}
                            </span>
                            {reporter.telefon && (
                              <span className="text-xs text-gray-400 ml-1">
                                {reporter.telefon}
                              </span>
                            )}
                          </Link>
                          {isVeduci && (
                            <div className="flex items-center gap-1">
                              {(
                                [
                                  "pracujuci",
                                  "nepracujuci",
                                  "volno",
                                ] as ReporterStav[]
                              ).map((s) => {
                                const cfg = reporterStavConfig[s];
                                return (
                                  <button
                                    key={s}
                                    onClick={() =>
                                      handleReporterStav(reporter.id, s)
                                    }
                                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                      stav === s
                                        ? `${cfg.dot} border-transparent scale-110`
                                        : `border-gray-300 ${cfg.hoverBorder} ${cfg.hoverBg} hover:scale-115`
                                    }`}
                                    title={cfg.label}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={
                            reporterTemy.length === 1
                              ? `flex flex-col md:flex-row ${isVeduci ? "pr-4" : "pr-0.5"}`
                              : ""
                          }
                        >
                          {/* Reporter Header */}
                          <div
                            className={`flex items-center justify-between p-3 sm:p-4 ${
                              reporterTemy.length === 1
                                ? "md:border-r md:border-b-0 border-b border-gray-50 shrink-0"
                                : "border-b border-gray-50"
                            }`}
                          >
                            <Link
                              href={`/profil?user=${reporter.id}`}
                              className="group flex items-center gap-3 no-underline rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                                  isCurrentUser
                                    ? "bg-blue-100 text-blue-700"
                                    : stav === "nepracujuci"
                                      ? "bg-red-100 text-red-700"
                                      : stav === "volno"
                                        ? "bg-gray-100 text-gray-500"
                                        : "bg-green-100 text-green-700"
                                }`}
                              >
                                {reporter.meno[0]}
                                {reporter.priezvisko[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[17px] text-gray-900 transition-colors group-hover:text-blue-600">
                                    {reporter.priezvisko} {reporter.meno}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                                      Vy
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div
                                    className={`w-2 h-2 rounded-full ${stavInfo.dot}`}
                                  />
                                  <span
                                    className={`text-xs font-medium ${stavInfo.color}`}
                                  >
                                    {stavInfo.label}
                                  </span>
                                  {reporter.telefon && (
                                    <span className="text-xs text-gray-400 ml-2">
                                      {reporter.telefon}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>

                            {isVeduci && reporterTemy.length !== 1 && (
                              <div className="flex items-center gap-1">
                                {(
                                  [
                                    "pracujuci",
                                    "nepracujuci",
                                    "volno",
                                  ] as ReporterStav[]
                                ).map((s) => {
                                  const cfg = reporterStavConfig[s];
                                  return (
                                    <button
                                      key={s}
                                      onClick={() =>
                                        handleReporterStav(reporter.id, s)
                                      }
                                      className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                        stav === s
                                          ? `${cfg.dot} border-transparent scale-110`
                                          : `border-gray-300 ${cfg.hoverBorder} ${cfg.hoverBg} hover:scale-115`
                                      }`}
                                      title={cfg.label}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Themes */}
                          <div
                            className={
                              reporterTemy.length === 1
                                ? "flex-1 p-3 sm:p-4"
                                : "p-4"
                            }
                          >
                            <div
                              className={
                                reporterTemy.length > 1 ? "space-y-2" : ""
                              }
                            >
                              {reporterTemy.map((tema) => {
                                const stavI = stavConfig[tema.stav];
                                const StavIcon = stavI.icon;
                                const canEdit =
                                  tema.reporter_id === currentProfile.id ||
                                  currentProfile.rola === "admin";
                                const canChangeStav =
                                  isVeduciDna ||
                                  currentProfile.rola === "admin";
                                const temaKomentare = getKomentareForTema(
                                  tema.id,
                                );
                                return (
                                  <div
                                    key={tema.id}
                                    className={`p-3 rounded-xl border ${stavI.color}`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <StavIcon className="w-4 h-4 shrink-0" />
                                          <span className="font-medium text-sm">
                                            {tema.nazov}
                                          </span>
                                          {tema.typ &&
                                            tema.typ !== "reportaz" && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/50 font-medium">
                                                {temaTypLabels[tema.typ]}
                                              </span>
                                            )}
                                        </div>
                                        {tema.popis && (
                                          <p className="text-xs mt-1 ml-6 opacity-80">
                                            {tema.popis}
                                          </p>
                                        )}
                                        {tema.miesto && (
                                          <div className="flex items-center gap-1 mt-1 ml-6">
                                            <MapPin className="w-3 h-3 opacity-60" />
                                            <span className="text-xs opacity-80">
                                              {tema.miesto}
                                            </span>
                                          </div>
                                        )}
                                        {/* Legacy single comment */}
                                        {tema.poznamka_veduceho && (
                                          <div className="flex items-start gap-1.5 mt-2 ml-6">
                                            <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                            <p className="text-xs italic opacity-80">
                                              {tema.poznamka_veduceho}
                                            </p>
                                          </div>
                                        )}
                                        {/* Multiple comments */}
                                        {temaKomentare.length > 0 && (
                                          <div className="mt-2 ml-6 space-y-1.5">
                                            {temaKomentare.map((kom) => {
                                              const autor = getProfile(
                                                kom.autor_id,
                                              );
                                              return (
                                                <div
                                                  key={kom.id}
                                                  className="flex items-start gap-1.5"
                                                >
                                                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                                  <div className="text-xs">
                                                    <span className="font-medium opacity-90">
                                                      {autor
                                                        ? `${autor.priezvisko} ${autor.meno}`
                                                        : "Neznámy"}
                                                      :
                                                    </span>{" "}
                                                    <span className="italic opacity-80">
                                                      {kom.text}
                                                    </span>
                                                    <span className="text-[10px] opacity-50 ml-1">
                                                      {format(
                                                        new Date(
                                                          kom.created_at,
                                                        ),
                                                        "d.M. HH:mm",
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {/* Inline comment input */}
                                        {canChangeStav &&
                                          novyKomentar?.temaId === tema.id && (
                                            <div className="flex items-center gap-1.5 mt-2 ml-6">
                                              <input
                                                type="text"
                                                value={novyKomentar.text}
                                                onChange={(e) =>
                                                  setNovyKomentar({
                                                    temaId: tema.id,
                                                    text: e.target.value,
                                                  })
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    handleAddKomentar(
                                                      tema.id,
                                                      novyKomentar.text,
                                                    );
                                                  }
                                                  if (e.key === "Escape") {
                                                    setNovyKomentar(null);
                                                  }
                                                }}
                                                placeholder="Napíšte komentár..."
                                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-300 text-gray-900 placeholder-gray-400 bg-white/80"
                                                autoFocus
                                              />
                                              <button
                                                onClick={() =>
                                                  handleAddKomentar(
                                                    tema.id,
                                                    novyKomentar.text,
                                                  )
                                                }
                                                className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                                                title="Odoslať"
                                              >
                                                <Send className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setNovyKomentar(null)
                                                }
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/50 transition-colors"
                                                title="Zrušiť"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                      </div>

                                      <div className="flex items-center gap-1 ml-2 shrink-0">
                                        {canEdit && (
                                          <button
                                            onClick={() => openEditModal(tema)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                                            title="Upraviť"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {canEdit && (
                                          <button
                                            onClick={() =>
                                              handleDeleteTema(tema.id)
                                            }
                                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                                            title="Zmazať"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {/* Add comment button */}
                                        {canChangeStav &&
                                          novyKomentar?.temaId !== tema.id && (
                                            <button
                                              onClick={() =>
                                                setNovyKomentar({
                                                  temaId: tema.id,
                                                  text: "",
                                                })
                                              }
                                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                                              title="Pridať komentár"
                                            >
                                              <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        {/* Status change buttons for admin/veduci_dna */}
                                        {canChangeStav &&
                                          tema.stav === "caka" && (
                                            <>
                                              <button
                                                onClick={() =>
                                                  setSchvalovaniModal({
                                                    tema,
                                                    action: "schvalene",
                                                  })
                                                }
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-200 hover:bg-green-300 text-green-800 transition-colors"
                                                title="Schváliť"
                                              >
                                                <CheckCircle className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setSchvalovaniModal({
                                                    tema,
                                                    action: "neschvalene",
                                                  })
                                                }
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-200 hover:bg-red-300 text-red-800 transition-colors"
                                                title="Neschváliť"
                                              >
                                                <XCircle className="w-4 h-4" />
                                              </button>
                                            </>
                                          )}
                                        {/* Status change for already approved/rejected */}
                                        {canChangeStav &&
                                          tema.stav !== "caka" && (
                                            <button
                                              onClick={() =>
                                                setStavChangeModal({
                                                  tema,
                                                  newStav:
                                                    tema.stav === "schvalene"
                                                      ? "neschvalene"
                                                      : "schvalene",
                                                })
                                              }
                                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                                tema.stav === "schvalene"
                                                  ? "bg-red-200 hover:bg-red-300 text-red-800"
                                                  : "bg-green-200 hover:bg-green-300 text-green-800"
                                              }`}
                                              title={
                                                tema.stav === "schvalene"
                                                  ? "Zmeniť na neschválené"
                                                  : "Zmeniť na schválené"
                                              }
                                            >
                                              {tema.stav === "schvalene" ? (
                                                <XCircle className="w-4 h-4" />
                                              ) : (
                                                <CheckCircle className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                        {/* Reset to caka */}
                                        {canChangeStav &&
                                          tema.stav !== "caka" && (
                                            <button
                                              onClick={() =>
                                                setStavChangeModal({
                                                  tema,
                                                  newStav: "caka",
                                                })
                                              }
                                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-yellow-200 hover:bg-yellow-300 text-yellow-800 transition-colors"
                                              title="Vrátiť na čakajúcu"
                                            >
                                              <RotateCcw className="w-4 h-4" />
                                            </button>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Ensure reporter-level status buttons sit on the right for single-theme rows */}
                          {isVeduci && reporterTemy.length === 1 && (
                            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 md:static md:ml-2 ml-0 shrink-0">
                              {(
                                [
                                  "pracujuci",
                                  "nepracujuci",
                                  "volno",
                                ] as ReporterStav[]
                              ).map((s) => {
                                const cfg = reporterStavConfig[s];
                                return (
                                  <button
                                    key={s}
                                    onClick={() =>
                                      handleReporterStav(reporter.id, s)
                                    }
                                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                      stav === s
                                        ? `${cfg.dot} border-transparent scale-110`
                                        : `border-gray-300 ${cfg.hoverBorder} ${cfg.hoverBg} hover:scale-115`
                                    }`}
                                    title={cfg.label}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schvalovanie Modal */}
      {schvalovaniModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {schvalovaniModal.action === "schvalene"
                ? "Schváliť tému"
                : "Neschváliť tému"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Téma:{" "}
              <span className="font-medium text-gray-700">
                {schvalovaniModal.tema.nazov}
              </span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Poznámka (voliteľné)
              </label>
              <textarea
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 placeholder-gray-400 resize-none"
                rows={3}
                placeholder={
                  schvalovaniModal.action === "neschvalene"
                    ? "Dôvod neschválenia..."
                    : "Poznámka k schváleniu..."
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSchvalovaniModal(null);
                  setPoznamka("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSchvalenie}
                disabled={stavLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  schvalovaniModal.action === "schvalene"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {stavLoading
                  ? "Ukladám..."
                  : schvalovaniModal.action === "schvalene"
                    ? "Schváliť"
                    : "Neschváliť"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tema Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Upraviť tému
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ
                </label>
                <select
                  value={editTyp}
                  onChange={(e) => setEditTyp(e.target.value as TemaTyp)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900"
                >
                  {(Object.keys(temaTypLabels) as TemaTyp[]).map((key) => (
                    <option key={key} value={key}>
                      {temaTypLabels[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Názov
                </label>
                <input
                  type="text"
                  value={editNazov}
                  onChange={(e) => setEditNazov(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Miesto
                </label>
                <input
                  type="text"
                  value={editMiesto}
                  onChange={(e) => setEditMiesto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900"
                  placeholder="Mesto alebo oblasť"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Popis
                </label>
                <textarea
                  value={editPopis}
                  onChange={(e) => setEditPopis(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleEditTema}
                disabled={stavLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {stavLoading ? "Ukladám..." : "Uložiť"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal (for already approved/rejected topics) */}
      {stavChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Zmeniť stav témy
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              Téma:{" "}
              <span className="font-medium text-gray-700">
                {stavChangeModal.tema.nazov}
              </span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nový stav
              </label>
              <select
                value={stavChangeModal.newStav}
                onChange={(e) =>
                  setStavChangeModal({
                    ...stavChangeModal,
                    newStav: e.target.value as TemaStav,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900"
              >
                <option value="caka">Čaká na schválenie</option>
                <option value="schvalene">Schválené</option>
                <option value="neschvalene">Neschválené</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Komentár (voliteľné)
              </label>
              <textarea
                value={stavChangePoznamka}
                onChange={(e) => setStavChangePoznamka(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 placeholder-gray-400 resize-none"
                rows={3}
                placeholder="Dôvod zmeny stavu..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStavChangeModal(null);
                  setStavChangePoznamka("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleStavChange}
                disabled={stavLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {stavLoading ? "Ukladám..." : "Zmeniť stav"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
