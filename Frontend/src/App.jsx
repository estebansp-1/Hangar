import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import SmoothScroll from './components/layout/SmoothScroll';
import { Footer, PageTransition, Preloader, RequireAuth, Toasts } from './components/layout/Chrome';
import Assist from './components/layout/Assist';
import { useAuth } from './store/auth';
import Home from './pages/Home';

// Code-splitting por ruta
const Projects = lazy(() => import('./pages/Projects'));
const Property = lazy(() => import('./pages/Property'));
const Styles = lazy(() => import('./pages/Styles'));
const StyleDetail = lazy(() => import('./pages/StyleDetail'));
const Services = lazy(() => import('./pages/Services'));
const Walkthrough = lazy(() => import('./pages/Walkthrough'));
const Account = lazy(() => import('./pages/Account'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Access = lazy(() => import('./pages/auth/Access').then((m) => ({ default: m.Access })));
const admin = (name) => lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m[name] })));
const AdminLayout = admin('AdminLayout');
const Dashboard = admin('Dashboard');
const AdminProperties = admin('Properties');
const PropertyEditor = admin('PropertyEditor');
const AdminStyles = admin('StylesAdmin');
const StyleEditor = admin('StyleEditor');
const AdminRequests = admin('Requests');
const AdminUsers = admin('Users');

export default function App() {
  const location = useLocation();
  const refresh = useAuth((s) => s.refresh);
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    refresh();
  }, [refresh]);

  const routes = (
    <Suspense fallback={<div className="page" />}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/proyectos" element={<Projects />} />
        <Route path="/proyectos/:slug" element={<Property />} />
        <Route path="/estilos" element={<Styles />} />
        <Route path="/estilos/:slug" element={<StyleDetail />} />
        <Route path="/servicios" element={<Services />} />
        <Route path="/recorrido" element={<Walkthrough />} />
        <Route path="/acceso" element={<Access />} />
        <Route path="/login" element={<Navigate to="/acceso" replace />} />
        <Route path="/registro" element={<Navigate to="/acceso?tab=signup" replace />} />
        <Route path="/recuperar" element={<Navigate to="/acceso?tab=recover" replace />} />
        <Route path="/cuenta" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="propiedades" element={<AdminProperties />} />
          <Route path="propiedades/nueva" element={<PropertyEditor />} />
          <Route path="propiedades/:id" element={<PropertyEditor />} />
          <Route path="estilos" element={<AdminStyles />} />
          <Route path="estilos/nuevo" element={<StyleEditor />} />
          <Route path="estilos/:id" element={<StyleEditor />} />
          <Route path="solicitudes" element={<AdminRequests />} />
          <Route path="usuarios" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );

  return (
    <>
      <Preloader />
      <SmoothScroll />
      <Navbar />
      {isAdmin ? routes : <PageTransition>{routes}</PageTransition>}
      <Footer />
      <Toasts />
      <Assist />
    </>
  );
}
