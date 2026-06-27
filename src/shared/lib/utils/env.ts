export function getEnv(name: string) {
 const value = process.env[name];
 if (!value) throw new Error(`Missing env var: ${name}`);
 return value;
}
