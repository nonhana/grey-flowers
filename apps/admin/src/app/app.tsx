import { AppProviders } from './providers.js';
import { AdminShell } from './shell/admin-shell.js';

export const App = () => {
  return (
    <AppProviders>
      <AdminShell />
    </AppProviders>
  );
};
