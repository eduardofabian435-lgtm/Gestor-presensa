import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase, handleFirestoreError, OperationType } from '../contexts/FirebaseContext';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  UserPlus, 
  ChevronRight, 
  Clock,
  LayoutDashboard,
  UserCheck
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';

interface DashboardStats {
  activeGroups: number;
  activeStudents: number;
  classesThisMonth: number;
  incidents: number;
}

interface RecentAttendance {
  id: string;
  classId: string;
  date: string;
  teacherId: string;
  presentCount: number;
  totalCount: number;
}

interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  studentCount: number;
}

const Dashboard: React.FC = () => {
  const { profile } = useFirebase();
  const navigate = useNavigate();
  const [selectedPolo, setSelectedPolo] = useState<'all' | 'salvador' | 'ilha'>('all');
  const [stats, setStats] = useState<DashboardStats>({
    activeGroups: 0,
    activeStudents: 0,
    classesThisMonth: 0,
    incidents: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [teachersMap, setTeachersMap] = useState<Record<string, string>>({});
  const [classesMap, setClassesMap] = useState<Record<string, string>>({});
  const [classesPoloMap, setClassesPoloMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [simulatedTeacherId, setSimulatedTeacherId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    const firstDayOfMonth = startOfMonth(new Date());
    const isAdmin = profile?.role === 'admin';
    const userId = isAdmin && simulatedTeacherId ? simulatedTeacherId : profile?.uid;

    // 1. Listen for active groups (classes)
    const qClasses = collection(db, 'classes');

    const unsubGroups = onSnapshot(qClasses, (snap) => {
      const groupsData = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        polo: doc.data().polo,
        studentCount: 0 
      }));
      
      const cMap: Record<string, string> = {};
      const pMap: Record<string, string> = {};
      snap.docs.forEach(d => {
        cMap[d.id] = d.data().name;
        pMap[d.id] = d.data().polo;
      });
      setClassesMap(cMap);
      setClassesPoloMap(pMap);

      const filteredGroups = groupsData.filter(g => selectedPolo === 'all' || g.polo === selectedPolo);
      setGroups(filteredGroups.slice(0, 5));
      setStats(prev => ({ ...prev, activeGroups: filteredGroups.length }));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'classes');
    });

    // 2. Listen for active students
    const fetchData = async () => {
      if (!userId) return;

      // 2. Listen for active students
      const qStudents = collection(db, 'students');

      const unsubStudentsReal = onSnapshot(qStudents, (snap) => {
        const counts: Record<string, number> = {};
        let filteredStudentCount = 0;
        snap.docs.forEach(doc => {
          const data = doc.data();
          const classId = data.classId;
          const studentPolo = data.polo;
          
          if (selectedPolo === 'all' || studentPolo === selectedPolo) {
            filteredStudentCount++;
            counts[classId] = (counts[classId] || 0) + 1;
          }
        });

        setGroups(prev => prev.map(g => ({
          ...g,
          studentCount: counts[g.id] || 0
        })));

        setStats(prev => ({ ...prev, activeStudents: filteredStudentCount }));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'students');
      });

      // 4. Listen for attendance
      const qAttendance = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(100));

      const unsubAttendanceReal = onSnapshot(qAttendance, (snap) => {
        const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sessions: Record<string, any> = {};
        
        records.forEach((r: any) => {
          const classPolo = r.polo || ''; // Use polo from record if available, or we'll need to check classesPoloMap
          if (selectedPolo !== 'all' && classPolo !== selectedPolo) return;

          const key = `${r.date}_${r.classId}`;
          if (!sessions[key]) {
            sessions[key] = {
              id: key,
              classId: r.classId,
              date: r.date,
              teacherId: r.teacherId,
              presentCount: 0,
              totalCount: 0,
              timestamp: r.timestamp
            };
          }
          sessions[key].totalCount++;
          if (r.status === 'present') sessions[key].presentCount++;
        });

        const recentSessions = Object.values(sessions)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 4) as any[];

        setRecentAttendance(recentSessions);
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      });

      // 5. Classes this month count
      const currentMonthStr = format(new Date(), 'yyyy-MM');
      const qMonth = query(
        collection(db, 'attendance'),
        where('date', '>=', `${currentMonthStr}-01`),
        where('date', '<=', `${currentMonthStr}-31`)
      );
      
      const unsubMonthReal = onSnapshot(qMonth, (snap) => {
        const monthSessions = new Set();
        snap.docs.forEach(doc => {
          const data = doc.data();
          const classPolo = data.polo || '';
          if (selectedPolo === 'all' || classPolo === selectedPolo) {
            monthSessions.add(`${data.date}_${data.classId}`);
          }
        });
        setStats(prev => ({ ...prev, classesThisMonth: monthSessions.size }));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      });

      // 6. Listen for interruptions
      const qInterruptions = collection(db, 'interruptions');
      const unsubInterruptions = onSnapshot(qInterruptions, (snap) => {
        const filteredIncidents = snap.docs.filter(doc => {
          const data = doc.data();
          const incidentPolo = data.polo || '';
          return selectedPolo === 'all' || incidentPolo === selectedPolo;
        });
        setStats(prev => ({ ...prev, incidents: filteredIncidents.length }));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'interruptions');
      });

      return () => {
        unsubStudentsReal();
        unsubAttendanceReal();
        unsubMonthReal();
        unsubInterruptions();
      };
    };

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const tMap: Record<string, string> = {};
      const tList: any[] = [];
      snap.docs.forEach(d => {
        tMap[d.id] = d.data().name;
        if (d.data().role === 'teacher') {
          tList.push({ uid: d.id, ...d.data() });
        }
      });
      setTeachersMap(tMap);
      setTeachers(tList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    let cleanup: any;
    fetchData().then(c => cleanup = c);

    return () => {
      unsubGroups();
      unsubUsers();
      if (cleanup) cleanup();
    };
  }, [profile, simulatedTeacherId, selectedPolo]);

  const statCards = [
    { label: 'Grupos Ativos', value: stats.activeGroups, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/groups' },
    { label: 'Alunos Ativos', value: stats.activeStudents, icon: UserPlus, color: 'text-amber-500', bgColor: 'bg-amber-50', path: '/students' },
    { label: 'Aulas este Mês', value: stats.classesThisMonth, icon: Calendar, color: 'text-green-500', bgColor: 'bg-green-50', path: '/reports' },
    { label: 'Intercorrências', value: stats.incidents, icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50', path: '/interruptions' },
  ];

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Olá, {profile?.name?.split(' ')[0] || 'Eduardo'}!
            </h1>
            {profile?.role === 'admin' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                  <Users className="w-4 h-4 text-[#1a36b1]" />
                  <select 
                    value={simulatedTeacherId || ''} 
                    onChange={(e) => setSimulatedTeacherId(e.target.value || null)}
                    className="bg-transparent text-[#1a36b1] text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
                  >
                    <option value="">Visão Geral (Admin)</option>
                    {teachers.map(t => (
                      <option key={t.uid} value={t.uid}>Ver como: {t.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  <button
                    onClick={() => setSelectedPolo('all')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'all' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedPolo('salvador')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'salvador' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Salvador
                  </button>
                  <button
                    onClick={() => setSelectedPolo('ilha')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'ilha' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Ilha
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-slate-500 font-medium mt-1 capitalize">
            {format(new Date(), "eeee, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={() => navigate('/attendance')}
          className="bg-[#f9a825] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#e69715] transition-all shadow-xl shadow-orange-100 active:scale-95"
        >
          <UserCheck className="w-6 h-6" />
          Registrar Presença
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(stat.path)}
              className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all cursor-pointer"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-4xl font-black text-slate-900">{stat.value}</p>
              </div>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bgColor, stat.color)}>
                <Icon className="w-7 h-7" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Attendance */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 pb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Últimas Presenças</h3>
            <Link to="/attendance" className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline">
              Ver Todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="p-6 space-y-4 flex-1">
            {loading ? (
              <div className="flex justify-center py-10"><Clock className="animate-spin text-slate-300" /></div>
            ) : recentAttendance.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium">Nenhuma presença registrada</div>
            ) : (
              recentAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 border border-slate-50 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{classesMap[record.classId] || 'Carregando...'}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {format(new Date(record.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })} • {teachersMap[record.teacherId] || 'Professor'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{record.presentCount}/{record.totalCount}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">presentes</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Groups List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 pb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Grupos</h3>
            <Link to="/groups" className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline">
              Gerenciar <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-6 space-y-4 flex-1">
            {loading ? (
              <div className="flex justify-center py-10"><Clock className="animate-spin text-slate-300" /></div>
            ) : groups.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium">Nenhum grupo cadastrado</div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 border border-slate-50 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#f9a825] text-white flex items-center justify-center shadow-lg shadow-orange-100">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{group.name}</p>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                        {group.description || 'Sem descrição'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{group.studentCount}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">alunos</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
