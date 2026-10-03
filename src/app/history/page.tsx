"use client";

import { useState } from "react";
import Link from "next/link";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";
import { Badge, Button, Card, EmptyState, Select } from "@/components/ui";
import { EditIcon, LogIcon, TrashIcon } from "@/components/icons";
import { amountLabel, formatDateTime, relativeDayLabel } from "@/lib/format";

export default function HistoryPage() {
  const { injections, vials, deleteInjection } = useData();
  const { show } = useToast();
  const [vialFilter, setVialFilter] = useState("all");

  const filtered =
    vialFilter === "all" ? injections : injections.filter((i) => i.vialId === vialFilter);

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Delete this injection record from ${label}?`)) return;
    try {
      await deleteInjection(id);
      show("Record deleted.");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete the record.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted">
            {injections.length} completed injection{injections.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="h-filter">
            Filter by vial
          </label>
          <Select
            id="h-filter"
            value={vialFilter}
            onChange={(e) => setVialFilter(e.target.value)}
            className="w-56"
          >
            <option value="all">All peptides</option>
            {vials.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <Link href="/log">
            <Button>
              <LogIcon className="h-4.5 w-4.5" /> Log
            </Button>
          </Link>
        </div>
      </div>

      <p className="mt-2 text-xs text-subtle">
        Only completed injections are listed here for now. Scheduled events, the calendar,
        status filters, and CSV export arrive with the scheduling phase.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <EmptyState
            emoji="💉"
            title={injections.length === 0 ? "Nothing logged yet" : "No injections match this filter"}
            body="Log your first injection to start a record."
            action={<Link href="/log"><Button>Log an injection</Button></Link>}
          />
        ) : null}
        {filtered.map((i) => (
          <Card key={i.id} className="flex items-center gap-3 p-3.5 sm:p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  {relativeDayLabel(i.administeredAt)} ·{" "}
                  <span className="tabular-nums">{formatDateTime(i.administeredAt).split("·")[1]?.trim()}</span>
                </span>
                {i.demo ? <Badge tone="demo">Demo</Badge> : null}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">
                {amountLabel(i.amount, i.amountUnit)}
                {i.vialNameSnapshot ? ` · ${i.vialNameSnapshot}` : ""}
                {i.location?.label ? ` · ${i.location.label}` : ""}
              </p>
              {i.notes ? <p className="mt-0.5 truncate text-xs text-subtle">{i.notes}</p> : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Link
                href={`/log?id=${i.id}`}
                aria-label={`Edit record from ${formatDateTime(i.administeredAt)}`}
                className="tap-slop flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <EditIcon className="h-4.5 w-4.5" />
              </Link>
              <button
                type="button"
                aria-label={`Delete record from ${formatDateTime(i.administeredAt)}`}
                onClick={() => handleDelete(i.id, relativeDayLabel(i.administeredAt))}
                className="tap-slop flex h-10 w-10 items-center justify-center rounded-xl text-bad transition-colors hover:bg-bad-soft"
              >
                <TrashIcon className="h-4.5 w-4.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
