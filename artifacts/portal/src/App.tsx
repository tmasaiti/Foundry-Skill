import { Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import OnboardingSurvey from "@/pages/OnboardingSurvey";
import Dashboard from "@/pages/Dashboard";
import GettingStarted from "@/pages/GettingStarted";
import AppsPage from "@/pages/AppsPage";
import AppDetail from "@/pages/AppDetail";
import AppNew from "@/pages/AppNew";
import WorkspacesPage from "@/pages/WorkspacesPage";
import WorkspaceDetail from "@/pages/WorkspaceDetail";
import TeamPage from "@/pages/TeamPage";
import BillingPage from "@/pages/BillingPage";
import AuditLogsPage from "@/pages/AuditLogsPage";
import SettingsPage from "@/pages/SettingsPage";
import SAMLList from "@/pages/SAMLList";
import SAMLNew from "@/pages/SAMLNew";
import SAMLDetail from "@/pages/SAMLDetail";
import SAMLTest from "@/pages/SAMLTest";
import SCIMConfig from "@/pages/SCIMConfig";
import SCIMUsers from "@/pages/SCIMUsers";
import SCIMLogs from "@/pages/SCIMLogs";
import SCIMSetup from "@/pages/SCIMSetup";
import IdPList from "@/pages/IdPList";
import IdPNew from "@/pages/IdPNew";
import IdPDetail from "@/pages/IdPDetail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;

  return (
    <Switch>
      <Route path="/"                   component={Dashboard} />
      <Route path="/getting-started"    component={GettingStarted} />
      <Route path="/apps/new"           component={AppNew} />
      <Route path="/apps/:appId"        component={AppDetail} />
      <Route path="/apps"               component={AppsPage} />
      <Route path="/workspaces"         component={WorkspacesPage} />
      <Route path="/workspaces/:id"     component={WorkspaceDetail} />
      <Route path="/team"               component={TeamPage} />
      <Route path="/billing"            component={BillingPage} />
      <Route path="/audit-logs"         component={AuditLogsPage} />
      <Route path="/settings"           component={SettingsPage} />
      <Route path="/saml/new"           component={SAMLNew} />
      <Route path="/saml/:sspId/test"   component={SAMLTest} />
      <Route path="/saml/:sspId"        component={SAMLDetail} />
      <Route path="/saml"               component={SAMLList} />
      <Route path="/scim/users"         component={SCIMUsers} />
      <Route path="/scim/logs"          component={SCIMLogs} />
      <Route path="/scim/setup-guide"   component={SCIMSetup} />
      <Route path="/scim"               component={SCIMConfig} />
      <Route path="/identity-providers/new"  component={IdPNew} />
      <Route path="/identity-providers/:id"  component={IdPDetail} />
      <Route path="/identity-providers"      component={IdPList} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/login"              component={Login} />
          <Route path="/signup"             component={Signup} />
          <Route path="/verify-email"       component={VerifyEmail} />
          <Route path="/onboarding/survey"  component={OnboardingSurvey} />
          <Route component={ProtectedRoutes} />
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  );
}
