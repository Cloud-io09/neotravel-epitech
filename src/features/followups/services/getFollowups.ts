import { listFollowups } from "@/shared/lib/data/followupRepository";

export async function getFollowups() {
  return listFollowups();
}
