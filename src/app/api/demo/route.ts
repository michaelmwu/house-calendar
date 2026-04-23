import {
  exampleHouseConfig,
  sampleDerivedDays,
  sampleEventInterpretations,
} from "@/lib/house/sample-data";

export function GET() {
  return Response.json({
    house: exampleHouseConfig,
    events: sampleEventInterpretations,
    availability: sampleDerivedDays,
  });
}
