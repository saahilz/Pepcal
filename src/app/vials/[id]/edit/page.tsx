"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useData } from "@/components/app-provider";
import { VialForm } from "@/components/vials/vial-form";
import { Button, EmptyState } from "@/components/ui";

export default function EditVialPage() {
  const { id } = useParams<{ id: string }>();
  const { vials } = useData();
  const vial = vials.find((v) => v.id === id);

  return (
    <div>
      <h1 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight">Edit vial</h1>
      <div className="mt-5">
        {!vial ? (
          <EmptyState
            title="Record not found"
            action={<Link href="/vials"><Button variant="secondary">Back to vials</Button></Link>}
          />
        ) : (
          <VialForm existing={vial} />
        )}
      </div>
    </div>
  );
}
