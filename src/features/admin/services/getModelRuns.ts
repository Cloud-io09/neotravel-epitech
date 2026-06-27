import { listModelRuns } from "@/shared/lib/data/modelRunRepository";

export async function getModelRuns() {
 return listModelRuns();
}
