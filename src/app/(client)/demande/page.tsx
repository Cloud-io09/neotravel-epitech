import { DemandConversation } from "@/features/demand/components/DemandConversation";

type DemandPageProps = {
 searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
 return Array.isArray(value) ? value[0] : value;
}

export default async function DemandPage({ searchParams }: DemandPageProps) {
 const params = (await searchParams) ?? {};

 return (
  <DemandConversation
   initialDemand={{
    departure: firstParam(params.departure),
    arrival: firstParam(params.arrival),
    departureDate: firstParam(params.departureDate),
    returnDate: firstParam(params.returnDate),
    passengers: firstParam(params.passengers),
    tripType: firstParam(params.tripType),
    options: firstParam(params.options),
    intermediateStops: firstParam(params.intermediateStops),
    callback: firstParam(params.callback)
   }}
  />
 );
}
