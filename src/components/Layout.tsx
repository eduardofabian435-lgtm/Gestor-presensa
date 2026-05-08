import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useFirebase } from '../contexts/FirebaseContext';
import { 
  LayoutDashboard, 
  UserCheck, 
  Calendar, 
  FileText, 
  Users, 
  LogOut, 
  Settings as SettingsIcon,
  ChevronDown,
  X,
  Menu,
  BookOpen,
  AlertTriangle,
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const Layout: React.FC = () => {
  const { profile, isAdmin } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Registrar Presença', path: '/attendance', icon: UserCheck },
    { name: 'Calendário', path: '/calendar', icon: Calendar },
    { name: 'Relatórios', path: '/reports', icon: FileText },
    { name: 'Intercorrências', path: '/interruptions', icon: AlertTriangle },
    { name: 'Mapa de Vulnerabilidade', path: '/map', icon: MapIcon },
    { name: 'Grupos', path: '/groups', icon: Users },
    { name: 'Alunos', path: '/students', icon: Users },
    { name: 'Administração', path: '/admin', icon: SettingsIcon },
    ...(isAdmin ? [
      { name: 'Professores', path: '/teachers', icon: BookOpen },
    ] : []),
  ];

  const SidebarContent = () => (
    <>
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Sistema de Presença</h1>
            <p className="text-sm text-white/60 font-medium tracking-wide">Controle Educacional</p>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-white/60 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-4 px-6 py-4 rounded-xl text-base font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-[#f9a825] text-white shadow-lg shadow-orange-900/20" 
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn(
                "w-6 h-6 transition-transform group-hover:scale-110",
                isActive ? "text-white" : "text-white/70"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-6 mt-auto border-t border-white/10">
        <div className="flex items-center gap-4 px-2 py-3 group cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-[#f9a825] flex items-center justify-center text-white text-lg font-black shadow-lg border-2 border-white/10 shrink-0">
            {profile?.name?.[0]?.toUpperCase() || 'E'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{profile?.name || 'Eduardo Fabian'}</p>
            <p className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">
              {profile?.role === 'admin' ? 'Administrador' : 'Professor'}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
        </div>
        
        <button
          onClick={handleLogout}
          className="mt-4 w-full flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair do Sistema
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden" translate="no">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-[#1a36b1] flex flex-col text-white shadow-2xl z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 bg-[#1a36b1] flex items-center justify-between px-6 z-30 shadow-md shrink-0">
          <h1 className="text-lg font-black text-white tracking-tight">Sistema de Presença</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-auto bg-slate-50">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Layout;
