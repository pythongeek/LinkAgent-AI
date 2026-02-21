import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Personas = lazy(() => import('./pages/Personas'));
const PersonaCreate = lazy(() => import('./pages/PersonaCreate'));
const ContentStudio = lazy(() => import('./pages/ContentStudio'));
const ContentHistory = lazy(() => import('./pages/ContentHistory'));
const TrendExplorer = lazy(() => import('./pages/TrendExplorer'));
const CompetitorAnalysis = lazy(() => import('./pages/CompetitorAnalysis'));
const ProfileAudit = lazy(() => import('./pages/ProfileAudit'));
const Settings = lazy(() => import('./pages/Settings'));
const ImageGenerator = lazy(() => import('./pages/ImageGenerator'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Main App Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/personas" element={<Personas />} />
                <Route path="/personas/create" element={<PersonaCreate />} />
                <Route path="/personas/edit/:id" element={<PersonaCreate />} />
                <Route path="/content/studio" element={<ContentStudio />} />
                <Route path="/content/history" element={<ContentHistory />} />
                <Route path="/trends" element={<TrendExplorer />} />
                <Route path="/competitors" element={<CompetitorAnalysis />} />
                <Route path="/audit" element={<ProfileAudit />} />
                <Route path="/images" element={<ImageGenerator />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
