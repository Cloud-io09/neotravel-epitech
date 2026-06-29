export async function markFollowupSent(followupId: string) {
 return {
  followupId,
  status: "SENT"
 };
}
