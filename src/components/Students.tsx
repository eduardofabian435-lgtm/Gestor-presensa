import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  X, 
  ChevronDown,
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Student, ClassRoom } from '../types';
import { cn } from '../lib/utils';
import { useFirebase, handleFirestoreError, OperationType } from '../contexts/FirebaseContext';

const Students: React.FC = () => {
  const { isAdmin, isTeacher } = useFirebase();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedPolo, setSelectedPolo] = useState<'all' | 'salvador' | 'ilha'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    polo: 'salvador' as 'salvador' | 'ilha',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    registrationNumber: ''
  });

  useEffect(() => {
    const studentsQuery = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentsData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
    });

    const classesQuery = query(collection(db, 'classes'), orderBy('name', 'asc'));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassRoom[];
      setClasses(classesData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'classes');
    });

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
    };
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup = selectedGroup === 'all' || student.classId === selectedGroup;
      const matchesPolo = selectedPolo === 'all' || student.polo === selectedPolo;
      return matchesSearch && matchesGroup && matchesPolo;
    });
  }, [students, searchTerm, selectedGroup, selectedPolo]);

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        classId: student.classId,
        polo: student.polo || 'salvador',
        email: student.email || '',
        phone: student.phone || '',
        status: student.status,
        registrationNumber: student.registrationNumber
      });
    } else {
      setEditingStudent(null);
      // Pre-select polo if a filter is active
      const initialPolo = selectedPolo !== 'all' ? selectedPolo : 'salvador';
      setFormData({
        name: '',
        classId: selectedGroup !== 'all' ? selectedGroup : '',
        polo: initialPolo,
        email: '',
        phone: '',
        status: 'active',
        registrationNumber: `MAT-${Math.floor(1000 + Math.random() * 9000)}`
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId) {
      alert('Por favor, preencha o nome e selecione um grupo.');
      return;
    }

    setIsSaving(true);
    try {
      const studentData = {
        name: formData.name,
        classId: formData.classId,
        polo: formData.polo,
        status: formData.status,
        registrationNumber: formData.registrationNumber,
        ...(formData.email ? { email: formData.email } : {}),
        ...(formData.phone ? { phone: formData.phone } : {}),
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), {
          ...studentData,
          updatedAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `students/${editingStudent.id}`));
      } else {
        await addDoc(collection(db, 'students'), {
          ...studentData,
          createdAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'students'));
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Erro ao salvar aluno. Verifique suas permissões.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
      try {
        await deleteDoc(doc(db, 'students', id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `students/${id}`));
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Erro ao excluir aluno.');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Alunos</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie os alunos cadastrados</p>
        </div>
        {(isAdmin || isTeacher) && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-[#f9a825] text-white rounded-xl font-bold shadow-lg shadow-orange-900/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Aluno
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600"
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setSelectedPolo('all')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${selectedPolo === 'all' ? 'bg-slate-100 text-[#1a36b1]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedPolo('salvador')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${selectedPolo === 'salvador' ? 'bg-slate-100 text-[#1a36b1]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Salvador
          </button>
          <button
            onClick={() => setSelectedPolo('ilha')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${selectedPolo === 'ilha' ? 'bg-slate-100 text-[#1a36b1]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Ilha
          </button>
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600 appearance-none"
          >
            <option value="all">Todos os grupos</option>
            {classes.filter(c => selectedPolo === 'all' || c.polo === selectedPolo).map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table/List View */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Grupo</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Contato</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#1a36b1] border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-400 font-medium">Carregando alunos...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <motion.tr 
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#1a36b1] flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {student.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700 truncate">{student.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{student.registrationNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold whitespace-nowrap w-fit">
                          {classes.find(c => c.id === student.classId)?.name || 'Sem grupo'}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Polo {student.polo === 'salvador' ? 'Salvador' : 'Ilha'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                        student.status === 'active' 
                          ? "bg-green-50 text-green-600" 
                          : "bg-slate-100 text-slate-500"
                      )}>
                        {student.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <p className="text-sm text-slate-500 font-medium truncate max-w-[150px]">
                        {student.phone || student.email || '-'}
                      </p>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {(isAdmin || isTeacher) && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenModal(student)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(student.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-slate-50">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-[#1a36b1] border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 font-medium">Carregando alunos...</p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-medium">
              Nenhum aluno encontrado.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a36b1] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {student.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{student.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{student.registrationNumber}</p>
                    </div>
                  </div>
                  {/* Mobile Actions */}
                  {(isAdmin || isTeacher) && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenModal(student)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grupo</p>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                      {classes.find(c => c.id === student.classId)?.name || 'Sem grupo'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      student.status === 'active' 
                        ? "bg-green-50 text-green-600" 
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {student.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                {(student.phone || student.email) && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contato</p>
                    <p className="text-xs text-slate-500 font-medium">{student.phone || student.email}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                  </h2>
                  <button 
                    onClick={handleCloseModal}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Nome do aluno"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Polo de Gestão</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, polo: 'salvador' })}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.polo === 'salvador' ? 'bg-[#1a36b1] text-white shadow-lg shadow-blue-900/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                      >
                        Salvador
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, polo: 'ilha' })}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.polo === 'ilha' ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                      >
                        Ilha
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Grupo</label>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        required
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                        className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                      >
                        <option value="">Selecione um grupo</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email (opcional)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Telefone (opcional)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                    <div className="relative">
                      <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-6 py-3 bg-[#f9a825] text-white rounded-xl font-bold shadow-lg shadow-orange-900/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                      {isSaving ? 'Salvando...' : editingStudent ? 'Salvar' : 'Cadastrar'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Students;
