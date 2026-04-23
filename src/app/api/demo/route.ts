import {
  sampleDerivedDays,
  sampleEventInterpretations,
  washingtonHouseConfig,
} from "@/lib/house/sample-data";

export function GET() {
  return Response.json({
    house: washingtonHouseConfig,
    events: sampleEventInterpretations,
    availability: sampleDerivedDays,
  });
}
