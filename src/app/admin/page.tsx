import { redirect } from "next/navigation";
import { getDefaultSiteId } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { getAdminAuthState } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminRedirectPage() {
  const [authState, appConfig] = await Promise.all([
    getAdminAuthState(),
    loadAppConfig(),
  ]);

  if (!authState.initialized) {
    redirect("/admin/setup");
  }

  if (!authState.session) {
    redirect("/admin/login");
  }

  redirect(`/admin/${getDefaultSiteId(appConfig)}`);
}
