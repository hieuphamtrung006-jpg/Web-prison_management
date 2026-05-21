import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";
import DashboardPage from "./pages/DashboardPage";
import IncidentsPage from "./pages/IncidentsPage";
import LaborPage from "./pages/LaborPage";
import LocationsPage from "./pages/LocationsPage";
import LoginPage from "./pages/LoginPage";
import PrisonersPage from "./pages/PrisonersPage";
import SchedulesPage from "./pages/SchedulesPage";
import ShiftsPage from "./pages/ShiftsPage";
import UsersPage from "./pages/UsersPage";
import VisitsPage from "./pages/VisitsPage";

function WithLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<WithLayout><DashboardPage /></WithLayout>} />
      <Route
        path="/users"
        element={
          <WithLayout>
            <RoleBasedRoute allowedRoles={["Admin", "Warden"]}>
              <UsersPage />
            </RoleBasedRoute>
          </WithLayout>
        }
      />
      <Route path="/prisoners" element={<WithLayout><PrisonersPage /></WithLayout>} />
      <Route
        path="/locations"
        element={
          <WithLayout>
            <RoleBasedRoute allowedRoles={["Admin", "Warden", "Guard"]}>
              <LocationsPage />
            </RoleBasedRoute>
          </WithLayout>
        }
      />
      <Route
        path="/incidents"
        element={
          <WithLayout>
            <RoleBasedRoute allowedRoles={["Admin", "Warden", "Guard"]}>
              <IncidentsPage />
            </RoleBasedRoute>
          </WithLayout>
        }
      />
      <Route path="/visits" element={<WithLayout><VisitsPage /></WithLayout>} />
      <Route
        path="/labor"
        element={
          <WithLayout>
            <RoleBasedRoute allowedRoles={["Admin", "Warden", "Guard"]}>
              <LaborPage />
            </RoleBasedRoute>
          </WithLayout>
        }
      />
      <Route path="/schedules" element={<WithLayout><SchedulesPage /></WithLayout>} />
      <Route
        path="/shifts"
        element={
          <WithLayout>
            <RoleBasedRoute allowedRoles={["Admin", "Warden", "Guard"]}>
              <ShiftsPage />
            </RoleBasedRoute>
          </WithLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
