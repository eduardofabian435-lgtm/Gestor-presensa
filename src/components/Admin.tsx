import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, deleteDoc, onSnapshot, query, where, setDoc, serverTimestamp, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '../firebase';
import { useFirebase } from '../contexts/FirebaseContext';
import { Users, BookOpen, GraduationCap, Plus, Trash2, Search, UserPlus, School, UserCheck, Key, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, ClassRoom, Student } from '../types';

const Admin: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'students' | 'maintenance'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newClass, setNewClass] = useState({ name: '', teacherId: '', polo: 'salvador' as 'salvador' | 'ilha' });
  const [newStudent, setNewStudent] = useState({ name: '', registrationNumber: '', classId: '', polo: 'salvador' as 'salvador' | 'ilha' });
  const [selectedPoloFilter, setSelectedPoloFilter] = useState<'all' | 'salvador' | 'ilha'>('all');
  const [migrating, setMigrating] = useState(false);
  const [migrationConfirm, setMigrationConfirm] = useState<'salvador' | 'ilha' | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (err) => {
      console.error("Error fetching users:", err);
      setError("Erro ao carregar usuários. Verifique suas permissões.");
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom)));
    }, (err) => {
      console.error("Error fetching classes:", err);
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching students:", err);
    });

    return () => {
      unsubUsers();
      unsubClasses();
      unsubStudents();
    };
  }, []);

  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'teacher') => {
    setSubmitting(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      alert('Cargo atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao atualizar cargo: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.name || !newClass.teacherId) return;
    setSubmitting(true);
    setError(null);
    try {
      // Check if class with same name already exists
      const existingClass = classes.find(c => c.name.toLowerCase() === newClass.name.toLowerCase());
      
      if (existingClass) {
        // Update existing class
        await updateDoc(doc(db, 'classes', existingClass.id), {
          teacherId: newClass.teacherId,
          updatedAt: serverTimestamp()
        });
        alert('Professor vinculado à turma existente com sucesso!');
      } else {
        // Create new class
        await addDoc(collection(db, 'classes'), {
          ...newClass,
          status: 'active',
          createdAt: serverTimestamp()
        });
        alert('Turma adicionada com sucesso!');
      }
      setNewClass({ name: '', teacherId: '', polo: 'salvador' });
    } catch (err: any) {
      console.error(err);
      setError('Erro ao processar turma: ' + (err.message || 'Verifique suas permissões.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.registrationNumber || !newStudent.classId) return;
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'students'), {
        ...newStudent,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setNewStudent({ name: '', registrationNumber: '', classId: '', polo: 'salvador' });
      alert('Aluno adicionado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao adicionar aluno: ' + (err.message || 'Verifique suas permissões.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    setSubmitting(true);
    setError(null);
    try {
      if (collectionName === 'users') {
        const idToken = await firebaseAuth.currentUser?.getIdToken();
        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ uid: id })
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir usuário');
          } else {
            const text = await response.text();
            throw new Error(`Erro do servidor (${response.status})`);
          }
        }
      } else {
        await deleteDoc(doc(db, collectionName, id));
      }
      alert('Item excluído com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao excluir item: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMigrateData = async (targetPolo: 'salvador' | 'ilha') => {
    setMigrating(true);
    setMigrationStatus('Iniciando migração...');
    setError(null);
    try {
      const collections = ['classes', 'students', 'attendance', 'interruptions', 'class_reports'];
      let totalUpdated = 0;

      for (const colName of collections) {
        setMigrationStatus(`Verificando coleção: ${colName}...`);
        const snap = await getDocs(collection(db, colName));
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (!data.polo) {
            batch.update(doc(db, colName, docSnap.id), { polo: targetPolo });
            batchCount++;
            totalUpdated++;
            
            // Firebase batch limit is 500
            if (batchCount === 450) {
              await batch.commit();
              batch = writeBatch(db);
              batchCount = 0;
            }
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }
      }

      setMigrationStatus(`Sucesso! ${totalUpdated} registros migrados para ${targetPolo === 'salvador' ? 'Salvador' : 'Ilha'}.`);
      setMigrationConfirm(null);
      
      // Clear status after 5 seconds
      setTimeout(() => setMigrationStatus(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError('Erro na migração: ' + (err.message || 'Tente novamente.'));
      setMigrationStatus(null);
    } finally {
      setMigrating(false);
    }
  };

  const tabs = [
    { id: 'users', label: 'Usuários', icon: Users, adminOnly: true },
    { id: 'classes', label: 'Turmas', icon: School, adminOnly: false },
    { id: 'students', label: 'Alunos', icon: GraduationCap, adminOnly: false },
    { id: 'maintenance', label: 'Manutenção', icon: AlertCircle, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  const filteredClasses = classes.filter(c => selectedPoloFilter === 'all' || c.polo === selectedPoloFilter);
  const filteredStudents = students.filter(s => selectedPoloFilter === 'all' || s.polo === selectedPoloFilter);

  useEffect(() => {
    if (!isAdmin && activeTab === 'users') {
      setActiveTab('classes');
    }
  }, [isAdmin, activeTab]);

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Key className="w-8 h-8 text-[#1a36b1]" />
            Administração
          </h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie usuários, turmas e alunos da instituição</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 p-1 bg-slate-100 rounded-2xl w-full md:w-fit scrollbar-hide">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-white text-[#1a36b1] shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {(activeTab === 'classes' || activeTab === 'students') && (
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSelectedPoloFilter('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                selectedPoloFilter === 'all' ? "bg-white text-[#1a36b1] shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedPoloFilter('salvador')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                selectedPoloFilter === 'salvador' ? "bg-white text-[#1a36b1] shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Salvador
            </button>
            <button
              onClick={() => setSelectedPoloFilter('ilha')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                selectedPoloFilter === 'ilha' ? "bg-white text-[#1a36b1] shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Ilha
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold leading-tight">{error}</p>
                </div>
              )}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#1a36b1]/10 rounded-xl flex items-center justify-center text-[#1a36b1]">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Adicionar {activeTab === 'classes' ? 'Turma' : 'Aluno'}
                </h3>
              </div>

              {activeTab === 'users' && (
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-sm font-bold text-blue-700 leading-relaxed">
                    O cadastro de novos usuários é feito automaticamente através do login com Google. 
                    Basta o professor entrar no sistema e seu perfil será criado.
                  </p>
                </div>
              )}

                  {activeTab === 'classes' && (
                    <form onSubmit={handleAddClass} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Grupo</label>
                        <input
                          type="text"
                          required
                          list="existing-group-names"
                          value={newClass.name}
                          onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-bold text-slate-700"
                          placeholder="Ex: 1º Ano A"
                        />
                        <datalist id="existing-group-names">
                          {Array.from(new Set(classes.map(c => c.name))).sort().map(name => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Polo</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewClass({ ...newClass, polo: 'salvador' })}
                            className={cn(
                              "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              newClass.polo === 'salvador' 
                                ? "bg-[#1a36b1] text-white border-[#1a36b1]" 
                                : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                            )}
                          >
                            Salvador
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewClass({ ...newClass, polo: 'ilha' })}
                            className={cn(
                              "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              newClass.polo === 'ilha' 
                                ? "bg-[#1a36b1] text-white border-[#1a36b1]" 
                                : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                            )}
                          >
                            Ilha
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professor Responsável</label>
                        <select
                          required
                          value={newClass.teacherId}
                          onChange={(e) => setNewClass({ ...newClass, teacherId: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-bold text-slate-700 appearance-none"
                        >
                          <option value="">Selecione um professor...</option>
                          {users.filter(u => u.role === 'teacher').map(u => (
                            <option key={u.uid} value={u.uid}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full py-4 bg-[#f9a825] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-orange-900/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                      >
                        {submitting ? 'Adicionando...' : 'Adicionar Turma'}
                      </button>
                    </form>
                  )}

                  {activeTab === 'students' && (
                    <form onSubmit={handleAddStudent} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Aluno</label>
                        <input
                          type="text"
                          required
                          value={newStudent.name}
                          onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-bold text-slate-700"
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Matrícula</label>
                        <input
                          type="text"
                          required
                          value={newStudent.registrationNumber}
                          onChange={(e) => setNewStudent({ ...newStudent, registrationNumber: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-bold text-slate-700"
                          placeholder="ID único"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turma</label>
                        <select
                          required
                          value={newStudent.classId}
                          onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-bold text-slate-700 appearance-none"
                        >
                          <option value="">Selecione uma turma...</option>
                          {classes.filter(c => c.polo === newStudent.polo).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Polo</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewStudent({ ...newStudent, polo: 'salvador' })}
                            className={cn(
                              "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              newStudent.polo === 'salvador' 
                                ? "bg-[#1a36b1] text-white border-[#1a36b1]" 
                                : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                            )}
                          >
                            Salvador
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewStudent({ ...newStudent, polo: 'ilha' })}
                            className={cn(
                              "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              newStudent.polo === 'ilha' 
                                ? "bg-[#1a36b1] text-white border-[#1a36b1]" 
                                : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                            )}
                          >
                            Ilha
                          </button>
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full py-4 bg-[#f9a825] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-orange-900/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                      >
                        {submitting ? 'Adicionando...' : 'Adicionar Aluno'}
                      </button>
                    </form>
                  )}
            </div>
          </div>
        )}

        {/* List Column */}
        <div className={cn("lg:col-span-2", !isAdmin && "lg:col-span-3")}>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Lista de {tabs.find(t => t.id === activeTab)?.label}
              </h3>
            </div>
            
            <div className="divide-y divide-slate-50">
              {activeTab === 'users' && users.map(user => (
                <div key={user.uid} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#1a36b1]/10 group-hover:text-[#1a36b1] transition-colors">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{user.email} • <span className="capitalize text-[#1a36b1] font-black">{user.role}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.uid, e.target.value as any)}
                          disabled={submitting || user.email === 'eduardofabian435@gmail.com'}
                          className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1a36b1]/20 transition-all disabled:opacity-50"
                        >
                          <option value="teacher">Professor</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <button onClick={() => handleDelete('users', user.uid)} disabled={user.email === 'eduardofabian435@gmail.com'} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-20">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {activeTab === 'classes' && filteredClasses.map(c => (
                <div key={c.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#1a36b1]/10 group-hover:text-[#1a36b1] transition-colors">
                      <School className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded">
                          {c.polo === 'salvador' ? 'Salvador' : 'Ilha'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Professor: <span className="text-[#1a36b1] font-black">{users.find(u => u.uid === c.teacherId)?.name || 'N/A'}</span></p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete('classes', c.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              {activeTab === 'students' && filteredStudents.map(s => (
                <div key={s.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#1a36b1]/10 group-hover:text-[#1a36b1] transition-colors">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded">
                          {s.polo === 'salvador' ? 'Salvador' : 'Ilha'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Matrícula: <span className="font-black">{s.registrationNumber}</span> • Turma: <span className="text-[#1a36b1] font-black">{classes.find(c => c.id === s.classId)?.name || 'N/A'}</span></p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete('students', s.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}

              {((activeTab === 'users' && users.length === 0) || 
                (activeTab === 'classes' && classes.length === 0) || 
                (activeTab === 'students' && students.length === 0)) && (
                <div className="p-20 text-center text-slate-300 italic font-medium">Nenhum item cadastrado.</div>
              )}
              {activeTab === 'maintenance' && (
                <div className="p-8 space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Migração de Polo</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      Utilize esta ferramenta para atribuir um polo aos registros antigos que foram criados antes da implementação da diferenciação por polo.
                    </p>
                    
                    {migrationStatus && (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-600 animate-pulse">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-sm font-bold">{migrationStatus}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {!migrationConfirm ? (
                        <>
                          <button
                            onClick={() => setMigrationConfirm('salvador')}
                            disabled={migrating}
                            className="flex items-center justify-center gap-3 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                          >
                            <School className="w-4 h-4" />
                            Migrar para Salvador
                          </button>
                          <button
                            onClick={() => setMigrationConfirm('ilha')}
                            disabled={migrating}
                            className="flex items-center justify-center gap-3 py-4 bg-[#1a36b1] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50"
                          >
                            <School className="w-4 h-4" />
                            Migrar para Ilha
                          </button>
                        </>
                      ) : (
                        <div className="col-span-2 p-6 bg-slate-900 rounded-[2rem] text-white space-y-4 animate-in zoom-in-95 duration-200">
                          <p className="text-center font-bold">
                            Confirmar migração de todos os dados sem polo para <span className="text-blue-400 uppercase">{migrationConfirm === 'salvador' ? 'Salvador' : 'Ilha'}</span>?
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setMigrationConfirm(null)}
                              disabled={migrating}
                              className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleMigrateData(migrationConfirm)}
                              disabled={migrating}
                              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40"
                            >
                              {migrating ? 'Processando...' : 'Sim, Confirmar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-700">Atenção</p>
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        Esta ação atualizará todos os registros (turmas, alunos, frequências, intercorrências e relatórios) que não possuem polo definido.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {/* Modal removed as password management is handled by Google */}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
