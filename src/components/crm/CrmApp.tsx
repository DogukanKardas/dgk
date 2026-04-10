"use client";

import { useCallback, useState } from "react";
import { CrmLeadsPanel } from "@/components/crm/CrmLeadsPanel";
import { CrmResearchPanel } from "@/components/crm/CrmResearchPanel";
import { CrmSummaryPanel } from "@/components/crm/CrmSummaryPanel";
import { CrmTemplatesPanel } from "@/components/crm/CrmTemplatesPanel";

type Tab = "arastirma" | "adaylar" | "sablonlar" | "ozet";

const tabs: { id: Tab; label: string }[] = [
  { id: "arastirma", label: "Araştırma" },
  { id: "adaylar", label: "Adaylar" },
  { id: "sablonlar", label: "Şablonlar" },
  { id: "ozet", label: "Özet" },
];

export function CrmApp() {
  const [tab, setTab] = useState<Tab>("arastirma");
  const [leadsKey, setLeadsKey] = useState(0);

  const onImported = useCallback(() => {
    setLeadsKey((k) => k + 1);
    setTab("adaylar");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "arastirma" ? (
        <CrmResearchPanel onImported={onImported} />
      ) : null}
      {tab === "adaylar" ? <CrmLeadsPanel key={leadsKey} /> : null}
      {tab === "sablonlar" ? <CrmTemplatesPanel /> : null}
      {tab === "ozet" ? <CrmSummaryPanel /> : null}
    </div>
  );
}
