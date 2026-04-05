import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../contexts/FirebaseContext';
import { 
  Users, 
  School, 
  UserCheck, 
  BookOpen, 
  Search, 
  Loader2, 
  ChevronRight,
  Calendar as CalendarIcon,
  GraduationCap,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile, ClassRoom, Student, AttendanceRecord } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Teachers: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Fetch all teachers
    const unsubUsers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'teacher')), (snap) => {
      setTeachers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    // Fetch all classes
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom)));
    });

    // Fetch all students
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    // Fetch recent attendance
    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubClasses();
      unsubStudents();
      unsubAttendance();
    };
  }, []);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTeacherStats = (teacherId: string) => {
    const teacherClasses = classes.filter(c => c.teacherId === teacherId);
    const teacherStudents = students.filter(s => teacherClasses.some(c => c.id === s.classId));
    const teacherAttendance = attendance.filter(a => a.teacherId === teacherId);
    
    return {
      classesCount: teacherClasses.length,
      studentsCount: teacherStudents.length,
      attendanceCount: teacherAttendance.length,
      classes: teacherClasses,
      recentAttendance: teacherAttendance.slice(0, 5)
    };
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2">Apenas administradores podem ver as informações dos professores.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-[#1a36b1]" />
            Visão dos Professores
          </h1>
          <p className="text-slate-500 font-medium mt-1">Acompanhe o desempenho e as turmas de cada professor</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Teachers List */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar professor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Lista de Professores</h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 text-[#1a36b1] animate-spin" />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic">Nenhum professor encontrado.</div>
              ) : (
                filteredTeachers.map((teacher) => {
                  const stats = getTeacherStats(teacher.uid);
                  const isSelected = selectedTeacher?.uid === teacher.uid;
                  return (
                    <button
                      key={teacher.uid}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={cn(
                        "w-full p-6 flex items-center justify-between transition-all group text-left",
                        isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                          isSelected ? "bg-[#1a36b1] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-[#1a36b1]/10 group-hover:text-[#1a36b1]"
                        )}>
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{teacher.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {stats.classesCount} Turmas • {stats.studentsCount} Alunos
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-5 h-5 transition-transform", isSelected ? "text-[#1a36b1] translate-x-1" : "text-slate-300 group-hover:text-slate-400")} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Teacher Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!selectedTeacher ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[400px] bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center p-10 text-center"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                  <BookOpen className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-400">Selecione um professor</h3>
                <p className="text-slate-400 mt-2 max-w-xs">Escolha um professor na lista ao lado para ver suas turmas, alunos e atividades recentes.</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedTeacher.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Teacher Profile Header */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-[#1a36b1] text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-900/20">
                      {selectedTeacher.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedTeacher.name}</h2>
                      <p className="text-slate-500 font-medium">{selectedTeacher.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 bg-blue-50 text-[#1a36b1] text-[10px] font-black uppercase tracking-widest rounded-full">Professor</span>
                        <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full">ID: {selectedTeacher.uid.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teacher Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Turmas Ativas', value: getTeacherStats(selectedTeacher.uid).classesCount, icon: School, color: 'text-blue-600', bgColor: 'bg-blue-50' },
                    { label: 'Total de Alunos', value: getTeacherStats(selectedTeacher.uid).studentsCount, icon: GraduationCap, color: 'text-amber-500', bgColor: 'bg-amber-50' },
                    { label: 'Registros de Presença', value: getTeacherStats(selectedTeacher.uid).attendanceCount, icon: UserCheck, color: 'text-green-500', bgColor: 'bg-green-50' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                      </div>
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bgColor, stat.color)}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Assigned Classes */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Turmas Atribuídas</h3>
                      <School className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="p-6 space-y-4">
                      {getTeacherStats(selectedTeacher.uid).classes.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 italic">Nenhuma turma atribuída.</p>
                      ) : (
                        getTeacherStats(selectedTeacher.uid).classes.map(c => (
                          <div key={c.id} className="p-5 rounded-3xl bg-slate-50/50 border border-slate-50 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                                <School className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{c.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  {students.filter(s => s.classId === c.id).length} Alunos
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1a36b1] transition-colors" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Atividade Recente</h3>
                      <Clock className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="p-6 space-y-4">
                      {getTeacherStats(selectedTeacher.uid).recentAttendance.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 italic">Nenhuma atividade recente.</p>
                      ) : (
                        getTeacherStats(selectedTeacher.uid).recentAttendance.map(a => (
                          <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
                                a.status === 'present' ? "bg-green-500 text-white shadow-green-100" : "bg-red-500 text-white shadow-red-100"
                              )}>
                                <UserCheck className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {students.find(s => s.id === a.studentId)?.name || 'Aluno'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  {classes.find(c => c.id === a.classId)?.name} • {format(new Date(a.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              a.status === 'present' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                            )}>
                              {a.status === 'present' ? 'P' : 'F'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Teachers;
