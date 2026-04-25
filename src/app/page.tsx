import { Calendar } from "@/components/calendar";
import {
  buildSampleScenario,
  exampleHouseConfig,
} from "@/lib/house/sample-data";

export const dynamic = "force-dynamic";

const requestPolicy = exampleHouseConfig.sharePolicies.find(
  (policy) => policy.canRequest,
);

export default function Home() {
  const { sampleDerivedDays } = buildSampleScenario();

  return (
    <main className="min-h-screen px-4 py-5 text-[var(--foreground)] sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[96rem]">
        <Calendar
          days={sampleDerivedDays}
          houseName={exampleHouseConfig.name}
          requestEnabled={Boolean(requestPolicy?.canRequest)}
          timezone={exampleHouseConfig.timezone}
        />
      </div>
    </main>
  );
}
