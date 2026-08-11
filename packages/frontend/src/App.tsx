import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { LandingPage } from '@/features/landing/routes/LandingPage';
import { LoginPage } from '@/features/auth/routes/LoginPage';
import { RegisterPage } from '@/features/auth/routes/RegisterPage';
import { DashboardPage } from '@/features/dashboard/routes/DashboardPage';
import { AssetsListPage } from '@/features/assets/routes/AssetsListPage';
import { AssetDetailsPage } from '@/features/assets/routes/AssetDetailsPage';
import { IncidentsListPage } from '@/features/incidents/routes/IncidentsListPage';
import { IncidentDetailPage } from '@/features/incidents/routes/IncidentDetailPage';
import { InspectionsListPage } from '@/features/inspections/routes/InspectionsListPage';
import { InspectionDetailPage } from '@/features/inspections/routes/InspectionDetailPage';
import { CamerasListPage } from '@/features/cameras/routes/CamerasListPage';
import { UsersListPage } from '@/features/users/routes/UsersListPage';
import { UserDetailPage } from '@/features/users/routes/UserDetailPage';
import { SettingsPage } from '@/features/settings/routes/SettingsPage';
import { ReportsListPage } from '@/features/reports/routes/ReportsListPage';
import { AnomalyReviewPage } from '@/features/anomalies/routes/AnomalyReviewPage';
import { AnomalyDetailPage } from '@/features/anomalies/routes/AnomalyDetailPage';
import { PredictionsPage } from '@/features/predictions/routes/PredictionsPage';
import { TelemetryDashboardPage } from '@/features/telemetry/routes/TelemetryDashboardPage';
import { WorkOrdersListPage } from '@/features/work-orders/routes/WorkOrdersListPage';
import { DigitalTwinMapPage } from '@/features/gis/routes/DigitalTwinMapPage';
import { AnalyticsPage } from '@/features/analytics/routes/AnalyticsPage';
import { SCADAControlPage } from '@/features/scada/routes/SCADAControlPage';
import { BIMViewerPage } from '@/features/bim/routes/BIMViewerPage';
import { DroneFleetPage } from '@/features/drones/routes/DroneFleetPage';
import { CompliancePage } from '@/features/compliance/routes/CompliancePage';
import { WarehouseDashboardPage } from '@/features/logistics/routes/WarehouseDashboardPage';

import { WebRtcCameraTransmitterPage } from '@/features/cameras/routes/WebRtcCameraTransmitterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/cam-broadcast" element={<WebRtcCameraTransmitterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <AssetsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse"
            element={
              <ProtectedRoute>
                <WarehouseDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:id"
            element={
              <ProtectedRoute>
                <AssetDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cameras"
            element={
              <ProtectedRoute>
                <CamerasListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/anomalies"
            element={
              <ProtectedRoute>
                <AnomalyReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/anomalies/:id"
            element={
              <ProtectedRoute>
                <AnomalyDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <PredictionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telemetry"
            element={
              <ProtectedRoute>
                <TelemetryDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/work-orders"
            element={
              <ProtectedRoute>
                <WorkOrdersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <DigitalTwinMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scada"
            element={
              <ProtectedRoute>
                <SCADAControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bim-twin"
            element={
              <ProtectedRoute>
                <BIMViewerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drone-fleet"
            element={
              <ProtectedRoute>
                <DroneFleetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance"
            element={
              <ProtectedRoute>
                <CompliancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <IncidentsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents/:id"
            element={
              <ProtectedRoute>
                <IncidentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspections"
            element={
              <ProtectedRoute>
                <InspectionsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspections/:id"
            element={
              <ProtectedRoute>
                <InspectionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <UsersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute requiredRole={['ADMIN']}>
                <UserDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
