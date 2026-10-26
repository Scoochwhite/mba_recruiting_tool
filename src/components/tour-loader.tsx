import { createClient } from "@/lib/supabase/server";
import { TOUR_VERSION } from "@/lib/tour";
import { TourHost } from "./tour";

// Loads what this person has already seen. If those columns aren't in the database yet (a migration not
// run), the walkthrough switches itself off instead of breaking anything.
export async function TourLoader() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("tour_version, tips_seen").maybeSingle();
  return <TourHost enabled={!!data} version={data?.tour_version ?? TOUR_VERSION} tips={data?.tips_seen ?? []} />;
}
