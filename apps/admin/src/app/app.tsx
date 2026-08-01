import { AppProviders } from './providers.js';
import { AdminShell } from './shell/admin-shell.js';

export function App() {
  return (
    <AppProviders>
      <AdminShell />
    </AppProviders>
  );
}
