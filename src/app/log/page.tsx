"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useData } from "@/components/app-provider";
import { InjectionForm, type InjectionPrefill } from "@/components/log/injection-form";
import type { AmountUnit } from "@/lib/domain/units";
import { Spinner } from "@/components/ui";

/**
 * /log creates a new injection; /log?id=… edits an existing one. Query params
 * are read with useSearchParams (inside Suspense), so no window access is
 * needed during prerender.
 */
function LogPageContent() {
  const { status, injections } = useData();
  const params = useSearchParams();

  if (status === "loading") return <Spinner label="Preparing the log" />;

  const editId = params.get("id");
  if (editId) {
    const existing = injections.find((i) => i.id === editId);
    return (
      <div>
        <h1 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight">Edit injection</h1>
        <div className="mt-5">
          {existing ? <InjectionForm existing={existing} /> : <Spinner label="Loading record" />}
        </div>
      </div>
    );
  }

  const vialId = params.get("vial");
  const hasCalcPrefill = params.has("amount") && params.has("unit") && params.has("concMcg");

  const prefill: InjectionPrefill | undefined = hasCalcPrefill
    ? {
        amount: params.get("amount") ?? "",
        unit: (params.get("unit") as AmountUnit) ?? "mcg",
        concMcg: params.get("concMcg") ?? "",
        concMg: params.get("concMg") ?? "",
        vialId,
      }
    : vialId
      ? { amount: "", unit: "mcg", concMcg: "", concMg: "", vialId }
      : undefined;

  return (
    <div>
      <h1 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight">Log an injection</h1>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted">
        Record what you actually took and when. The vial name and concentration used are
        saved as a snapshot on this record.
      </p>
      <div className="mt-5">
        <InjectionForm prefill={prefill} />
      </div>
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <LogPageContent />
    </Suspense>
  );
}
