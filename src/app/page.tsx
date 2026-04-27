import { redirect } from "next/navigation";
import { getDefaultSiteId } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";

export const dynamic = "force-dynamic";

export default async function HomeRedirectPage() {
  const appConfig = await loadAppConfig();
  redirect(`/${getDefaultSiteId(appConfig)}`);
}
