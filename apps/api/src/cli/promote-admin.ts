import process from 'node:process';
import { z } from 'zod';

import { createDependencies } from '../bootstrap/dependencies.js';
import { readApiEnvironment } from '../env.js';

function readEmailArgument(arguments_: string[]) {
  if (
    arguments_.length !== 2 ||
    arguments_[0] !== '--email' ||
    !arguments_[1]
  ) {
    throw new Error('Usage: auth:promote-admin -- --email <email>');
  }

  return z.email().trim().parse(arguments_[1]);
}

async function main() {
  const email = readEmailArgument(process.argv.slice(2));
  if (!email) throw new Error('Usage: auth:promote-admin -- --email <email>');

  const environment = readApiEnvironment(process.env);
  const dependencies = createDependencies(environment);

  try {
    const result = await dependencies.auth.promoteToAdmin(email);
    if (result === 'not_found') {
      process.stderr.write('No user exists for the supplied email.\n');
      process.exitCode = 1;
      return;
    }

    if (result === 'already_admin') {
      process.stdout.write('User is already an ADMIN.\n');
      return;
    }

    process.stdout.write(
      'User role promoted to ADMIN and active sessions revoked.\n',
    );
  } finally {
    await dependencies.prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Unable to promote administrator.'}\n`,
  );
  process.exitCode = 1;
});
