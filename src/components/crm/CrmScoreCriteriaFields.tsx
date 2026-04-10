"use client";

import {
  computeLeadScore,
  groupedScoreCriteria,
  type CriteriaState,
} from "@/lib/crm-scoring";

export function CrmScoreCriteriaFields({
  criteria,
  onChange,
}: {
  criteria: CriteriaState;
  onChange: (next: CriteriaState) => void;
}) {
  const groups = groupedScoreCriteria();

  return (
    <div className="rounded-lg border border-zinc-700 p-3">
      <p className="mb-2 text-xs font-medium text-zinc-400">
        Puan kriterleri (skor: {computeLeadScore(criteria)})
      </p>
      <p className="mb-3 text-[11px] leading-relaxed text-zinc-600">
        Adayı inceleyerek işaretleyin. Sosyal medya ayrı kriter olarak
        kullanılmaz. Skor, ihtiyaç sinyali için yönlendiricidir.
      </p>
      <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g.category}>
            <h4 className="mb-2 border-b border-zinc-800 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {g.category}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent p-1 text-sm text-zinc-300 hover:border-zinc-800/80 hover:bg-zinc-950/40"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(criteria[c.id])}
                    onChange={(e) => {
                      onChange({
                        ...criteria,
                        [c.id]: e.target.checked,
                      });
                    }}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="leading-snug">
                      {c.label}{" "}
                      <span className="whitespace-nowrap text-zinc-500">
                        ({c.points > 0 ? "+" : ""}
                        {c.points})
                      </span>
                    </span>
                    {c.hint ? (
                      <span className="mt-1 block text-[11px] leading-snug text-zinc-600">
                        {c.hint}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
