import { createBrowserRouter, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import DashboardLayout from './layouts/DashboardLayout'; 
import DashboardPage from './pages/Dashboard'; 
import InvoicingLayout from './pages/invoicing/InvoicingLayout';
import BoletasPage from './pages/invoicing/BoletasPage';
import ResumenDiarioPage from './pages/invoicing/ResumenDiarioPage';
import NotasCreditoPage from './pages/invoicing/NotasCreditoPage';
import ProtectedRoute from './components/auth/ProtectedRoute'; 
import AuthPage from './pages/Auth'; 

// Lazy Loading para componentes pesados o nuevos
const RecibosPage = React.lazy(() => import('@/pages/invoicing/RecibosPage'));
const PartnerDocumentsPage = React.lazy(() => import('@/pages/PartnerDocuments'));

const LoadingFallback = () => (
  <div className="flex h-[50vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute resourcePath="/"><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'invoicing',
        element: <ProtectedRoute resourcePath="/invoicing"><InvoicingLayout /></ProtectedRoute>,
        children: [
          { index: true, element: <Navigate to="boletas" replace /> },
          { path: 'boletas', element: <BoletasPage /> },
          { path: 'resumen-diario', element: <ResumenDiarioPage /> },
          { path: 'notes-credito', element: <NotasCreditoPage /> },
          { 
            path: 'recibos', 
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <RecibosPage />
              </Suspense>
            ) 
          },
          { path: 'facturas', element: <div className="p-8 text-center text-textSecondary">Próximamente</div> },
        ],
      },
      {
        path: 'partner-documents',
        element: (
          <ProtectedRoute resourcePath="/partner-documents">
            <Suspense fallback={<LoadingFallback />}>
              <PartnerDocumentsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
