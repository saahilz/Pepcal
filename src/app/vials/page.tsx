"use client";

import Link from "next/link";
import { useData } from "@/components/app-provider";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { PlusIcon, ChevronRightIcon } from "@/components/icons";
import { amountLabel, concentrationLabel, formatDate } from "@/lib/format";
import { localTodayDate } from "@/lib/format";

export default function VialsPage() {
  const { vials } = useData();
  const today = localTodayDate();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vial records</h1>
          <p className="mt-1 text-sm text-muted">
            {vials.length} {vials.length === 1 ? "record" : "records"}
          </p>
        </div>
        <Link href="/vials/new">
          <Button>
            <PlusIcon className="h-5 w-5" /> Add vial
          </Button>
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {vials.length === 0 ? (
          <EmptyState
            title="No vial records yet"
            body="Add a reconstituted vial, or save a result straight from the calculator."
            action={
              <Link href="/calculator">
                <Button>Open the calculator</Button>
              </Link>
            }
          />
        ) : null}
        {vials.map((v) => {
          const expired = v.beyondUseDate !== null && v.beyondUseDate < today;
          return (
            <Card key={v.id} className="overflow-hidden">
              <Link href={`/vials/${v.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2/50 sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold">{v.name}</span>
                    {v.demo ? <Badge tone="demo">Demo</Badge> : null}
                    {expired ? <Badge tone="bad">Beyond-use date passed</Badge> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
                    <span>{amountLabel(v.vialAmount, v.vialUnit)}</span>
                    {v.concentrationMcgPerMl !== null ? (
                      <span>{concentrationLabel(v.concentrationMcgPerMl)}</span>
                    ) : (
                      <span className="italic">not yet reconstituted</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-subtle">
                    {v.reconstitutedAt
                      ? `Reconstituted ${formatDate(v.reconstitutedAt)}`
                      : "No reconstitution recorded"}
                    {v.beyondUseDate ? ` · beyond-use ${v.beyondUseDate}` : ""}
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-subtle" />
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
