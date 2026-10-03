"use client";

import Link from "next/link";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { CalcIcon, CalendarIcon, ChevronRightIcon, LogIcon, VialIcon } from "@/components/icons";
import { amountLabel, formatTime, relativeDayLabel } from "@/lib/format";
import { CLINICAL_CONFIRM } from "@/lib/domain/disclaimer";

function isSameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function DashboardPage() {
  const { vials, injections } = useData();
  const { show } = useToast();

  const now = new Date();
  const todayLogs = injections.filter((i) => isSameLocalDay(i.administeredAt, now));
  const activeVials = vials.filter((v) => v.concentrationMcgPerMl !== null);
  const recent = injections.slice(0, 6);

  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6">
      <section className="dashboard-hero" aria-labelledby="dashboard-heading">
        <div className="dashboard-hero-copy">
          <span className="dashboard-kicker">Your health log</span>
          <h1 id="dashboard-heading">{greeting}, stay in the loop.</h1>
          <p>
            A quiet place to calculate, record, and understand the health data you choose to keep.
          </p>
          <div className="dashboard-hero-meta">
            <span className="dashboard-signal-chip">
              <strong>{todayLogs.length}</strong> {todayLogs.length === 1 ? "record today" : "records today"}
            </span>
            <span className="dashboard-signal-chip">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
        <div className="dashboard-hero-orbit" aria-hidden="true">
          <span className="hero-orbit-ring" />
          <div className="dashboard-hero-seal">
            <span>PEPCAL</span>
            <strong>{activeVials.length}</strong>
            <small>active vials</small>
          </div>
        </div>
      </section>

      <div className="dashboard-section-label">
        <h2>Make a record</h2>
        <p>Choose a starting point</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickAction
          href="/calculator"
          icon={<CalcIcon className="h-6 w-6" />}
          label="Calculate"
          sub="concentration"
        />
        <QuickAction href="/log" icon={<LogIcon className="h-6 w-6" />} label="Log injection" sub="what you took" />
        <button
          type="button"
          onClick={() => show("Schedules & reminders arrive in the next build phase.")}
          className="action-card action-card-muted flex flex-col items-start gap-2.5 focus-visible:outline-2 focus-visible:outline-brand active:scale-[0.99]"
        >
          <span className="action-card-icon text-muted">
            <CalendarIcon className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Add schedule</span>
            <span className="block text-xs text-subtle">coming next</span>
          </span>
        </button>
      </div>

      <div className="dashboard-section-label">
        <h2>At a glance</h2>
        <p>Only what you have entered</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="metric-card p-4.5">
          <span className="metric-icon"><LogIcon className="h-4.5 w-4.5" /></span>
          <p className="mt-3 text-xs font-semibold text-subtle">Logged today</p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight tabular-nums">
            {todayLogs.length}
            <span className="ml-1 text-sm font-normal text-muted">
              {todayLogs.length === 1 ? "injection" : "injections"}
            </span>
          </p>
        </Card>
        <Card className="metric-card p-4.5">
          <span className="metric-icon"><VialIcon className="h-4.5 w-4.5" /></span>
          <p className="mt-3 text-xs font-semibold text-subtle">Active vials</p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight tabular-nums">
            {activeVials.length}
            <span className="ml-1 text-sm font-normal text-muted">reconstituted</span>
          </p>
        </Card>
        <Card className="metric-card p-4.5">
          <span className="metric-icon"><CalcIcon className="h-4.5 w-4.5" /></span>
          <p className="mt-3 text-xs font-semibold text-subtle">All-time doses</p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight tabular-nums">
            {injections.length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Next scheduled injection" aside={<Badge tone="neutral">Soon</Badge>} />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="rounded-[1.1rem] border border-line/70 bg-surface-2/70 px-3.5 py-3 text-sm leading-relaxed text-muted">
            Scheduling with countdowns, reminders, and a today-status board (scheduled,
            taken, skipped, overdue) arrives in the next phase. Your completed injections
            are already recorded below.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Recent injections"
          aside={
            injections.length > 0 ? (
              <Link href="/history" className="tap-slop inline-block text-sm font-medium text-brand hover:underline">
                View all
              </Link>
            ) : undefined
          }
        />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {recent.length === 0 ? (
            <EmptyState
              emoji="💉"
              title="No injections yet"
              body="Log what you take and this will become your quick record."
              action={<Link href="/log"><Button>Log an injection</Button></Link>}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {recent.map((i) => (
                <li key={i.id} className="recent-row flex items-center justify-between gap-3 px-2 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="recent-avatar" aria-hidden><LogIcon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {relativeDayLabel(i.administeredAt)} · {formatTime(i.administeredAt)}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {i.vialNameSnapshot ?? "No linked vial"}
                        {i.location?.label ? ` · ${i.location.label}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {amountLabel(i.amount, i.amountUnit)}
                    </p>
                    {i.demo ? <Badge tone="demo">Demo</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Active peptides"
          aside={
            vials.length > 0 ? (
              <Link href="/vials" className="tap-slop inline-block text-sm font-medium text-brand hover:underline">
                View all
              </Link>
            ) : undefined
          }
        />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {vials.length === 0 ? (
            <EmptyState
              emoji="🧪"
              title="No peptide records"
              body="Add a vial, or start from a calculation and save the result."
              action={<Link href="/vials/new"><Button variant="secondary">Add a vial</Button></Link>}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {vials.slice(0, 4).map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/vials/${v.id}`}
                    className="vial-row flex items-center justify-between gap-3 px-2 py-3 transition-colors hover:text-foreground"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="recent-avatar"><VialIcon className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{v.name}</span>
                          {v.demo ? <Badge tone="demo">Demo</Badge> : null}
                        </span>
                        <span className="block text-xs text-muted">
                          {v.concentrationMgPerMl != null
                            ? `${Number(v.concentrationMgPerMl.toFixed(3))} mg/mL`
                            : "Not reconstituted yet"}
                        </span>
                      </span>
                    </div>
                    <ChevronRightIcon className="h-4.5 w-4.5 shrink-0 text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <p className="rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        {CLINICAL_CONFIRM}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="action-card flex flex-col items-start gap-2.5 focus-visible:outline-2 focus-visible:outline-brand active:scale-[0.99]"
    >
      <span className="action-card-icon">{icon}</span>
      <span>
        <span className="block text-sm font-semibold leading-tight">{label}</span>
        <span className="block text-xs text-subtle">{sub}</span>
      </span>
    </Link>
  );
}
