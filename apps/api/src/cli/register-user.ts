import { authRegisterInputSchema } from '@grey-flowers/contracts';
import process from 'node:process';

import { createDependencies } from '../bootstrap/dependencies.js';
import { readApiEnvironment } from '../env.js';

function readArguments(arguments_: string[]) {
  const flags = arguments_.filter((argument_) => argument_ !== '--');
  const lookup = new Map<string, string>();
  for (let index = 0; index < flags.length; index += 1) {
    const argument_ = flags[index];
    const value = flags[index + 1];
    if (!argument_?.startsWith('--') || !value) {
      throw new Error(
        'Usage: auth:register-user -- --username <username> --email <email> --password <password> [--site <url>]',
      );
    }
    lookup.set(argument_, value);
    index += 1;
  }

  const usage = new Error(
    'Usage: auth:register-user -- --username <username> --email <email> --password <password> [--site <url>]',
  );

  const username = lookup.get('--username');
  const email = lookup.get('--email');
  const password = lookup.get('--password');
  if (!username || !email || !password) throw usage;

  const parsed = authRegisterInputSchema.safeParse({
    username,
    email,
    password,
    ...(lookup.get('--site') === undefined
      ? {}
      : { site: lookup.get('--site') }),
  });
  if (!parsed.success) throw usage;

  return parsed.data;
}

async function main() {
  const input = readArguments(process.argv.slice(2));

  const environment = readApiEnvironment(process.env);
  const dependencies = createDependencies(environment);

  try {
    const user = await dependencies.auth.register(input);
    process.stdout.write(
      `Registered user ${user.username} (id=${user.id}, email=${user.email}).\n`,
    );
  } finally {
    await dependencies.prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Unable to register user.'}\n`,
  );
  process.exitCode = 1;
});
