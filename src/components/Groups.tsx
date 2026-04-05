import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { useFirebase, handleFirestoreError, OperationType } from '../contexts/FirebaseContext';
import { Users, Plus, Trash2, Edit2, Loader2, Search, UserPlus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Group {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  teacherId?: string;
  teacherName?: string;
  polo: 'salvador' | 'ilha';
}

interface Teacher {
  uid: string;
  name: string;
  email: string;
}

const Groups: React.FC = () => {
  const { isAdmin, profile } = useFirebase();
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupStatus, setNewGroupStatus] = useState<'active' | 'inactive'>('active');
  const [newGroupTeacherId, setNewGroupTeacherId] = useState('');
  const [newGroupPolo, setNewGroupPolo] = useState<'salvador' | 'ilha'>('salvador');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolo, setSelectedPolo] = useState<'all' | 'salvador' | 'ilha'>('all');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'classes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];

      // Fetch teacher names for each group (optional now)
      const teachersSnap = await getDocs(collection(db, 'users'));
      const teachersList: Teacher[] = [];
      const teachersMap = new Map();
      teachersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.role === 'teacher' || data.role === 'admin') {
          teachersList.push({ uid: doc.id, name: data.name, email: data.email });
        }
        teachersMap.set(doc.id, data.name);
      });

      setTeachers(teachersList);

      const enrichedGroups = groupsData.map(group => ({
        ...group,
        teacherName: group.teacherId ? (teachersMap.get(group.teacherId) || 'Professor não atribuído') : 'Sem professor'
      }));

      setGroups(enrichedGroups);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName || isSaving) return;

    setIsSaving(true);
    try {
      // Check if group with same name already exists
      const existingGroup = groups.find(g => g.name.toLowerCase() === newGroupName.toLowerCase());

      if (existingGroup) {
        // Update existing group
        await updateDoc(doc(db, 'classes', existingGroup.id), {
          teacherId: newGroupTeacherId || null,
          description: newGroupDescription || existingGroup.description,
          status: newGroupStatus,
          polo: newGroupPolo,
          updatedAt: serverTimestamp()
        });
        alert('Professor vinculado ao grupo existente com sucesso!');
      } else {
        // Create new group
        await addDoc(collection(db, 'classes'), {
          name: newGroupName,
          description: newGroupDescription,
          status: newGroupStatus,
          teacherId: newGroupTeacherId || null,
          polo: newGroupPolo,
          createdAt: serverTimestamp(),
        });
        alert('Novo grupo criado com sucesso!');
      }
      
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupStatus('active');
      setNewGroupTeacherId('');
      setNewGroupPolo('salvador');
      setIsAdding(false);
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      alert("Erro ao salvar o grupo. Verifique sua conexão ou permissões.");
      handleFirestoreError(error, OperationType.CREATE, 'classes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !newGroupName || isSaving) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'classes', editingGroup.id), {
        name: newGroupName,
        description: newGroupDescription,
        status: newGroupStatus,
        teacherId: newGroupTeacherId || null,
        polo: newGroupPolo,
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupStatus('active');
      setNewGroupTeacherId('');
      setNewGroupPolo('salvador');
      setEditingGroup(null);
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      alert("Erro ao atualizar o grupo. Verifique sua conexão ou permissões.");
      handleFirestoreError(error, OperationType.UPDATE, 'classes');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || '');
    setNewGroupStatus(group.status);
    setNewGroupTeacherId(group.teacherId || '');
    setNewGroupPolo(group.polo || 'salvador');
  };

  const toggleGroupStatus = async (group: Group) => {
    try {
      const newStatus = group.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'classes', group.id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating group status:", error);
    }
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPolo = selectedPolo === 'all' || group.polo === selectedPolo;
    return matchesSearch && matchesPolo;
  });

  if (!isAdmin && profile?.role !== 'teacher') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2">Apenas administradores e professores podem visualizar grupos.</p>
        <div className="mt-4 p-4 bg-slate-100 rounded-xl inline-block text-left">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações de Acesso:</p>
          <p className="text-sm text-slate-600">Email: {auth.currentUser?.email}</p>
          <p className="text-sm text-slate-600">Papel: {profile?.role || 'Nenhum'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-[#1a36b1]" />
            Grupos
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie os grupos e turmas cadastrados</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#f9a825] text-white rounded-2xl font-bold shadow-xl shadow-orange-900/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
            Novo Grupo
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do grupo ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100 w-full md:w-auto">
          <button
            onClick={() => setSelectedPolo('all')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedPolo === 'all' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedPolo('salvador')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedPolo === 'salvador' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Salvador
          </button>
          <button
            onClick={() => setSelectedPolo('ilha')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedPolo === 'ilha' ? 'bg-white text-[#1a36b1] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Ilha
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#1a36b1] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredGroups.map((group) => (
              <motion.div
                key={group.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${group.status === 'active' ? 'bg-[#1a36b1]/10 text-[#1a36b1]' : 'bg-slate-100 text-slate-400'}`}>
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-50 text-[#1a36b1] border border-blue-100">
                        Polo {group.polo === 'salvador' ? 'Salvador' : 'Ilha'}
                      </span>
                      <button
                        onClick={() => toggleGroupStatus(group)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all ${group.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                      >
                        {group.status === 'active' ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(group)}
                          className="p-2 text-slate-300 hover:text-[#1a36b1] transition-colors opacity-0 group-hover:opacity-100"
                          title="Editar Grupo"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Excluir este grupo?')) {
                              await deleteDoc(doc(db, 'classes', group.id));
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir Grupo"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{group.name}</h3>
                {group.description && (
                  <p className="text-slate-500 text-sm mb-6 line-clamp-2 font-medium">{group.description}</p>
                )}
                <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-auto pt-6 border-t border-slate-50">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserPlus className="w-3 h-3" />
                  </div>
                  {group.teacherName}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Group Modal */}
      <AnimatePresence>
        {(isAdding || editingGroup) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-8 md:p-10 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[#1a36b1]/10 rounded-2xl flex items-center justify-center text-[#1a36b1]">
                  {editingGroup ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingGroup ? 'Editar Turma' : 'Adicionar Turma'}
                </h2>
              </div>

              <form onSubmit={editingGroup ? handleUpdateGroup : handleAddGroup} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Grupo</label>
                  <input
                    type="text"
                    required
                    list="saved-group-names"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: 1º Ano A"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-bold text-slate-700"
                  />
                  <datalist id="saved-group-names">
                    {Array.from(new Set(groups.map(g => g.name))).sort().map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Professor Responsável</label>
                  <div className="relative">
                    <select
                      value={newGroupTeacherId}
                      onChange={(e) => setNewGroupTeacherId(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-bold text-slate-700 appearance-none"
                    >
                      <option value="">Selecione um professor...</option>
                      {teachers.map(t => (
                        <option key={t.uid} value={t.uid}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Descrição (Opcional)</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Breve descrição sobre o grupo..."
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-medium resize-none text-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Polo de Gestão</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewGroupPolo('salvador')}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${newGroupPolo === 'salvador' ? 'bg-[#1a36b1] text-white shadow-xl shadow-blue-900/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                    >
                      Salvador
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroupPolo('ilha')}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${newGroupPolo === 'ilha' ? 'bg-slate-800 text-white shadow-xl shadow-slate-900/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                    >
                      Ilha
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewGroupStatus('active')}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${newGroupStatus === 'active' ? 'bg-[#1a36b1] text-white shadow-xl shadow-blue-900/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroupStatus('inactive')}
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${newGroupStatus === 'inactive' ? 'bg-slate-800 text-white shadow-xl shadow-slate-900/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                    >
                      Inativo
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingGroup(null);
                      setNewGroupName('');
                      setNewGroupDescription('');
                      setNewGroupStatus('active');
                      setNewGroupTeacherId('');
                      setNewGroupPolo('salvador');
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-6 py-4 bg-[#f9a825] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-900/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (editingGroup ? 'Salvar Alterações' : 'Adicionar Turma')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Groups;
