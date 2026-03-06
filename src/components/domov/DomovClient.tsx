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
  Volno,
} from "@/lib/types/database";
import {
  poziciaLabels,
  temaTypLabels,
  hasRole,
  canEditTable,
  canApproveTopics,
  canChangeReporterStatus,
  isOnlyReporter,
  rolaLabels,
  rolaColors,
  getProfilesForPozicia,
} from "@/lib/types/database";
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
  Send,
  RotateCcw,
  PlusCircle,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { NovaTemaModal } from "@/components/nova-tema/NovaTemaModal";

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
  "web_editor",
  "redaktor_tn_live",
];

export function DomovClient({
  currentProfile,
  allProfiles: initialAllProfiles,
}: DomovClientProps) {
  const [datum, setDatum] = useState(format(new Date(), "yyyy-MM-dd"));
  const [allProfiles, setAllProfiles] = useState<Profile[]>(initialAllProfiles);
  const [temy, setTemy] = useState<Tema[]>([]);
  const [veduciDna, setVeduciDna] = useState<VeduciDna[]>([]);
  const [denneStavy, setDenneStavy] = useState<DennyStav[]>([]);
  const [dennePozicie, setDennePozicie] = useState<DennyPozicia[]>([]);
  const [komentare, setKomentare] = useState<TemaKomentar[]>([]);
  const [schvaleneVolna, setSchvaleneVolna] = useState<Volno[]>([]);
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
  const [editDatum, setEditDatum] = useState("");
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
  // Filters — load saved values from localStorage
  const [filterRegion, setFilterRegionRaw] = useState<
    "vsetci" | "bratislavski" | "regionalny"
  >("vsetci");
  const [filterStav, setFilterStavRaw] = useState<
    "all" | "pracujuci" | "nepracujuci" | "volno"
  >("all");
  const [cakajuceNaVrch, setCakajuceNaVrchRaw] = useState(true);
  const [ulozitFiltre, setUlozitFiltreRaw] = useState(false);
  const filtersInitialized = useRef(false);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ejano_filtre");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ulozene) {
          if (parsed.filterRegion) setFilterRegionRaw(parsed.filterRegion);
          if (parsed.filterStav) setFilterStavRaw(parsed.filterStav);
          if (typeof parsed.cakajuceNaVrch === "boolean")
            setCakajuceNaVrchRaw(parsed.cakajuceNaVrch);
          setUlozitFiltreRaw(true);
        }
      }
    } catch {
      // ignore
    }
    filtersInitialized.current = true;
  }, []);

  // Persist filters to localStorage when they change
  useEffect(() => {
    if (!filtersInitialized.current) return;
    if (ulozitFiltre) {
      localStorage.setItem(
        "ejano_filtre",
        JSON.stringify({
          ulozene: true,
          filterRegion,
          filterStav,
          cakajuceNaVrch,
        }),
      );
    }
  }, [ulozitFiltre, filterRegion, filterStav, cakajuceNaVrch]);

  const setFilterRegion = (v: typeof filterRegion) => {
    setFilterRegionRaw(v);
  };
  const setFilterStav = (v: typeof filterStav) => {
    setFilterStavRaw(v);
  };
  const setCakajuceNaVrch = (v: boolean) => {
    setCakajuceNaVrchRaw(v);
  };
  const setUlozitFiltre = (v: boolean) => {
    setUlozitFiltreRaw(v);
    if (!v) {
      localStorage.removeItem("ejano_filtre");
    }
  };
  // Nova tema modal
  const [showNovaTema, setShowNovaTema] = useState(false);
  const [novaTemaForReporter, setNovaTemaForReporter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // Expanded popis state
  const [expandedPopis, setExpandedPopis] = useState<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const scrollRestoreRef = useRef<number | null>(null);

  const isVeduci = canEditTable(currentProfile);
  const canSetReporterStatus = canChangeReporterStatus(currentProfile);
  const isVeduciDna = veduciDna.some((v) => v.veduci_id === currentProfile.id);
  const canAddForOthers = canApproveTopics(currentProfile);

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

      const [
        temyRes,
        veduciRes,
        stavyRes,
        pozicieRes,
        komentareRes,
        volnaRes,
        profilesRes,
      ] = await Promise.all([
        supabase
          .from("temy")
          .select("*")
          .eq("datum", datum)
          .order("created_at"),
        supabase.from("veduci_dna").select("*").eq("datum", datum),
        supabase.from("denny_stav").select("*").eq("datum", datum),
        supabase.from("denny_pozicie").select("*").eq("datum", datum),
        supabase.from("tema_komentare").select("*").order("created_at"),
        supabase
          .from("volna")
          .select("*")
          .eq("stav", "schvalene")
          .lte("datum_od", datum)
          .gte("datum_do", datum),
        supabase.from("profiles").select("*").order("priezvisko"),
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
      setSchvaleneVolna((volnaRes.data || []) as unknown as Volno[]);
      if (profilesRes.data)
        setAllProfiles(profilesRes.data as unknown as Profile[]);
      setLoading(false);
      setInitialLoad(false);
    },
    [datum, supabase],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions — Supabase handles WebSockets server-side, no cost to hosting
  useEffect(() => {
    const channel = supabase
      .channel(`domov-${datum}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "temy",
          filter: `datum=eq.${datum}`,
        },
        () => fetchData(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "veduci_dna",
          filter: `datum=eq.${datum}`,
        },
        () => fetchData(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "denny_stav",
          filter: `datum=eq.${datum}`,
        },
        () => fetchData(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "denny_pozicie",
          filter: `datum=eq.${datum}`,
        },
        () => fetchData(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tema_komentare" },
        () => fetchData(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "volna" },
        () => fetchData(true),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [datum, supabase, fetchData]);

  // On mobile the WebSocket drops when the app goes to background.
  // Refetch as soon as the tab/app becomes visible again or network reconnects.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    };
    const handleOnline = () => fetchData(true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchData]);

  const getProfile = (id: string) => allProfiles.find((p) => p.id === id);

  const getReporterStav = (reporterId: string): ReporterStav => {
    // Approved leave overrides the manually-set daily status
    const hasApprovedLeave = schvaleneVolna.some(
      (v) => v.reporter_id === reporterId,
    );
    if (hasApprovedLeave) return "volno";
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
    (p) =>
      hasRole(p, "reporter") ||
      isOnlyReporter(p) ||
      activeReporterIds.has(p.id),
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
    if (filterRegion === "bratislavski" && r.je_regionalny) return false;
    if (filterRegion === "regionalny" && !r.je_regionalny) return false;
    // Working status filter
    if (filterStav !== "all") {
      const stav = getReporterStav(r.id);
      if (stav !== filterStav) return false;
    }
    return true;
  });

  // Apply sorting — current user always first, then čakajúce hore, then alphabetical
  const sortedFilteredReporters = [...filteredReporters].sort((a, b) => {
    // Current user always first
    if (a.id === currentProfile.id) return -1;
    if (b.id === currentProfile.id) return 1;
    // Čakajúce hore: reporters with pending topics first
    if (cakajuceNaVrch) {
      const aHasCaka = getReporterTemy(a.id).some((t) => t.stav === "caka");
      const bHasCaka = getReporterTemy(b.id).some((t) => t.stav === "caka");
      if (aHasCaka && !bHasCaka) return -1;
      if (!aHasCaka && bHasCaka) return 1;
    }
    // Alphabetical
    return a.priezvisko.localeCompare(b.priezvisko);
  });

  // Simple flat list (no region grouping)
  const reporterGroups: {
    region: string | null;
    reporters: typeof sortedFilteredReporters;
  }[] = [{ region: null, reporters: sortedFilteredReporters }];

  const handleSchvalenie = async () => {
    if (!schvalovaniModal) return;
    setStavLoading(true);

    const { tema, action } = schvalovaniModal;

    await supabase
      .from("temy")
      .update({
        stav: action,
        schvalil_id: currentProfile.id,
      } as any)
      .eq("id", tema.id);

    // Add comment if provided
    if (poznamka.trim()) {
      await supabase.from("tema_komentare").insert({
        tema_id: tema.id,
        autor_id: currentProfile.id,
        text: poznamka.trim(),
      } as any);
    }

    // Send email notification to the reporter
    const reporter = getProfile(tema.reporter_id);
    if (reporter && reporter.email && reporter.id !== currentProfile.id) {
      fetch("/api/email/tema-stav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temaId: tema.id,
          temaNazov: tema.nazov,
          temaDatum: tema.datum,
          reporterEmail: reporter.email,
          reporterMeno: `${reporter.meno} ${reporter.priezvisko}`,
          novyStav: action,
          zmenilMeno: `${currentProfile.meno} ${currentProfile.priezvisko}`,
          poznamka: poznamka.trim() || null,
        }),
      }).catch((e) => console.error("Email error:", e));
    }

    setSchvalovaniModal(null);
    setPoznamka("");
    setStavLoading(false);
    fetchData(true);
  };

  const handleEditTema = async () => {
    if (!editModal) return;
    const isReporterEdit =
      editModal.reporter_id === currentProfile.id &&
      isOnlyReporter(currentProfile);
    setStavLoading(true);

    const wasApproved =
      editModal.stav === "schvalene" || editModal.stav === "neschvalene";

    await supabase
      .from("temy")
      .update({
        nazov: editNazov,
        popis: editPopis || null,
        miesto: editMiesto || null,
        typ: editTyp,
        datum: editDatum,
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
    setEditDatum(tema.datum);
    setEditModal(tema);
  };

  const handleAddKomentar = async (temaId: string, text: string) => {
    if (!text.trim()) return;
    await supabase.from("tema_komentare").insert({
      tema_id: temaId,
      autor_id: currentProfile.id,
      text: text.trim(),
    } as any);

    // Send email notification to the reporter (only if someone else commented)
    const tema = temy.find((t) => t.id === temaId);
    if (tema) {
      const reporter = getProfile(tema.reporter_id);
      if (reporter && reporter.email && reporter.id !== currentProfile.id) {
        fetch("/api/email/tema-komentar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            temaId: tema.id,
            temaNazov: tema.nazov,
            temaDatum: tema.datum,
            reporterEmail: reporter.email,
            reporterMeno: `${reporter.meno} ${reporter.priezvisko}`,
            autorMeno: `${currentProfile.meno} ${currentProfile.priezvisko}`,
            komentar: text.trim(),
          }),
        }).catch((e) => console.error("Email error:", e));
      }
    }

    setNovyKomentar(null);
    fetchData(true);
  };

  const handleStavChange = async () => {
    if (!stavChangeModal) return;
    setStavLoading(true);

    const { tema, newStav } = stavChangeModal;

    await supabase
      .from("temy")
      .update({
        stav: newStav,
        schvalil_id: currentProfile.id,
      } as any)
      .eq("id", tema.id);

    if (stavChangePoznamka.trim()) {
      await supabase.from("tema_komentare").insert({
        tema_id: tema.id,
        autor_id: currentProfile.id,
        text: stavChangePoznamka.trim(),
      } as any);
    }

    // Send email notification to the reporter
    const reporter = getProfile(tema.reporter_id);
    if (reporter && reporter.email && reporter.id !== currentProfile.id) {
      fetch("/api/email/tema-stav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temaId: tema.id,
          temaNazov: tema.nazov,
          temaDatum: tema.datum,
          reporterEmail: reporter.email,
          reporterMeno: `${reporter.meno} ${reporter.priezvisko}`,
          novyStav: newStav,
          zmenilMeno: `${currentProfile.meno} ${currentProfile.priezvisko}`,
          poznamka: stavChangePoznamka.trim() || null,
        }),
      }).catch((e) => console.error("Email error:", e));
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
      label: "Pracuje",
      color: "text-green-700",
      dot: "bg-green-500",
      hoverBorder: "hover:border-green-600/30",
      hoverBg: "hover:bg-green-500/10",
    },
    nepracujuci: {
      label: "Nepracuje",
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
        <div className="bg-white justify-between items-center rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col lg:w-56">
          {/* Day name + arrows row */}
          <div className="flex w-full items-center justify-between">
            <button
              onClick={() =>
                setDatum(
                  format(
                    subDays(new Date(datum + "T12:00:00"), 1),
                    "yyyy-MM-dd",
                  ),
                )
              }
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-bold text-md mt-0.5 text-gray-900 capitalize">
              {format(new Date(datum + "T12:00:00"), "EEEE", { locale: sk })}
            </span>
            <button
              onClick={() =>
                setDatum(
                  format(
                    addDays(new Date(datum + "T12:00:00"), 1),
                    "yyyy-MM-dd",
                  ),
                )
              }
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Big date number + month — clickable to open calendar */}
          <DatePicker value={datum} onChange={setDatum}>
            {({ ref, toggle }) => (
              <button
                ref={ref}
                onClick={toggle}
                className="group py-3 px-4 flex-1 flex flex-col items-center justify-center w-fit rounded-xl hover:bg-blue-50/60 transition-colors cursor-pointer"
              >
                <span className="text-4xl font-extrabold text-blue-600 tracking-tight leading-none ml-1">
                  {format(new Date(datum + "T12:00:00"), "d")}.
                </span>
                <span className="text-sm font-medium text-gray-500 mt-1 pl-0.75 flex items-center gap-1">
                  {format(new Date(datum + "T12:00:00"), "LLLL yyyy", {
                    locale: sk,
                  })}
                  <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </span>
              </button>
            )}
          </DatePicker>

          {/* Quick buttons row */}
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => setDatum(format(new Date(), "yyyy-MM-dd"))}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                isTodaySelected
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Dnes
            </button>
            <button
              onClick={() =>
                setDatum(format(addDays(new Date(), 1), "yyyy-MM-dd"))
              }
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                isTomorrowSelected
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                          {getProfilesForPozicia(allProfiles, pozicia)
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
                          {getProfilesForPozicia(allProfiles, pozicia)
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
        {/* Filter bar */}
        <div className="bg-white gap-5 flex flex-col md:flex-row justify-between md:items-center rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Reportéri</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {sortedFilteredReporters.length}
              </span>
            </div>
            {/* {(filterRegion !== "vsetci" || filterStav !== "all") && (
              <button
                onClick={() => {
                  setFilterRegion("vsetci");
                  setFilterStav("all");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Zrušiť filtre
              </button>
            )} */}
          </div>

          {/* Filters row: region + stav + čakajúce toggle + uložiť toggle */}
          <div className="flex flex-col sm:flex-row gap-5 sm:items-center sm:flex-wrap w-full sm:w-auto">
            {/* Region segmented control */}
            <div className="flex bg-gray-100 rounded-xl p-1 w-full sm:w-auto">
              {(
                [
                  { value: "vsetci", label: "Všetci" },
                  { value: "bratislavski", label: "Bratislavskí" },
                  { value: "regionalny", label: "Regionálni" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterRegion(opt.value)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filterRegion === opt.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-200" />

            {/* Work status pills */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  {
                    value: "all",
                    label: "Všetci",
                    color: "bg-blue-50 text-blue-500",
                    activeColor: "bg-blue-600 text-white",
                  },
                  {
                    value: "pracujuci",
                    label: "Pracujúci",
                    color: "bg-green-50 text-green-600",
                    activeColor: "bg-green-600 text-white",
                  },
                  {
                    value: "nepracujuci",
                    label: "Nepracujúci",
                    color: "bg-red-50 text-red-600",
                    activeColor: "bg-red-600 text-white",
                  },
                  {
                    value: "volno",
                    label: "Voľno",
                    color: "bg-gray-50 text-gray-500",
                    activeColor: "bg-gray-600 text-white",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStav(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filterStav === opt.value
                      ? opt.activeColor
                      : opt.color + " hover:opacity-80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-200" />

            {/* Čakajúce hore toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCakajuceNaVrch(!cakajuceNaVrch)}
                className={`relative w-8 h-4.5 rounded-full transition-colors ${
                  cakajuceNaVrch ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${
                    cakajuceNaVrch ? "translate-x-3.5" : ""
                  }`}
                />
              </button>
              <span className="text-xs text-gray-600">Čakajúce hore</span>
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-200" />

            {/* Uložiť filtre toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUlozitFiltre(!ulozitFiltre)}
                className={`relative w-8 h-4.5 rounded-full transition-colors ${
                  ulozitFiltre ? "bg-amber-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${
                    ulozitFiltre ? "translate-x-3.5" : ""
                  }`}
                />
              </button>
              <span className="text-xs text-gray-600">Uložiť filtre</span>
            </div>
          </div>
        </div>

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
                      {/* Unified row: color | name | topics | plus | semafor */}
                      <div className="relative overflow-hidden">
                        <div
                          className={
                            (stav === "nepracujuci"
                              ? "bg-red-500"
                              : stav === "volno"
                                ? "bg-gray-400"
                                : "bg-green-500") +
                            " absolute left-0 top-0 bottom-0 w-3 rounded-l-xl pointer-events-none"
                          }
                          aria-hidden
                        />

                        <div
                          className={`flex flex-wrap md:flex-nowrap ${reporterTemy.length > 1 ? "items-start" : "items-center"}`}
                        >
                          {/* Col 1: Name */}
                          <Link
                            href={`/profil?user=${reporter.id}`}
                            className="order-1 group flex items-center gap-2.5 no-underline rounded-lg ml-3.5 mr-0.5 my-1 pl-1.5 pr-1.5 py-2 hover:bg-gray-50 transition-colors cursor-pointer flex-1 min-w-0 md:flex-none md:w-56 lg:w-64 md:shrink-0 [&:hover_span.reporter-name]:text-blue-600"
                          >
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                isCurrentUser
                                  ? "bg-blue-100 text-blue-700"
                                  : stav === "nepracujuci"
                                    ? "bg-red-100 text-red-700"
                                    : stav === "volno"
                                      ? "bg-gray-100 text-gray-500"
                                      : "bg-green-100 text-green-700"
                              }`}
                            >
                              {reporter.region
                                ? reporter.region.slice(0, 2).toUpperCase()
                                : `${reporter.meno?.[0] ?? ""}${reporter.priezvisko?.[0] ?? ""}` ||
                                  "?"}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="reporter-name font-medium text-[15px] text-gray-900 truncate">
                                  {reporter.priezvisko} {reporter.meno}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium shrink-0">
                                    Vy
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 -mt-0.5">
                                <span
                                  className={`text-[11px] font-[450] ${stavInfo.color}`}
                                >
                                  {stavInfo.label}
                                </span>
                                {reporter.telefon && (
                                  <span className="text-[11px] text-gray-400">
                                    {reporter.telefon}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>

                          {/* Col 3+4: Actions (plus + semafor) */}
                          <div className="order-2 md:order-3 flex items-center gap-1.5 shrink-0 py-3 pr-3 ml-auto md:ml-0">
                            {(isCurrentUser
                              ? hasRole(currentProfile, "reporter")
                              : canAddForOthers) && (
                              <button
                                onClick={() => {
                                  if (isCurrentUser) {
                                    setNovaTemaForReporter(null);
                                  } else {
                                    setNovaTemaForReporter({
                                      id: reporter.id,
                                      name: `${reporter.priezvisko} ${reporter.meno}`,
                                    });
                                  }
                                  setShowNovaTema(true);
                                }}
                                className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shrink-0"
                                title={
                                  isCurrentUser
                                    ? "Nová téma"
                                    : `Pridať tému za ${reporter.priezvisko} ${reporter.meno}`
                                }
                              >
                                <PlusCircle className="w-4 h-4 text-white" />
                              </button>
                            )}
                            {canSetReporterStatus && (
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

                          {/* Col 2: Topics */}
                          <div
                            className={`order-3 md:order-2 basis-full md:basis-auto md:flex-1 min-w-0 md:py-3 md:px-2 ${
                              reporterTemy.length > 0
                                ? "px-5 pb-3"
                                : "hidden md:block"
                            }`}
                          >
                            {reporterTemy.length > 0 && (
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
                                    canApproveTopics(currentProfile);
                                  const canChangeStav =
                                    canApproveTopics(currentProfile);
                                  const temaKomentare = getKomentareForTema(
                                    tema.id,
                                  );
                                  const schvalilProfile = tema.schvalil_id
                                    ? getProfile(tema.schvalil_id)
                                    : null;
                                  const POPIS_LIMIT = 110;
                                  const isPopisLong =
                                    tema.popis &&
                                    tema.popis.length > POPIS_LIMIT;
                                  const isPopisExpanded = expandedPopis.has(
                                    tema.id,
                                  );
                                  return (
                                    <div
                                      key={tema.id}
                                      className={`px-3 py-2 rounded-xl border ${stavI.color}`}
                                    >
                                      {/* Main row: [icon] [content] [actions] */}
                                      <div className="flex items-start gap-1.5">
                                        <StavIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />

                                        {/* Content column */}
                                        <div className="flex-1 min-w-0">
                                          {/* Line 1: name + type + miesto + approver */}
                                          <div className="flex items-center gap-x-4  gap-y-0.5 flex-wrap">
                                            <span className="font-semibold text-sm leading-tight">
                                              {tema.nazov}
                                            </span>
                                            {tema.typ &&
                                              tema.typ !== "reportaz" && (
                                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/60 font-medium shrink-0">
                                                  {temaTypLabels[tema.typ]}
                                                </span>
                                              )}
                                            {tema.miesto && (
                                              <span className="flex items-center gap-0.75 text-xs opacity-90 shrink-0">
                                                <MapPin className="w-3.5 h-3.5 opacity-60" />
                                                {tema.miesto}
                                              </span>
                                            )}
                                            {tema.stav !== "caka" &&
                                              schvalilProfile && (
                                                <span className="flex items-center gap-0.75 text-xs opacity-90 shrink-0">
                                                  {tema.stav === "schvalene" ? (
                                                    <CheckCircle className="w-3 h-3 opacity-80" />
                                                  ) : (
                                                    <XCircle className="w-3 h-3 opacity-80" />
                                                  )}
                                                  <span className="opacity-80">
                                                    {tema.stav === "schvalene"
                                                      ? "Schválil"
                                                      : "Neschválil"}
                                                    :
                                                  </span>
                                                  <span className="font-medium opacity-90">
                                                    {schvalilProfile.priezvisko}{" "}
                                                    {schvalilProfile.meno}
                                                  </span>
                                                </span>
                                              )}
                                          </div>

                                          {/* Popis with truncation */}
                                          {tema.popis && (
                                            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                                              {isPopisLong && !isPopisExpanded
                                                ? tema.popis.slice(
                                                    0,
                                                    POPIS_LIMIT,
                                                  ) + "…"
                                                : tema.popis}
                                              {isPopisLong && (
                                                <button
                                                  onClick={() =>
                                                    setExpandedPopis((prev) => {
                                                      const next = new Set(
                                                        prev,
                                                      );
                                                      if (isPopisExpanded) {
                                                        next.delete(tema.id);
                                                      } else {
                                                        next.add(tema.id);
                                                      }
                                                      return next;
                                                    })
                                                  }
                                                  className="ml-1 font-medium underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
                                                >
                                                  {isPopisExpanded
                                                    ? "menej"
                                                    : "viac"}
                                                </button>
                                              )}
                                            </p>
                                          )}

                                          {/* Legacy single comment */}
                                          {tema.poznamka_veduceho && (
                                            <div className="flex items-start gap-1 mt-0.5">
                                              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                              <p className="text-xs italic opacity-75">
                                                {tema.poznamka_veduceho}
                                              </p>
                                            </div>
                                          )}

                                          {/* Multiple comments */}
                                          {temaKomentare.length > 0 && (
                                            <div className="mt-0.5 space-y-0.5">
                                              {temaKomentare.map((kom) => {
                                                const autor = getProfile(
                                                  kom.autor_id,
                                                );
                                                return (
                                                  <div
                                                    key={kom.id}
                                                    className="flex items-start gap-1"
                                                  >
                                                    <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                                    <p className="text-xs">
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
                                                    </p>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {/* Inline comment input */}
                                          {canChangeStav &&
                                            novyKomentar?.temaId ===
                                              tema.id && (
                                              <div className="flex items-center gap-1.5 mt-1">
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

                                        {/* Actions column */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {canEdit && (
                                            <button
                                              onClick={() =>
                                                openEditModal(tema)
                                              }
                                              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                                              title="Upraviť"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                          )}
                                          {canEdit && (
                                            <button
                                              onClick={() =>
                                                handleDeleteTema(tema.id)
                                              }
                                              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                                              title="Zmazať"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                          {canChangeStav &&
                                            novyKomentar?.temaId !==
                                              tema.id && (
                                              <button
                                                onClick={() =>
                                                  setNovyKomentar({
                                                    temaId: tema.id,
                                                    text: "",
                                                  })
                                                }
                                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                                                title="Pridať komentár"
                                              >
                                                <MessageSquare className="w-3 h-3" />
                                              </button>
                                            )}
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
                                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-200 hover:bg-green-300 text-green-800 transition-colors"
                                                  title="Schváliť"
                                                >
                                                  <CheckCircle className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setSchvalovaniModal({
                                                      tema,
                                                      action: "neschvalene",
                                                    })
                                                  }
                                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-200 hover:bg-red-300 text-red-800 transition-colors"
                                                  title="Neschváliť"
                                                >
                                                  <XCircle className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            )}
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
                                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
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
                                                  <XCircle className="w-3.5 h-3.5" />
                                                ) : (
                                                  <CheckCircle className="w-3.5 h-3.5" />
                                                )}
                                              </button>
                                            )}
                                          {canChangeStav &&
                                            tema.stav !== "caka" && (
                                              <button
                                                onClick={() =>
                                                  setStavChangeModal({
                                                    tema,
                                                    newStav: "caka",
                                                  })
                                                }
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-yellow-200 hover:bg-yellow-300 text-yellow-800 transition-colors"
                                                title="Vrátiť na čakajúcu"
                                              >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
              <DatePicker
                value={editDatum}
                onChange={(v) => {
                  setEditDatum(v);
                }}
                label="Dátum"
              />
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

      <NovaTemaModal
        isOpen={showNovaTema}
        onClose={() => {
          setShowNovaTema(false);
          setNovaTemaForReporter(null);
          fetchData(true);
        }}
        forReporterId={novaTemaForReporter?.id}
        forReporterName={novaTemaForReporter?.name}
      />
    </div>
  );
}
