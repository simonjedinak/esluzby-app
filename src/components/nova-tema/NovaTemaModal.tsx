"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, AlignLeft, CheckCircle, Tag, MapPin, X } from "lucide-react";
import type { TemaTyp } from "@/lib/types/database";
import { temaTypLabels } from "@/lib/types/database";
import { DatePicker } from "@/components/ui/DatePicker";

interface NovaTemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, insert the tema for this reporter instead of the logged-in user */
  forReporterId?: string;
  forReporterName?: string;
}

export function NovaTemaModal({
  isOpen,
  onClose,
  forReporterId,
  forReporterName,
}: NovaTemaModalProps) {
  const [nazov, setNazov] = useState("");
  const [popis, setPopis] = useState("");
  const [typ, setTyp] = useState<TemaTyp>("reportaz");
  const [miesto, setMiesto] = useState("");
  const [datum, setDatum] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNazov("");
      setPopis("");
      setTyp("reportaz");
      setMiesto("");
      setDatum(format(new Date(), "yyyy-MM-dd"));
      setSuccess(false);
      setError("");
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nie ste prihlásený");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("temy").insert({
      reporter_id: forReporterId || user.id,
      datum,
      nazov,
      popis: popis || null,
      typ,
      miesto: miesto || null,
      stav: "caka",
      poznamka_veduceho: null,
      schvalil_id: null,
    } as any);

    if (insertError) {
      setError("Nepodarilo sa pridať tému. Skúste znova.");
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSuccess(false);
    setNazov("");
    setPopis("");
    setMiesto("");
    setTyp("reportaz");
    setDatum(format(new Date(), "yyyy-MM-dd"));
  };

  const handleCloseAndRefresh = () => {
    onClose();
    router.refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCloseAndRefresh}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nová téma</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {forReporterName
                ? `Pridať tému za: ${forReporterName}`
                : "Pridajte novú tému na službu"}
            </p>
          </div>
          <button
            onClick={handleCloseAndRefresh}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {success ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Téma pridaná!
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {forReporterName
                  ? `Téma pre ${forReporterName} čaká na schválenie.`
                  : "Vaša téma čaká na schválenie vedúcim dňa."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAddAnother}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Pridať ďalšiu
                </button>
                <button
                  onClick={handleCloseAndRefresh}
                  className="flex-1 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Zavrieť
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Typ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-gray-400" />
                      Typ
                    </div>
                  </label>
                  <select
                    value={typ}
                    onChange={(e) => setTyp(e.target.value as TemaTyp)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                  >
                    {(Object.keys(temaTypLabels) as TemaTyp[]).map((key) => (
                      <option key={key} value={key}>
                        {temaTypLabels[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <DatePicker value={datum} onChange={setDatum} label="Dátum" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-400" />
                      Názov témy
                    </div>
                  </label>
                  <input
                    type="text"
                    value={nazov}
                    onChange={(e) => setNazov(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Zadajte názov témy"
                    required
                  />
                </div>

                {/* Miesto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Miesto (voliteľné)
                    </div>
                  </label>
                  <input
                    type="text"
                    value={miesto}
                    onChange={(e) => setMiesto(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Mesto alebo oblasť"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <AlignLeft className="w-4 h-4 text-gray-400" />
                      Popis (voliteľné)
                    </div>
                  </label>
                  <textarea
                    value={popis}
                    onChange={(e) => setPopis(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 resize-none"
                    rows={3}
                    placeholder="Podrobnejší popis témy..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Pridávam..." : "Pridať tému"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
