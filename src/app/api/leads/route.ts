import { createLead } from "@/features/demand/actions/createLead";
import { qualifyDemand } from "@/features/demand/actions/qualifyDemand";
import { demandSchema } from "@/features/demand/schemas/demand.schema";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";
import { z } from "zod";

const LeadApiInputSchema = demandSchema.partial().extend({
 qualify: z.boolean().optional()
});

export async function POST(request: Request) {
 try {
  const body = LeadApiInputSchema.parse(await request.json());
  const lead = await createLead(body);

  if (body.qualify === true) {
   const demand = demandSchema.parse({
    rawMessage: lead.rawMessage,
    organization: lead.organization,
    email: lead.email,
    departureCity: lead.departureCity,
    arrivalCity: lead.arrivalCity,
    departureDate: lead.departureDate,
    returnDate: lead.returnDate,
    passengerCount: lead.passengerCount,
    tripType: lead.tripType,
    options: lead.options
   });
   const qualification = await qualifyDemand({ ...demand, id: lead.id });
   return jsonOk({ leadId: lead.id, lead, qualification }, { status: 201 });
  }

  return jsonOk({ leadId: lead.id, lead }, { status: 201 });
 } catch (error) {
  return handleApiError(error);
 }
}
