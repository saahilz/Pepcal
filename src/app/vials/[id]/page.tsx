"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useData } from "@/components/app-provider";
import { useToast } from "@/components/toast-provider";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { LogIcon, EditIcon, TrashIcon } from "@/components/icons";
import { amountLabel, concentrationLabel, formatDate, formatTime, relativeDayLabel } from "@/lib/format";
import { localTodayDate } from "@/lib/format";

export default function VialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { vials, injections, deleteVial } = useData();
  const { show } = useToast();
  const router = useRouter();

  const vial = vials.find((v) => v.id === id);
  const today = localTodayDate();

  if (!vial) {
    return (
      <EmptyState
        title="Record not found"
        body="It may have been deleted."
        action={<Link href="/vials"><Button variant="secondary">Back to vials</Button></Link>}
      />
    );
  }

  const vialLogs = injections.filter((i) => i.vialId === id).slice(0, 5);
  const expired = vial.beyondUseDate !== null && vial.beyondUseDate < today;

  const handleDelete = async () => {
    const ok = window.confirm(`Delete “${vial.name}” and its vial record? Injection history is kept but unlinked.`);
    if (!ok) return;
    try {
      await deleteVial(vial.id);
      show("Vial deleted.");
      router.push("/vials");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete the vial.");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{vial.name}</h1>
          {vial.demo ? <Badge tone="demo">Demo</Badge> : null}
          {expired ? <Badge tone="bad">Beyond-use date passed</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted">{amountLabel(vial.vialAmount, vial.vialUnit)} in the vial</p>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <Row label="Concentration">
          {vial.concentrationMcgPerMl !== null ? (
            <span className="font-semibold tabular-nums">
              {vial.concentrationMgPerMl != null ? `${trimDisplay(vial.concentrationMgPerMl)} mg/mL` : ""}{" "}
              <span className="text-muted">
                = {concentrationLabel(vial.concentrationMcgPerMl)}
              </span>
            </span>
          ) : (
            <span className="italic text-subtle">No reconstitution recorded</span>
          )}
        </Row>
        <Row label="Diluent added">
          {vial.diluentMl != null ? `${trimDisplay(vial.diluentMl)} mL` : "—"}
        </Row>
        <Row label="Reconstituted">
          {vial.reconstitutedAt ? `${formatDate(vial.reconstitutedAt)} at ${formatTime(vial.reconstitutedAt)}` : "—"}
        </Row>
        <Row label="Beyond-use date">
          {vial.beyondUseDate ? (
            <span className={expired ? "font-medium text-bad" : ""}>
              {vial.beyondUseDate}
              <span className="block text-xs text-subtle">Entered by you — Pepcal never computes this.</span>
            </span>
          ) : (
            <span className="text-subtle">Not set</span>
          )}
        </Row>
        {vial.notes ? <Row label="Notes">{vial.notes}</Row> : null}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/log?vial=${vial.id}`} className="flex-1">
          <Button size="lg" block>
            <LogIcon className="h-5 w-5" /> Log an injection
          </Button>
        </Link>
        <Link href={`/vials/${vial.id}/edit`}>
          <Button size="lg" variant="secondary">
            <EditIcon className="h-4.5 w-4.5" /> Edit
          </Button>
        </Link>
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold">Recent injections with this vial</h2>
        {vialLogs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None logged yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {vialLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {relativeDayLabel(l.administeredAt)} · {formatTime(l.administeredAt)}
                  </p>
                  {l.location?.label ? <p className="truncate text-xs text-muted">{l.location.label}</p> : null}
                </div>
                <span className="shrink-0 font-medium tabular-nums">{amountLabel(l.amount, l.amountUnit)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex justify-end border-t border-line pt-4">
        <Button variant="danger" onClick={handleDelete}>
          <TrashIcon className="h-4.5 w-4.5" /> Delete record
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm">{children}</dd>
    </div>
  );
}

function trimDisplay(n: number) {
  return Number(n.toFixed(4)).toString();
}
