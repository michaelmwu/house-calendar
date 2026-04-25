import {
  buildSampleScenario,
  exampleHouseConfig,
} from "@/lib/house/sample-data";

export function GET() {
  const { sampleDerivedDays, sampleEventInterpretations } =
    buildSampleScenario();

  return Response.json({
    house: exampleHouseConfig,
    events: sampleEventInterpretations,
    availability: sampleDerivedDays,
  });
}
