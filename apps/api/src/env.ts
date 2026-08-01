import { z } from 'zod';

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65_535),
  HANA_DATABASE_URL: z.string().url(),
});

export type ApiEnvironment = z.infer<typeof environmentSchema>;

export function readApiEnvironment(
  environment: NodeJS.ProcessEnv,
): ApiEnvironment {
  return environmentSchema.parse(environment);
}
