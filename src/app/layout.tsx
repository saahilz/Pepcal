import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeNoFlashScript } from "@/components/theme-provider";
import { DataProvider } from "@/components/app-provider";
import { DiscretionProvider } from "@/components/discretion";
import { ToastProvider } from "@/components/toast-provider";
import { Shell } from "@/components/shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  /* Needed because a manifest's icon URLs are resolved against a base —
     relative ones without it are a build error. Point NEXT_PUBLIC_SITE_URL
     at the deployment; local dev falls back to this port. */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Pepcal",
    template: "%s · Pepcal",
  },
  description:
    "A reconstituted-peptide concentration calculator and injection record-keeper. Calculation and record-keeping only — no dosing or prescribing advice.",
  /* iOS standalone: the Share-sheet "Add to Home Screen" install reads these;
     Android/Chrome gets the same from the manifest at /manifest.webmanifest
     (link-injected by Next), and /apple-touch-icon.png is found by convention. */
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Pepcal" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* Lets the app paint under the notch/home indicator so the shell's
     env(safe-area-inset-*) padding does something — without it those resolve
     to 0 and the padding is dead code. Deliberately no maximumScale or
     userScalable:false; pinch-zoom stays available. */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#101512" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* suppressHydrationWarning is required, not cosmetic: themeNoFlashScript
       adds `dark` to this element's class list before React hydrates (that is
       the whole point of it — no light flash). React compares the className it
       rendered here against the DOM, sees the extra class, and reports a
       hydration mismatch whenever the resolved theme is dark. The flag covers
       this element's own attributes only, so genuine mismatches anywhere in the
       tree still surface. */
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <DiscretionProvider>
            <DataProvider>
              <ToastProvider>
                <Shell>{children}</Shell>
              </ToastProvider>
            </DataProvider>
          </DiscretionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
