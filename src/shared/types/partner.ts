export type PartnerStatus = "TO_CONFIRM" | "OPTION_HELD" | "CONFIRMED" | "UNAVAILABLE";

export type Partner = {
 id: string;
 name: string;
 zone: string;
 capacityHint: number;
 status: PartnerStatus;
};
