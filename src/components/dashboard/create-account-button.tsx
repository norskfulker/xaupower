"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateAccountDialog } from "@/components/dashboard/create-account-dialog";
import { useRouter } from "next/navigation";

export function CreateAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-orange text-white hover:bg-orange/90"
      >
        <Plus className="size-4" /> Create account
      </Button>
      <CreateAccountDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => router.refresh()}
      />
    </>
  );
}