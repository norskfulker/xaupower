import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CryptoCurrency } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: string;
      currency?: CryptoCurrency;
      address?: string;
      isActive?: boolean;
    };

    if (!body.id || !body.address?.trim()) {
      return NextResponse.json(
        { error: "id and address are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("deposit_addresses")
      .update({
        address: body.address.trim(),
        is_active: body.isActive ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      console.error("deposit address update failed", error);
      return NextResponse.json(
        { error: "Could not update address" },
        { status: 500 }
      );
    }

    return NextResponse.json({ address: data });
  } catch (err) {
    console.error("wallet settings error", err);
    return NextResponse.json(
      { error: "Could not update address" },
      { status: 500 }
    );
  }
}
