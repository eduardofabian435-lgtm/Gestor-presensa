import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase, handleFirestoreError, OperationType } from '../contexts/FirebaseContext';
import { format } from 'date-fns';
import { Check, X, Search, Filter, Save, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Student, ClassRoom, AttendanceRecord } from '../types';

const Attendance: React.FC = () => {
  const { user, isAdmin, isTeacher } = useFirebase();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedPolo, setSelectedPolo] = useState<'all' | 'salvador' | 'ilha'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [report, setReport] = useState('');
  const [incident, setIncident] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Fetch all classes for both admins and teachers
    const q = collection(db, 'classes');
    
    const unsub = onSnapshot(q, (snap) => {
      try {
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom)));
      } catch (err) {
        console.error("Erro ao processar turmas:", err);
        if (isMounted.current) setError("Erro ao carregar turmas.");
      }
    }, (err) => {
      console.error("Erro ao carregar turmas:", err);
      if (isMounted.current) setError("Erro ao carregar turmas.");
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setLoading(true);
      const q = query(collection(db, 'students'), where('classId', '==', selectedClass));
      const unsub = onSnapshot(q, (snap) => {
        try {
          const studentList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
          setStudents(studentList);
          
          // Initialize attendance state - all absent by default
          const initial: Record<string, 'present' | 'absent'> = {};
          studentList.forEach(s => {
            if (s.id) initial[s.id] = 'absent';
          });
          setAttendance(initial);
          setLoading(false);
        } catch (err) {
          console.error("Erro ao processar alunos:", err);
          if (isMounted.current) setError("Erro ao carregar lista de alunos.");
          setLoading(false);
        }
      }, (err) => {
        console.error("Erro ao carregar alunos:", err);
        if (isMounted.current) setError("Erro ao carregar lista de alunos.");
        setLoading(false);
      });
      return () => unsub();
    } else {
      setStudents([]);
      setAttendance({});
    }
  }, [selectedClass]);

  const handleToggle = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSave = async () => {
    if (!selectedClass || !user) return;
    setSaving(true);
    setError(null);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();
      const classData = classes.find(c => c.id === selectedClass);
      const polo = classData?.polo || 'salvador';

      // Save attendance only for present students
      Object.entries(attendance).forEach(([studentId, status]) => {
        if (status === 'present') {
          const attendanceRef = doc(collection(db, 'attendance'));
          batch.set(attendanceRef, {
            studentId,
            classId: selectedClass,
            polo,
            date: today,
            status: 'present',
            teacherId: user.uid,
            timestamp: now
          });
        }
      });
      
      // Save the class report if it exists
      if (report.trim()) {
        const reportRef = doc(collection(db, 'class_reports'));
        batch.set(reportRef, {
          classId: selectedClass,
          teacherId: user.uid,
          polo,
          date: today,
          content: report.trim(),
          timestamp: now
        });
      }

      // Save the incident if it exists
      if (incident.trim()) {
        const incidentRef = doc(collection(db, 'interruptions'));
        batch.set(incidentRef, {
          classId: selectedClass,
          teacherId: user.uid,
          polo,
          date: today,
          description: incident.trim(),
          timestamp: now
        });
      }
      
      await batch.commit();
      
      if (isMounted.current) {
        setSuccess(true);
        setError(null);
        setReport('');
        setIncident('');
        setTimeout(() => {
          if (isMounted.current) setSuccess(false);
        }, 3000);
      }
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      if (isMounted.current) {
        let msg = 'Erro ao salvar presença. Tente novamente.';
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) msg = `Erro: ${parsed.error}`;
        } catch (e) {}
        setError(msg);
        setTimeout(() => {
          if (isMounted.current) setError(null);
        }, 5000);
      }
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  const filteredStudents = students.filter(s => {
    const nameMatch = s.name?.toLowerCase().includes(search.toLowerCase()) || false;
    const regMatch = s.registrationNumber?.includes(search) || false;
    return nameMatch || regMatch;
  });

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Registro de Presença</h2>
          <p className="text-slate-500 font-medium">Selecione a turma e registre a participação dos alunos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {format(new Date(), 'dd/MM/yyyy')}
          </div>
        </div>
      </header>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Polo de Gestão</label>
            <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              <button
                onClick={() => {
                  setSelectedPolo('all');
                  setSelectedClass('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'all' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Todos
              </button>
              <button
                onClick={() => {
                  setSelectedPolo('salvador');
                  setSelectedClass('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'salvador' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Salvador
              </button>
              <button
                onClick={() => {
                  setSelectedPolo('ilha');
                  setSelectedClass('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'ilha' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Ilha
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Turma</label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-600 appearance-none"
              >
                <option value="">Selecione uma turma...</option>
                {classes
                  .filter(c => selectedPolo === 'all' || c.polo === selectedPolo)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Buscar Aluno</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Nome ou matrícula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-600"
              />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selectedClass ? (
            <motion.div
              key="no-class-selected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 text-center space-y-4"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Filter className="w-10 h-10" />
              </div>
              <p className="text-slate-400 font-bold text-lg">Selecione uma turma para carregar a lista de alunos</p>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading-students"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 text-center"
            >
              <div className="w-12 h-12 border-4 border-blue-50 border-t-[#1a36b1] rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 mt-6 font-bold text-lg">Carregando alunos...</p>
            </motion.div>
          ) : (
            <motion.div
              key="attendance-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden border border-slate-50 rounded-3xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-8 py-5">Matrícula</th>
                      <th className="px-8 py-5">Nome do Aluno</th>
                      <th className="px-8 py-5 text-center">Status de Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 text-xs font-black text-slate-400 font-mono">{student.registrationNumber}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1a36b1]/10 text-[#1a36b1] flex items-center justify-center text-xs font-black">
                              {student.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="font-bold text-slate-700">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleToggle(student.id)}
                              className={cn(
                                "flex items-center gap-2 px-8 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95",
                                attendance[student.id] === 'present'
                                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                                  : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200"
                              )}
                            >
                              <Check className={cn("w-4 h-4", attendance[student.id] === 'present' ? "block" : "hidden")} />
                              {attendance[student.id] === 'present' ? 'PRESENTE' : 'MARCAR PRESENÇA'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="md:hidden space-y-4">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="p-5 bg-slate-50/50 border border-slate-100 rounded-3xl space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1a36b1] text-white flex items-center justify-center font-black">
                        {student.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">{student.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{student.registrationNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggle(student.id)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black transition-all",
                          attendance[student.id] === 'present'
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                            : "bg-white text-slate-400 border border-slate-200"
                        )}
                      >
                        <Check className={cn("w-4 h-4", attendance[student.id] === 'present' ? "block" : "hidden")} />
                        {attendance[student.id] === 'present' ? 'PRESENTE' : 'MARCAR PRESENÇA'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Class Report & Incidents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-6 bg-slate-50/50 border border-slate-100 rounded-3xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#1a36b1]">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Relatório da Aula</h3>
                      <p className="text-xs text-slate-500 font-medium">O que foi trabalhado hoje?</p>
                    </div>
                  </div>
                  <textarea
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    placeholder="Ex: Hoje trabalhamos o capítulo 4..."
                    rows={4}
                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-600 resize-none"
                  />
                </div>

                <div className="space-y-4 p-6 bg-red-50/30 border border-red-100/50 rounded-3xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Intercorrências</h3>
                      <p className="text-xs text-slate-500 font-medium">Algum incidente ou observação crítica?</p>
                    </div>
                  </div>
                  <textarea
                    value={incident}
                    onChange={(e) => setIncident(e.target.value)}
                    placeholder="Ex: Aluno X teve um comportamento inadequado..."
                    rows={4}
                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-medium text-slate-600 resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-8 border-t border-slate-50">
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  Total de Alunos: <span className="text-slate-900">{students.length}</span>
                </div>
                
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="error-alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 mb-2"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-xs font-bold">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleSave}
                  disabled={saving || students.length === 0}
                  className={cn(
                    "w-full md:w-auto flex items-center justify-center gap-3 px-12 py-4 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                    success ? "bg-emerald-500 shadow-emerald-100" : "bg-[#f9a825] shadow-orange-900/20 hover:scale-105"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {saving ? (
                      <motion.div
                        key="saving"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      </motion.div>
                    ) : success ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        <span>SALVO COM SUCESSO!</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3"
                      >
                        <Save className="w-6 h-6" />
                        <span>REGISTRAR PARTICIPAÇÃO</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Attendance;
