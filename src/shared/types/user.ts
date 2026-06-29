export type UserRole = "prospect" | "commercial" | "admin";

export type User = {
 id: string;
 email: string;
 role: UserRole;
};
