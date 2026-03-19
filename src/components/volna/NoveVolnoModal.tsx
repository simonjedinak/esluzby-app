"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar, MessageSquare, CheckCircle, Tag, X } from "lucide-react";
import type { TypVolna } from "@/lib/types/database";
import { typVolnaLabels } from "@/lib/types/database";
import { DatePicker } from "@/components/ui/DatePicker";

interface NoveVolnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NoveVolnoModal({
  isOpen,
  onClose,
  onSuccess,
}: NoveVolnoModalProps) {
  const [datumOd, setDatumOd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [datumDo, setDatumDo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [typ, setTyp] = useState<TypVolna>("platene_volno");
  const [dovod, setDovod] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDatumOd(format(new Date(), "yyyy-MM-dd"));
      setDatumDo(format(new Date(), "yyyy-MM-dd"));
      setTyp("platene_volno");
      setDovod("");
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

    if (datumDo < datumOd) {
      setError('Dátum "do" nemôže byť pred dátumom "od"');
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Nie ste prihlásený");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("roly")
      .eq("id", user.id)
      .single();

    if (profile?.roly?.includes("sefproducent")) {
      setError("Táto rola má iba prístup na čítanie");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("volna").insert({
      reporter_id: user.id,
      datum_od: datumOd,
      datum_do: datumDo,
      typ,
      dovod: dovod || null,
      stav: "caka",
    } as any);

    if (insertError) {
      setError("Nepodarilo sa pridať voľno. Skúste znova.");
      setLoading(false);
    } else {
      // Send email notification to office managers
      const { data: profile } = await supabase
        .from("profiles")
        .select("meno, priezvisko")
        .eq("id", user.id)
        .single();

      if (profile) {
        fetch("/api/email/volno-nove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reporterMeno: `${profile.meno} ${profile.priezvisko}`,
            datumOd,
            datumDo,
            typVolna: typ,
            dovod: dovod || null,
          }),
        }).catch((e) => console.error("Email error:", e));
      }

      onSuccess?.();
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSuccess(false);
    setDatumOd(format(new Date(), "yyyy-MM-dd"));
    setDatumDo(format(new Date(), "yyyy-MM-dd"));
    setTyp("platene_volno");
    setDovod("");
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
            <h2 className="text-lg font-semibold text-gray-900">Nové voľno</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Zadajte dátumy a typ vášho voľna
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
                Voľno pridané!
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Vaše voľno čaká na schválenie.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAddAnother}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Pridať ďalšie
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
                {/* Typ voľna */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-gray-400" />
                      Typ voľna
                    </div>
                  </label>
                  <select
                    value={typ}
                    onChange={(e) => setTyp(e.target.value as TypVolna)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                  >
                    {(Object.keys(typVolnaLabels) as TypVolna[]).map((key) => (
                      <option key={key} value={key}>
                        {typVolnaLabels[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    value={datumOd}
                    onChange={(v) => {
                      setDatumOd(v);
                      if (v > datumDo) setDatumDo(v);
                    }}
                    label="Od"
                  />
                  <DatePicker
                    value={datumDo}
                    onChange={setDatumDo}
                    label="Do"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      Dôvod (voliteľné)
                    </div>
                  </label>
                  <textarea
                    value={dovod}
                    onChange={(e) => setDovod(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 resize-none"
                    rows={3}
                    placeholder="Dôvod voľna..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Pridávam..." : "Pridať voľno"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
