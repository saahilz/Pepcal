"use client";

import { VialForm } from "@/components/vials/vial-form";
import Link from "next/link";

export default function NewVialPage() {
  return (
    <div>
      <div className="mx-auto max-w-xl">
        <Link href="/calculator" className="text-sm font-medium text-brand hover:underline">
          ← Or reconstitute first with the calculator
        </Link>
      </div>
      <h1 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight">Add a vial</h1>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted">
        Record the product and the amounts you used. Nothing here picks a dose or a
        beyond-use date for you.
      </p>
      <div className="mt-5">
        <VialForm />
      </div>
    </div>
  );
}
