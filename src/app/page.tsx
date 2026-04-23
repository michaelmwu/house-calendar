import { Calendar } from "@/components/calendar";
import {
  exampleHouseConfig,
  sampleDerivedDays,
} from "@/lib/house/sample-data";

const requestPolicy = exampleHouseConfig.sharePolicies.find(
  (policy) => policy.canRequest,
);

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-5 text-[var(--foreground)] sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[96rem]">
        <Calendar
          days={sampleDerivedDays}
          houseName={exampleHouseConfig.name}
          requestEnabled={Boolean(requestPolicy?.canRequest)}
        />
      </div>
    </main>
  );
}
