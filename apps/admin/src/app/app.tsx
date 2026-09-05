import { AppProviders } from './providers';
import { AdminShell } from './shell/admin-shell';

export const App = () => {
  return (
    <AppProviders>
      <AdminShell />
    </AppProviders>
  );
};
