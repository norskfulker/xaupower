"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function AccessToast() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (params.get("toast") === "no-access") {
      toast.error("You don't have access to that page.");
      const url = new URL(window.location.href);
      url.searchParams.delete("toast");
      router.replace(url.pathname + url.search);
    }
  }, [params, router]);

  return null;
}
