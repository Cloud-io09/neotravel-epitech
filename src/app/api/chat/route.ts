import { chatMessageSchema } from "@/features/chat/schemas/chat.schema";
import { NeoTravelAgent } from "@/shared/lib/ai/NeoTravelAgent";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";

export async function POST(request: Request) {
 try {
  const body = chatMessageSchema.parse(await request.json());
  return jsonOk(await NeoTravelAgent(body));
 } catch (error) {
  return handleApiError(error);
 }
}
