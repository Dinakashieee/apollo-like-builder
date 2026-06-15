import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Intelligence from "./pages/Intelligence";
import Targets from "./pages/Targets";
import Composer from "./pages/Composer";
import Automation from "./pages/Automation";
import Settings from "./pages/Settings";
import Company from "./pages/Company";
import Help from "./pages/Help";
import Support from "./pages/Support";
import Admin from "./pages/Admin";
import Reminders from "./pages/Reminders";
import GettingStarted from "./pages/GettingStarted";
import SignalHire from "./pages/SignalHire";
import EmailHealth from "./pages/EmailHealth";
import LandingPages from "./pages/LandingPages";
import PublicLandingPage from "./pages/PublicLandingPage";
import Demo from "./pages/Demo";
import { CustomDomainGate } from "./components/CustomDomainGate";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <WorkspaceProvider>
              <CustomDomainGate>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/p/:slug" element={<PublicLandingPage />} />
              <Route path="/:prefix/:slug" element={<PublicLandingPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/app" element={<AppLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="getting-started" element={<GettingStarted />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="signalhire" element={<SignalHire />} />
                  <Route path="pages" element={<LandingPages />} />
                  <Route path="email-health" element={<EmailHealth />} />
                  
                  <Route path="intelligence" element={<Intelligence />} />
                  <Route path="targets" element={<Targets />} />
                  <Route path="composer" element={<Composer />} />
                  <Route path="automation" element={<Automation />} />
                  <Route path="reminders" element={<Reminders />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="company" element={<Company />} />
                  <Route path="help" element={<Help />} />
                  <Route path="support" element={<Support />} />
                  <Route path="admin" element={<Admin />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
              </Routes>
              </CustomDomainGate>
            </WorkspaceProvider>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
