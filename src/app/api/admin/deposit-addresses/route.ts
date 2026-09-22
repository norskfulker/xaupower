import { NextResponse } from "next/server";
import { createClient, getOwnProfile } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { validateWalletAddress } from "@/lib/address-validation";
import { WALLET_NETWORKS } from "@/lib/wallets";
import { PLACEHOLDER_DEPOSIT_PREFIX } from "@/lib/types";

export async function POST(request: Request) {
  try {
    // Authn via session client (so the user's JWT sets auth.uid()).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOwnProfile(user.id);
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: string;
      address?: string;
      isActive?: boolean;
    };

    if (!body.id || !body.address) {
      return NextResponse.json(
        { error: "id and address are required" },
        { status: 400 }
      );
    }

    const address = body.address.trim();
    if (!address) {
      return NextResponse.json(
        { error: "address cannot be empty" },
        { status: 400 }
      );
    }

    // The form sometimes passes the currency ("BTC", "ERC20", "TRC20") as id
    // when no row exists yet, or a real UUID once it does. Resolve which.
    const admin = createServiceClient();
    let network: (typeof WALLET_NETWORKS)[number] | null = null;
    let existingRow: { id: string; currency: string } | null = null;

    if (WALLET_NETWORKS.includes(body.id as never)) {
      network = body.id as (typeof WALLET_NETWORKS)[number];
      const { data } = await admin
        .from("deposit_addresses")
        .select("id, currency")
        .eq("currency", network)
        .maybeSingle();
      existingRow = (data as { id: string; currency: string } | null) ?? null;
    } else {
      const { data } = await admin
        .from("deposit_addresses")
        .select("id, currency")
        .eq("id", body.id)
        .maybeSingle();
      if (!data) {
        return NextResponse.json(
          { error: "Unknown address row" },
          { status: 404 }
        );
      }
      network = data.currency as (typeof WALLET_NETWORKS)[number];
      existingRow = data;
    }

    // Validate the address. Placeholders (kept in DB for placeholder warnings
    // on the dashboard) are allowed through.
    if (!address.startsWith(PLACEHOLDER_DEPOSIT_PREFIX)) {
      const invalid = validateWalletAddress(network, address);
      if (invalid) {
        return NextResponse.json({ error: invalid }, { status: 400 });
      }
    }

    let savedRow;
    if (existingRow) {
      const { data, error } = await admin
        .from("deposit_addresses")
        .update({
          address,
          is_active: body.isActive ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRow.id)
        .select("*")
        .single();
      if (error) {
        console.error("deposit_addresses update failed", error);
        return NextResponse.json(
          { error: "Could not save address" },
          { status: 500 }
        );
      }
      savedRow = data;
    } else {
      const { data, error } = await admin
        .from("deposit_addresses")
        .insert({
          currency: network,
          address,
          is_active: body.isActive ?? true,
        })
        .select("*")
        .single();
      if (error) {
        console.error("deposit_addresses insert failed", error);
        return NextResponse.json(
          { error: "Could not save address" },
          { status: 500 }
        );
      }
      savedRow = data;
    }

    return NextResponse.json({ address: savedRow });
  } catch (err) {
    console.error("admin deposit-addresses POST error", err);
    return NextResponse.json(
      { error: "Could not save address" },
      { status: 500 }
    );
  }
}
