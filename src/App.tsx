import { AppShell } from './components/layout/AppShell';
import { DEFAULT_ROUTE, ROUTES } from './router/routes';
import { useHashRoute } from './router/useHashRoute';

function App() {
  const [path, navigate] = useHashRoute();
  const route = ROUTES.find((r) => r.path === path) ?? ROUTES.find((r) => r.path === DEFAULT_ROUTE)!;

  return (
    <AppShell activePath={route.path} onNavigate={navigate} route={route}>
      <route.Component />
    </AppShell>
  );
}

export default App;
