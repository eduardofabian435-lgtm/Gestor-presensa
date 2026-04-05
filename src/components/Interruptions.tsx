import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase, safeFormatDate } from '../contexts/FirebaseContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  School, 
  Search, 
  Filter,
  Save,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ClassRoom, Interruption } from '../types';

const Interruptions: React.FC = () => {
  const { user, isAdmin } = useFirebase();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [interruptions, setInterruptions] = useState<Interruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolo, setSelectedPolo] = useState<'all' | 'salvador' | 'ilha'>('all');

  useEffect(() => {
    if (!user) return;

    // Fetch all classes for both admins and teachers
    const qClasses = collection(db, 'classes');
    
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom)));
    });

    // Fetch all interruptions for both admins and teachers
    const qInterruptions = query(collection(db, 'interruptions'), orderBy('timestamp', 'desc'));

    const unsubInterruptions = onSnapshot(qInterruptions, (snap) => {
      setInterruptions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interruption)));
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubInterruptions();
    };
  }, [user, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !description || !user) return;

    setSubmitting(true);
    try {
      const classData = classes.find(c => c.id === selectedClass);
      await addDoc(collection(db, 'interruptions'), {
        classId: selectedClass,
        teacherId: user.uid,
        polo: classData?.polo || 'salvador',
        date,
        description,
        timestamp: serverTimestamp()
      });
      
      setSuccess(true);
      setDescription('');
      setSelectedClass('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar intercorrência.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta intercorrência?')) return;
    try {
      await deleteDoc(doc(db, 'interruptions', id));
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir intercorrência.');
    }
  };

  const filteredInterruptions = interruptions.filter(i => {
    const className = classes.find(c => c.id === i.classId)?.name || '';
    const matchesSearch = className.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         i.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPolo = selectedPolo === 'all' || i.polo === selectedPolo;
    return matchesSearch && matchesPolo;
  });

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            Intercorrências
          </h1>
          <p className="text-slate-500 font-medium mt-1">Registre e gerencie ocorrências e observações das aulas</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Nova Intercorrência</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Turma</label>
                <select
                  required
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-red-50 focus:border-red-500 outline-none transition-all font-medium text-slate-600"
                >
                  <option value="">Selecione uma turma...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-red-50 focus:border-red-500 outline-none transition-all font-medium text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea
                  required
                  placeholder="Descreva o que aconteceu..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-red-50 focus:border-red-500 outline-none transition-all font-medium text-slate-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2",
                  success 
                    ? "bg-emerald-500 text-white shadow-emerald-100" 
                    : "bg-red-500 text-white shadow-red-100 hover:scale-[1.02]"
                )}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Registrado!
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar Intercorrência
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por turma ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-medium"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100 w-full md:w-auto">
              <button
                onClick={() => setSelectedPolo('all')}
                className={`flex-1 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'all' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedPolo('salvador')}
                className={`flex-1 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'salvador' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Salvador
              </button>
              <button
                onClick={() => setSelectedPolo('ilha')}
                className={`flex-1 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPolo === 'ilha' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Ilha
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Histórico de Ocorrências</h3>
              <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {filteredInterruptions.length} Registros
              </div>
            </div>
            
            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="p-20 text-center">
                  <Loader2 className="w-10 h-10 text-[#1a36b1] animate-spin mx-auto" />
                  <p className="text-slate-400 mt-4 font-bold">Carregando histórico...</p>
                </div>
              ) : filteredInterruptions.length === 0 ? (
                <div className="p-20 text-center text-slate-300 italic font-medium">Nenhuma intercorrência registrada.</div>
              ) : (
                filteredInterruptions.map((item) => (
                  <div key={item.id} className="p-8 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-7 h-7" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 bg-[#1a36b1]/10 text-[#1a36b1] text-[10px] font-black uppercase tracking-widest rounded-lg">
                              {classes.find(c => c.id === item.classId)?.name || 'Turma Excluída'}
                            </span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                              Polo {item.polo === 'salvador' ? 'Salvador' : 'Ilha'}
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {safeFormatDate(item.date, "d 'de' MMMM, yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="self-end md:self-start p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interruptions;
