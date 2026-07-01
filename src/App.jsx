import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth";
import { LangProvider } from "./i18n";
import LoginPage from "./LoginPage";
import HARSApp from "./HARSDashboard";

function AppShell() {
  const { user, loading, logout } = useAuth();

  // One-time cleanup: remove old IndexedDB data and migration flag
  useEffect(() => {
    try { indexedDB.deleteDatabase("hars_db"); } catch {}
  }, []);

  if (loading) return null;
  if (!user) return <LoginPage />;

  return <HARSApp currentUser={user} onLogout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <LangProvider>
        <AppShell />
      </LangProvider>
    </AuthProvider>
  );
}
