import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Library     from "@/pages/Library";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Marketplace from "@/pages/Marketplace";
import Profile     from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import Messages    from "@/pages/Messages";
import AddBook     from "@/pages/AddBook";
import BookDetail  from "@/pages/BookDetail";
import Exchanges         from "@/pages/Exchanges";
import PendingDeliveries from "@/pages/PendingDeliveries";
const Docs = lazy(() => import("@/pages/Docs"));
import AuthLayout from "@/layouts/AuthLayout";
import AppLayout from "@/layouts/AppLayout";
import ProtectedRoute from "@/layouts/ProtectedRoute";


export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/docs" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen text-sm text-gray-400">Cargando documentación...</div>}><Docs /></Suspense>} />

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* ProtectedRoute -> AppLayout -> page */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          <Route path="/mi-biblioteca"  element={<Library />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/analytics"     element={<Analytics />} />
          <Route path="/explorar"      element={<Navigate to="/marketplace" replace />} />
          <Route path="/marketplace"   element={<Marketplace />} />
          <Route path="/publicar"      element={<AddBook />} />
          <Route path="/intercambios"        element={<Exchanges />} />
          <Route path="/entregas-pendientes" element={<PendingDeliveries />} />
          <Route path="/mensajes"      element={<Messages />} />
          <Route path="/perfil"          element={<Profile />} />
          <Route path="/perfil/editar" element={<EditProfile />} />
          <Route path="/perfil/:id"    element={<Profile />} />
          <Route path="/configuracion" element={<Navigate to="/dashboard" replace />} />
          <Route path="/libro/:id"     element={<BookDetail />} />

        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
