import { describe, expect, it } from "vitest";

import { getSupabaseServerConfig } from "./server";

describe("getSupabaseServerConfig", () => {
  it("lit les variables d'environnement au moment de l'appel", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "first-key",
    };

    expect(getSupabaseServerConfig(env).serviceRoleKey).toBe("first-key");

    env.SUPABASE_SERVICE_ROLE_KEY = "second-key";

    expect(getSupabaseServerConfig(env)).toEqual({
      url: "http://127.0.0.1:54321",
      serviceRoleKey: "second-key",
    });
  });

  it("échoue clairement si une variable serveur manque", () => {
    expect(() => getSupabaseServerConfig({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" }))
      .toThrow("Missing Supabase server environment variables: SUPABASE_SERVICE_ROLE_KEY");
  });
});
