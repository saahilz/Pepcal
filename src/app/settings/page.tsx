"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useData } from "@/components/app-provider";
import { useDiscretion } from "@/components/discretion";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/toast-provider";
import { useInstallHint } from "@/components/use-install-hint";
import { Button, Card, CardHeader, Field, Input, Segmented, Toggle } from "@/components/ui";
import { DownloadIcon } from "@/components/icons";
import { APP_SCOPE_NOTE, CLINICAL_CONFIRM } from "@/lib/domain/disclaimer";
import { buildMedicalLogCsv } from "@/lib/domain/export";
import { parseDecimal } from "@/lib/domain/calculator";
import { DEFAULT_PROTEIN_TARGET_G, DEFAULT_WATER_TARGET_ML } from "@/lib/domain/intake";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { repoKind, user, deleteAllUserData, resetDemoData, signOut } = useData();
  const { show } = useToast();
  const router = useRouter();

  async function handleDeleteAll() {
    const ok = window.confirm(
      "Delete ALL of your saved data? This cannot be undone. Injection history and vial records will be removed from this app."
    );
    if (!ok) return;
    try {
      await deleteAllUserData();
      show("All data deleted.");
      if (repoKind === "supabase") {
        await signOut();
        router.replace("/");
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete data.");
    }
  }

  async function handleResetDemo() {
    if (!window.confirm("Replace current data with fresh fictional demo data?")) return;
    try {
      await resetDemoData();
      show("Demo data restored.");
      router.replace("/");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not reset demo data.");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Appearance, your account backend, and your data.
        </p>
      </div>

      <Card>
        <CardHeader title="Appearance" />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <Segmented
            label="Colour theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Account" aside={repoKind === "demo" ? <BadgeDemo /> : null} />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {repoKind === "demo" ? (
            <p className="text-sm text-muted">
              You are using the <span className="font-medium text-foreground">local demo</span> —
              an on-this-device account with fictional data. Nothing leaves this browser. To sync
              to a real account, add the Supabase environment variables and deploy (see README).
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.name ?? "Connected account"}</p>
                <p className="text-xs text-muted">
                  Connected with Supabase Auth. Data is scoped to this account with row-level security.
                </p>
              </div>
              <Button variant="secondary" onClick={async () => { await signOut(); router.replace("/"); }}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </Card>

      <IntakeTargetsCard />

      <DiscretionCard />

      <InstallCard />

      <ExportCard />

      <Card>
        <CardHeader title="Your data" />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Delete all my data</p>
                <p className="text-xs text-muted">Permanently removes every record. Back it up with an export first.</p>
              </div>
              <Button variant="danger" onClick={handleDeleteAll}>
                Delete everything
              </Button>
            </div>
            {repoKind === "demo" ? (
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-sm font-medium">Restore fictional demo data</p>
                  <p className="text-xs text-muted">Clears the browser store and reseeds clearly-labelled sample records.</p>
                </div>
                <Button variant="secondary" onClick={handleResetDemo}>
                  Reset demo
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="About this app" />
        <div className="flex flex-col gap-2 px-4 pb-4 text-sm text-muted sm:px-5 sm:pb-5">
          <p>{APP_SCOPE_NOTE}</p>
          <p>{CLINICAL_CONFIRM}</p>
          <p className="text-xs text-subtle">
            Pepcal does not claim HIPAA compliance and does not share health data with
            advertising services. Data is sent only to the storage backend you connect.
            Notifications use privacy-preserving text such as “You have a scheduled reminder.”
          </p>
        </div>
      </Card>
    </div>
  );
}

function BadgeDemo() {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
      Demo
    </span>
  );
}

/**
 * Companion-tracker targets. Stored on the account like every other setting
 * (null = keep the app default); the widget reads them back everywhere.
 */
function IntakeTargetsCard() {
  const { settings, updateSettings } = useData();
  const { show } = useToast();
  const [protein, setProtein] = useState(
    settings.proteinTargetG != null ? String(settings.proteinTargetG) : ""
  );
  const [water, setWater] = useState(
    settings.waterTargetMl != null ? String(settings.waterTargetMl) : ""
  );

  const proteinNum = parseDecimal(protein);
  const waterNum = parseDecimal(water);
  const errors: Record<string, string> = {};
  if (protein.trim() !== "" && (proteinNum === null || proteinNum <= 0)) {
    errors.protein = "Enter a number above zero.";
  }
  if (water.trim() !== "" && (waterNum === null || waterNum <= 0)) {
    errors.water = "Enter a number above zero.";
  }
  const dirty =
    proteinNum !== settings.proteinTargetG || waterNum !== settings.waterTargetMl;
  const anything =
    protein.trim() !== "" ||
    water.trim() !== "" ||
    settings.proteinTargetG !== null ||
    settings.waterTargetMl !== null;

  async function save() {
    if (Object.keys(errors).length > 0) return;
    try {
      await updateSettings({ proteinTargetG: proteinNum, waterTargetMl: waterNum });
      show("Targets saved.");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save the targets.");
    }
  }

  async function clear() {
    try {
      await updateSettings({ proteinTargetG: null, waterTargetMl: null });
      setProtein("");
      setWater("");
      show("Targets reset to the app defaults.");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not reset the targets.");
    }
  }

  return (
    <Card>
      <CardHeader title="Protein & water targets" />
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="text-sm text-muted">
          The daily gauge on the dashboard measures what you log against these numbers.
          They are yours to choose — the defaults are app placeholders, not a
          recommendation of how much to eat or drink.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={`Protein target (default ${DEFAULT_PROTEIN_TARGET_G} g)`}
            htmlFor="target-protein"
            error={errors.protein}
          >
            <Input
              id="target-protein"
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder={String(DEFAULT_PROTEIN_TARGET_G)}
              invalid={Boolean(errors.protein)}
            />
          </Field>
          <Field
            label={`Water target, mL (default ${DEFAULT_WATER_TARGET_ML} mL)`}
            htmlFor="target-water"
            error={errors.water}
          >
            <Input
              id="target-water"
              inputMode="decimal"
              value={water}
              onChange={(e) => setWater(e.target.value)}
              placeholder={String(DEFAULT_WATER_TARGET_ML)}
              invalid={Boolean(errors.water)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={anything && (!dirty || Object.keys(errors).length > 0)}>
            {anything && !dirty ? "Targets saved" : "Save targets"}
          </Button>
          {anything ? (
            <Button variant="ghost" onClick={clear}>
              Use defaults
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/**
 * Privacy / discretion. Browser-local (localStorage), like the theme and the
 * kg/lb choice — the account and the records are untouched by it.
 */
function DiscretionCard() {
  const { on, setOn, blurDoses, setBlurDoses } = useDiscretion();
  return (
    <Card>
      <CardHeader title="Privacy" />
      <div className="flex flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <Toggle
          checked={on}
          onChange={setOn}
          label="Discretion mode"
          description="Shows anonymous labels — “Compound A”, “Vial #1”, “Protocol Alpha” — in place of peptide and vial names. A shoulder-surfing aid: every record keeps its real name underneath."
        />
        <div className={on ? "" : "opacity-50"}>
          {/* Harmless while the main switch is off: the blur only paints when
              discretion mode itself is on (BlurDose checks both). */}
          <Toggle
            checked={blurDoses}
            onChange={setBlurDoses}
            label="Blur dose numbers"
            description="Dose figures stay smudged until tapped. Names are masked either way; this adds the numbers."
          />
        </div>
        <p className="text-xs text-subtle">
          Shortcut: double-tap the Pepcal logo in the header to flip this without
          leaving the page.
        </p>
      </div>
    </Card>
  );
}

/** Install guidance that matches what this browser actually offers. */
function InstallCard() {
  const { hint, promptInstall } = useInstallHint();

  let body: { title: string; steps: string[] } | null;
  switch (hint) {
    case "android":
      body = {
        title: "Install Pepcal on this device",
        steps: [
          promptInstall
            ? "Use the Install button below — one tap adds it to your home screen."
            : "Your browser will offer an “Install app” prompt (usually in the address bar or its ⋮ menu) — one tap adds it to your home screen.",
          "It opens full-screen like a native app.",
        ],
      };
      break;
    case "ios":
      body = {
        title: "Add Pepcal to your Home Screen (iPhone/iPad)",
        steps: [
          "Open this page in Safari.",
          "Tap the Share button (the square with an upward arrow).",
          "Scroll down and tap “Add to Home Screen”.",
          "Tap “Add” to confirm — Pepcal appears as an app icon.",
        ],
      };
      break;
    case "installed":
      body = null;
      break;
    default:
      body = {
        title: "Install Pepcal",
        steps: [
          "On Android (Chrome): tap ⋮ → “Add to Home screen” or “Install app”.",
          "On iPhone/iPad (Safari): Share → “Add to Home Screen”.",
          "On a computer: the install icon appears at the right end of the address bar.",
        ],
      };
  }

  if (!body) return null; // already installed — nothing to guide

  return (
    <Card>
      <CardHeader title="Install" />
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="text-sm text-muted">{body.title}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted marker:text-subtle">
          {body.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {promptInstall ? (
          <div>
            <Button onClick={promptInstall}>Install app</Button>
          </div>
        ) : null}
        <p className="text-xs text-subtle">
          The installed app uses exactly the same data as this website.
        </p>
      </div>
    </Card>
  );
}

/** Entry points for the clinical export. The sheet itself is /export/print. */
function ExportCard() {
  const { injections, vials, weights } = useData();

  function downloadCsv() {
    try {
      const csv = buildMedicalLogCsv({ injections, vials, weights });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pepcal-medical-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // A failed download is non-fatal here; the print page is the other door
      // to the same file, with error handling.
    }
  }

  return (
    <Card>
      <CardHeader title="Doctor &amp; telehealth export" />
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="text-sm text-muted">
          Take your log to an appointment: a printable one-page summary with the
          doses, sites, and weights you recorded, and the same data as a CSV.
          Built in your browser — nothing is uploaded.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/export/print">
            <Button>Open printable summary</Button>
          </Link>
          <Button variant="secondary" onClick={downloadCsv} disabled={injections.length === 0}>
            <DownloadIcon className="h-4.5 w-4.5" /> Download CSV
          </Button>
        </div>
        <p className="text-xs text-subtle">
          Exports always show real names — a clinical record should not be
          disguised by discretion mode.
        </p>
      </div>
    </Card>
  );
}
