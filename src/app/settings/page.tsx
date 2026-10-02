"use client";

import { useRouter } from "next/navigation";
import { useData } from "@/components/app-provider";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/toast-provider";
import { Button, Card, CardHeader, Segmented } from "@/components/ui";
import { APP_SCOPE_NOTE, CLINICAL_CONFIRM } from "@/lib/domain/disclaimer";

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

      <Card>
        <CardHeader title="Your data" />
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Delete all my data</p>
                <p className="text-xs text-muted">Permanently removes every record. Export arrives in the next phase.</p>
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
