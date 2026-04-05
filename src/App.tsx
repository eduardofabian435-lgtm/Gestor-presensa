import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import Admin from './components/Admin';
import Groups from './components/Groups';
import Calendar from './components/Calendar';
import Reports from './components/Reports';
import Students from './components/Students';
import Teachers from './components/Teachers';
import Interruptions from './components/Interruptions';
import VulnerabilityMap from './components/VulnerabilityMap';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, profile, loading, isAdmin } = useFirebase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="rounded-full h-12 w-12 border-b-2 border-[#1a36b1]"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="groups" element={<Groups />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="reports" element={<Reports />} />
          <Route path="interruptions" element={<Interruptions />} />
          <Route path="students" element={<Students />} />
          <Route path="map" element={<VulnerabilityMap />} />
          <Route
            path="teachers"
            element={
              <ProtectedRoute adminOnly>
                <Teachers />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let details = "";
      
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          errorMessage = "Erro de permissão ou banco de dados.";
          details = `${parsed.operationType} em ${parsed.path}: ${parsed.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" translate="no">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ops! Algo deu errado</h2>
              <p className="text-slate-500 font-medium">{errorMessage}</p>
              {details && (
                <p className="text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg break-all">
                  {details}
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-[#1a36b1] text-white rounded-2xl font-black shadow-xl shadow-blue-900/20 hover:scale-105 transition-all active:scale-95"
            >
              RECARREGAR PÁGINA
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
