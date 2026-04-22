import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
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
      <Route path="/users" element={<WithLayout><UsersPage /></WithLayout>} />
      <Route path="/prisoners" element={<WithLayout><PrisonersPage /></WithLayout>} />
      <Route path="/locations" element={<WithLayout><LocationsPage /></WithLayout>} />
      <Route path="/incidents" element={<WithLayout><IncidentsPage /></WithLayout>} />
      <Route path="/visits" element={<WithLayout><VisitsPage /></WithLayout>} />
      <Route path="/labor" element={<WithLayout><LaborPage /></WithLayout>} />
      <Route path="/schedules" element={<WithLayout><SchedulesPage /></WithLayout>} />
      <Route path="/shifts" element={<WithLayout><ShiftsPage /></WithLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
