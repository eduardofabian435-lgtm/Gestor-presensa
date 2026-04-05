import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Users, 
  Calendar, 
  Filter, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  Search,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useFirebase, safeFormatDate } from '../contexts/FirebaseContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserProfile, ClassRoom, Student, AttendanceRecord, Interruption, ClassReport } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { isAdmin, user } = useFirebase();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<{uid: string, name: string}[]>([]);
  
  const [selectedPolo, setSelectedPolo] = useState<'all' | 'salvador' | 'ilha'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<'frequencia' | 'relatorios' | 'intercorrencias'>('frequencia');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [interruptions, setInterruptions] = useState<Interruption[]>([]);
  const [classReports, setClassReports] = useState<ClassReport[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este relatório?')) return;
    
    try {
      setDeleting(reportId);
      await deleteDoc(doc(db, 'class_reports', reportId));
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("Erro ao excluir o relatório. Verifique suas permissões.");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteInterruption = async (interruptionId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta intercorrência?')) return;
    
    try {
      setDeleting(interruptionId);
      await deleteDoc(doc(db, 'interruptions', interruptionId));
    } catch (error) {
      console.error("Error deleting interruption:", error);
      alert("Erro ao excluir a intercorrência. Verifique suas permissões.");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    // Fetch all classes for both admins and teachers
    const qClasses = collection(db, 'classes');
    
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom)));
    });

    // Fetch all students for the filter
    const qAllStudents = collection(db, 'students');
    const unsubAllStudents = onSnapshot(qAllStudents, (snap) => {
      setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    // Fetch teachers
    const qTeachers = query(collection(db, 'users'), where('role', 'in', ['teacher', 'admin']));
    const unsubTeachers = onSnapshot(qTeachers, (snap) => {
      setTeachers(snap.docs.map(doc => ({ uid: doc.id, name: doc.data().name })));
    });

    // Fetch events
    const qEvents = collection(db, 'events');
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubClasses();
      unsubAllStudents();
      unsubTeachers();
      unsubEvents();
    };
  }, [isAdmin, user?.uid]);

  useEffect(() => {
    setLoading(true);
    
    let qStudents = collection(db, 'students') as any;
    let qAttendance = collection(db, 'attendance') as any;

    if (selectedClass) {
      qStudents = query(collection(db, 'students'), where('classId', '==', selectedClass));
      qAttendance = query(collection(db, 'attendance'), where('classId', '==', selectedClass));
    } else if (selectedPolo !== 'all') {
      qStudents = query(collection(db, 'students'), where('polo', '==', selectedPolo));
      qAttendance = query(collection(db, 'attendance'), where('polo', '==', selectedPolo));
    } else if (selectedTeacher) {
      const teacherClasses = classes.filter(c => (c as any).teacherId === selectedTeacher).map(c => c.id);
      if (teacherClasses.length > 0) {
        qStudents = query(qStudents, where('classId', 'in', teacherClasses));
        qAttendance = query(qAttendance, where('classId', 'in', teacherClasses));
      } else {
        setStudents([]);
        setAttendance([]);
        setLoading(false);
        return;
      }
    }

    if (selectedStudent) {
      qStudents = query(qStudents, where('id', '==', selectedStudent));
      qAttendance = query(qAttendance, where('studentId', '==', selectedStudent));
    }

    const unsubStudents = onSnapshot(qStudents, (snap) => {
      try {
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    });

    const unsubAttendance = onSnapshot(qAttendance, (snap) => {
      try {
        let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        
        if (startDate) {
          data = data.filter(a => a.date >= startDate);
        }
        if (endDate) {
          data = data.filter(a => a.date <= endDate);
        }
        
        setAttendance(data);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      }
    });

    // Fetch interruptions
    let qInterruptions = collection(db, 'interruptions') as any;
    if (selectedClass) {
      qInterruptions = query(qInterruptions, where('classId', '==', selectedClass));
    } else if (selectedPolo !== 'all') {
      qInterruptions = query(qInterruptions, where('polo', '==', selectedPolo));
    } else if (selectedTeacher) {
      const teacherClasses = classes.filter(c => (c as any).teacherId === selectedTeacher).map(c => c.id);
      if (teacherClasses.length > 0) {
        qInterruptions = query(qInterruptions, where('classId', 'in', teacherClasses));
      }
    }

    const unsubInterruptions = onSnapshot(qInterruptions, (snap) => {
      try {
        let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interruption));
        if (startDate) data = data.filter(i => i.date >= startDate);
        if (endDate) data = data.filter(i => i.date <= endDate);
        setInterruptions(data);
      } catch (err) {
        console.error("Error fetching interruptions:", err);
      }
    });

    // Fetch class reports
    let qClassReports = collection(db, 'class_reports') as any;
    if (selectedClass) {
      qClassReports = query(qClassReports, where('classId', '==', selectedClass));
    } else if (selectedPolo !== 'all') {
      qClassReports = query(qClassReports, where('polo', '==', selectedPolo));
    } else if (selectedTeacher) {
      const teacherClasses = classes.filter(c => (c as any).teacherId === selectedTeacher).map(c => c.id);
      if (teacherClasses.length > 0) {
        qClassReports = query(qClassReports, where('classId', 'in', teacherClasses));
      }
    }

    const unsubClassReports = onSnapshot(qClassReports, (snap) => {
      try {
        let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassReport));
        if (startDate) data = data.filter(r => r.date >= startDate);
        if (endDate) data = data.filter(r => r.date <= endDate);
        setClassReports(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching class reports:", err);
        setLoading(false);
      }
    });

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubInterruptions();
      unsubClassReports();
    };
  }, [selectedClass, selectedStudent, startDate, endDate, selectedTeacher, classes, isAdmin, selectedPolo]);

  const studentStats = React.useMemo(() => {
    const stats: Record<string, { total: number; present: number; absent: number; percentage: number }> = {};
    students.forEach(student => {
      const studentAttendance = attendance.filter(a => a.studentId === student.id);
      const total = studentAttendance.length;
      const present = studentAttendance.filter(a => a.status === 'present').length;
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      stats[student.id] = { total, present, absent, percentage };
    });
    return stats;
  }, [students, attendance]);

  const classAverage = React.useMemo(() => {
    if (students.length === 0) return 0;
    const totalPercentage: number = Object.values(studentStats).reduce<number>((acc, s: any) => acc + s.percentage, 0);
    return Math.round(totalPercentage / students.length);
  }, [students, studentStats]);

  const exportToCSV = () => {
    const className = classes.find(c => c.id === selectedClass)?.name || 'Relatorio';
    const headers = ['Matrícula', 'Nome do Aluno', 'Total Aulas', 'Presenças', 'Faltas', '% Presença'];
    const rows = students.map(student => {
      const stats = studentStats[student.id];
      return [
        student.registrationNumber,
        student.name,
        stats.total,
        stats.present,
        stats.absent,
        `${stats.percentage}%`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_${className}_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    try {
      setGenerating(true);
      const className = classes.find(c => c.id === selectedClass)?.name || 'Relatório Geral';
      const studentName = allStudents.find(s => s.id === selectedStudent)?.name || 'Todos os Alunos';
      const teacherName = teachers.find(t => t.uid === selectedTeacher)?.name || 'Todos os Professores';
      
      const doc = new jsPDF();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(26, 54, 177); // Blue
      doc.text('Relatório Consolidado', 14, 22);
      
      // Report Info Section
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
      
      // Summary Stats
      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text('Resumo de Atividades', 14, 45);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Total de Aulas: ${new Set(attendance.map(a => a.date)).size}`, 14, 52);
      doc.text(`Média de Frequência: ${classAverage}%`, 14, 58);
      doc.text(`Total de Intercorrências: ${interruptions.length}`, 14, 64);

      // 1. Attendance Table
      doc.setFontSize(14);
      doc.setTextColor(26, 54, 177);
      doc.text('1. Frequência dos Alunos', 14, 78);

      const attendanceTableData = students.map(student => {
        const stats = studentStats[student.id];
        return [
          student.registrationNumber || '-',
          student.name,
          stats.total.toString(),
          stats.present.toString(),
          stats.absent.toString(),
          `${stats.percentage}%`
        ];
      });

      autoTable(doc, {
        startY: 82,
        head: [['Matrícula', 'Nome do Aluno', 'Aulas', 'Presenças', 'Faltas', '% Presença']],
        body: attendanceTableData,
        headStyles: { fillColor: [26, 54, 177], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 82 },
      });

      // 2. Interruptions Table
      let currentY = (doc as any).lastAutoTable.finalY + 15;
      
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(26, 54, 177);
      doc.text('2. Registro de Intercorrências', 14, currentY);

      const filteredInterruptions = interruptions.sort((a, b) => b.date.localeCompare(a.date));
      const interruptionsTableData = filteredInterruptions.map(item => [
        safeFormatDate(item.date, "dd/MM/yyyy", { locale: ptBR }),
        classes.find(c => c.id === item.classId)?.name || '-',
        item.description
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Data', 'Turma', 'Descrição']],
        body: interruptionsTableData.length > 0 ? interruptionsTableData : [['-', '-', 'Nenhuma intercorrência registrada']],
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
      });

      // 3. Calendar Events Table
      currentY = (doc as any).lastAutoTable.finalY + 15;
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(26, 54, 177);
      doc.text('3. Eventos do Calendário', 14, currentY);

      const filteredEvents = events
        .filter(e => {
          if (startDate && e.date < startDate) return false;
          if (endDate && e.date > endDate) return false;
          return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const eventsTableData = filteredEvents.map(event => [
        safeFormatDate(event.date, "dd/MM/yyyy", { locale: ptBR }),
        event.title,
        event.type === 'holiday' ? 'Feriado' : event.type === 'exam' ? 'Prova' : event.type === 'meeting' ? 'Reunião' : 'Outro',
        event.description || '-'
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Data', 'Evento', 'Tipo', 'Descrição']],
        body: eventsTableData.length > 0 ? eventsTableData : [['-', '-', '-', 'Nenhum evento agendado']],
        headStyles: { fillColor: [249, 168, 37], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 251, 235] },
      });

      // 4. Class Reports Table
      currentY = (doc as any).lastAutoTable.finalY + 15;
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(26, 54, 177);
      doc.text('4. Relatórios de Aula', 14, currentY);

      const filteredClassReports = classReports.sort((a, b) => b.date.localeCompare(a.date));
      const classReportsTableData = filteredClassReports.map(report => [
        safeFormatDate(report.date, "dd/MM/yyyy", { locale: ptBR }),
        classes.find(c => c.id === report.classId)?.name || '-',
        teachers.find(t => t.uid === report.teacherId)?.name || '-',
        report.content
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Data', 'Turma', 'Professor', 'Relatório']],
        body: classReportsTableData.length > 0 ? classReportsTableData : [['-', '-', '-', 'Nenhum relatório registrado']],
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [236, 253, 245] },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        columnStyles: { 3: { cellWidth: 'auto' } }
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`Relatorio_Consolidado_${className.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full space-y-6 bg-[#f8fafc] min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Relatórios</h1>
          <p className="text-slate-500 text-sm font-medium">Visualize frequências, relatórios e intercorrências</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={exportToPDF}
            disabled={generating || students.length === 0}
            className="bg-white text-[#1a36b1] border border-[#1a36b1] px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-50 transition-all shadow-sm active:scale-95 text-sm disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Exportar PDF
          </button>
          <button
            onClick={exportToCSV}
            disabled={students.length === 0}
            className="bg-[#f9a825] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#e69b21] transition-all shadow-sm active:scale-95 text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Polo</label>
          <div className="relative">
            <select
              value={selectedPolo}
              onChange={(e) => {
                setSelectedPolo(e.target.value as any);
                setSelectedClass('');
              }}
              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-[#1a36b1] outline-none transition-all text-sm appearance-none text-slate-600"
            >
              <option value="all">Todos os polos</option>
              <option value="salvador">Salvador</option>
              <option value="ilha">Ilha</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Grupo</label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-[#1a36b1] outline-none transition-all text-sm appearance-none text-slate-600"
            >
              <option value="">Todos os grupos</option>
              {classes
                .filter(c => selectedPolo === 'all' || c.polo === selectedPolo)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Aluno</label>
          <div className="relative">
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-[#1a36b1] outline-none transition-all text-sm appearance-none text-slate-600"
            >
              <option value="">Todos os alunos</option>
              {(selectedClass ? students : allStudents).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Professor</label>
          <div className="relative">
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-[#1a36b1] outline-none transition-all text-sm appearance-none text-slate-600"
            >
              <option value="">Todos os professores</option>
              {teachers.map(t => (
                <option key={t.uid} value={t.uid}>{t.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-[#1a36b1] outline-none transition-all text-sm text-slate-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-[#1a36b1] outline-none transition-all text-sm text-slate-600"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Aulas</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {new Set(attendance.map(a => a.date)).size}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1a36b1]">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Presenças</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {attendance.filter(a => a.status === 'present').length}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Média de Frequência</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{classAverage}%</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Intercorrências</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{interruptions.length}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('frequencia')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
            activeTab === 'frequencia' ? "bg-[#1a36b1] text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Frequência
        </button>
        <button
          onClick={() => setActiveTab('relatorios')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
            activeTab === 'relatorios' ? "bg-[#1a36b1] text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
          )}
        >
          <FileText className="w-4 h-4" />
          Relatórios
        </button>
        <button
          onClick={() => setActiveTab('intercorrencias')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
            activeTab === 'intercorrencias' ? "bg-[#1a36b1] text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Intercorrências
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {activeTab === 'frequencia' ? (
          <>
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Frequência por Aluno</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Aluno</th>
                    <th className="px-6 py-4 text-center">Aulas</th>
                    <th className="px-6 py-4 text-center">Presenças</th>
                    <th className="px-6 py-4 text-center">Faltas</th>
                    <th className="px-6 py-4 text-right">Frequência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 text-[#1a36b1] animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                        Nenhum dado encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    students.map(student => {
                      const stats = studentStats[student.id];
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-700">{student.name}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-slate-600">{stats.total}</td>
                          <td className="px-6 py-4 text-center font-medium text-slate-600">{stats.present}</td>
                          <td className="px-6 py-4 text-center font-medium text-red-500">{stats.absent}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-1000",
                                    stats.percentage >= 75 ? "bg-emerald-500" : stats.percentage >= 50 ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${stats.percentage}%` }}
                                />
                              </div>
                              <span className={cn(
                                "font-bold text-sm min-w-[40px]",
                                stats.percentage >= 75 ? "text-emerald-600" : stats.percentage >= 50 ? "text-amber-600" : "text-red-600"
                              )}>
                                {stats.percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'relatorios' ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Relatórios de Aula</h3>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 text-[#1a36b1] animate-spin mx-auto" />
                </div>
              ) : classReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic">
                  Nenhum relatório de aula encontrado para o período selecionado.
                </div>
              ) : (
                classReports
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(report => (
                    <div key={report.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex gap-6">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1a36b1] shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-[#1a36b1]/10 text-[#1a36b1] text-[10px] font-black uppercase tracking-widest rounded">
                              {classes.find(c => c.id === report.classId)?.name || 'Turma'}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {safeFormatDate(report.date, "d 'de' MMMM, yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-400">
                            Por: {teachers.find(t => t.uid === report.teacherId)?.name || 'Professor'}
                          </span>
                        </div>
                        <div className="prose prose-slate prose-sm max-w-none">
                          <p className="text-slate-700 whitespace-pre-wrap">{report.content}</p>
                        </div>
                        
                        {(isAdmin || report.teacherId === user?.uid) && (
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => handleDeleteReport(report.id)}
                              disabled={deleting === report.id}
                              className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center shadow-sm border border-transparent hover:border-red-100"
                              title="Excluir Relatório"
                            >
                              {deleting === report.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Histórico de Intercorrências</h3>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 text-[#1a36b1] animate-spin mx-auto" />
                </div>
              ) : interruptions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic">
                  Nenhuma intercorrência registrada para o período selecionado.
                </div>
              ) : (
                interruptions.map(item => (
                  <div key={item.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex gap-6">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-[#1a36b1]/10 text-[#1a36b1] text-[10px] font-black uppercase tracking-widest rounded">
                          {classes.find(c => c.id === item.classId)?.name || 'Turma'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {safeFormatDate(item.date, "d 'de' MMMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{item.description}</p>
                      
                      {(isAdmin || item.teacherId === user?.uid) && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleDeleteInterruption(item.id)}
                            disabled={deleting === item.id}
                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center shadow-sm border border-transparent hover:border-red-100"
                            title="Excluir Intercorrência"
                          >
                            {deleting === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
