import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Info,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  Clock,
  MapPin,
  User,
  BookOpen,
  X,
  Edit2
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, where, Timestamp, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { motion, AnimatePresence } from 'motion/react';
import { Student, ClassRoom, GroupSchedule, ScheduleItem } from '../types';
import { CLASS_SCHEDULE } from '../constants/schedule';
import { cn } from '../lib/utils';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent';
  classId: string;
  studentId: string;
}

interface SchoolEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: 'holiday' | 'exam' | 'meeting' | 'other';
  createdBy: string;
}

const Calendar: React.FC = () => {
  const { user, isAdmin, isTeacher } = useFirebase();
  const [view, setView] = useState<'calendar' | 'schedule'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schedules, setSchedules] = useState<GroupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventType, setNewEventType] = useState<'holiday' | 'exam' | 'meeting' | 'other'>('other');
  
  // Schedule state
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('Terça-feira');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isEditingActivity, setIsEditingActivity] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);

  // Form states for Group
  const [groupName, setGroupName] = useState('');
  const [groupAgeRange, setGroupAgeRange] = useState('');
  const [groupShift, setGroupShift] = useState<'Manhã' | 'Tarde' | 'Noite' | 'Integral'>('Integral');

  // Form states for Activity
  const [activityTime, setActivityTime] = useState('');
  const [activityName, setActivityName] = useState('');
  const [activityDetails, setActivityDetails] = useState('');
  
  const detailsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qAttendance = query(collection(db, 'attendance'));
    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      setAttendanceData(data);
    });

    const qEvents = query(collection(db, 'events'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SchoolEvent[];
      setEvents(data);
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom)));
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const fetchedSchedules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as GroupSchedule));
      setSchedules(fetchedSchedules);
      
      // Auto-select first group if none selected
      if (fetchedSchedules.length > 0 && !selectedGroup) {
        setSelectedGroup(fetchedSchedules[0].id);
        const days = Object.keys(fetchedSchedules[0].days);
        if (days.length > 0) setSelectedDay(days[0]);
      }
      setLoading(false);
    });

    return () => {
      unsubAttendance();
      unsubEvents();
      unsubStudents();
      unsubClasses();
      unsubSchedules();
    };
  }, [selectedGroup]);

  const initializeSchedules = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      for (const schedule of CLASS_SCHEDULE) {
        // Check if it already exists by name and shift
        const existing = schedules.find(s => s.name === schedule.name && s.shift === schedule.shift);
        if (!existing) {
          const { id, ...scheduleData } = schedule;
          await setDoc(doc(db, 'schedules', id), {
            ...scheduleData,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Error initializing schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    // Check if a group with this name and shift already exists to prevent duplicates
    const existing = schedules.find(s => s.name === groupName && s.shift === groupShift);
    if (existing) {
      return;
    }

    try {
      await addDoc(collection(db, 'schedules'), {
        name: groupName,
        ageRange: groupAgeRange,
        shift: groupShift,
        days: {
          'Terça-feira': [],
          'Quarta-feira': [],
          'Quinta-feira': [],
          'Sexta-feira': [],
          'Sábado': []
        },
        createdAt: serverTimestamp()
      });
      setIsAddingGroup(false);
      setGroupName('');
      setGroupAgeRange('');
      setGroupShift('Integral');
    } catch (error) {
      console.error('Error adding group:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'schedules', groupId));
      if (selectedGroup === groupId) {
        setSelectedGroup('');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedGroup) return;
    try {
      const group = schedules.find(s => s.id === selectedGroup);
      if (!group) return;

      const newActivity: ScheduleItem = {
        time: activityTime,
        activity: activityName,
        details: activityDetails
      };

      const updatedDays = { ...group.days };
      if (!updatedDays[selectedDay]) updatedDays[selectedDay] = [];
      
      if (isEditingActivity && editingActivityIndex !== null) {
        updatedDays[selectedDay][editingActivityIndex] = newActivity;
      } else {
        updatedDays[selectedDay] = [...updatedDays[selectedDay], newActivity];
      }

      // Sort by time
      updatedDays[selectedDay].sort((a, b) => a.time.localeCompare(b.time));

      const { id, ...groupData } = group;
      await updateDoc(doc(db, 'schedules', id), {
        ...groupData,
        days: updatedDays
      });

      setIsAddingActivity(false);
      setIsEditingActivity(false);
      setEditingActivityIndex(null);
      setActivityTime('');
      setActivityName('');
      setActivityDetails('');
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleDeleteActivity = async (index: number) => {
    if (!isAdmin || !selectedGroup) return;
    try {
      const group = schedules.find(s => s.id === selectedGroup);
      if (!group) return;

      const updatedDays = { ...group.days };
      updatedDays[selectedDay] = updatedDays[selectedDay].filter((_, i) => i !== index);

      const { id, ...groupData } = group;
      await updateDoc(doc(db, 'schedules', id), {
        ...groupData,
        days: updatedDays
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const openEditActivity = (index: number, item: ScheduleItem) => {
    setEditingActivityIndex(index);
    setActivityTime(item.time);
    setActivityName(item.activity);
    setActivityDetails(item.details || '');
    setIsEditingActivity(true);
    setIsAddingActivity(true);
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    // Smooth scroll to details on mobile/small screens
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !user) return;

    try {
      await addDoc(collection(db, 'events'), {
        title: newEventTitle,
        description: newEventDescription,
        date: format(selectedDate, 'yyyy-MM-dd'),
        type: newEventType,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventType('other');
      setIsAddingEvent(false);
    } catch (error) {
      console.error("Erro ao adicionar evento:", error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1a36b1] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {view === 'calendar' ? 'Calendário Escolar' : 'Programação de Aulas'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {view === 'calendar' 
                ? format(currentMonth, 'MMMM yyyy', { locale: ptBR })
                : 'Horários e atividades semanais'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setView('calendar')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                view === 'calendar' ? "bg-white text-[#1a36b1] shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Calendário
            </button>
            <button
              onClick={() => setView('schedule')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                view === 'schedule' ? "bg-white text-[#1a36b1] shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Programação
            </button>
          </div>

          {view === 'calendar' && (
            <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 text-xs font-bold text-[#1a36b1] hover:bg-blue-50 rounded-xl transition-all"
              >
                Hoje
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {view === 'calendar' && (isAdmin || isTeacher) && (
            <button
              onClick={() => setIsAddingEvent(true)}
              className="bg-[#f9a825] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-orange-900/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Novo Evento
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day, index) => (
          <div key={index} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    return (
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {calendarDays.map((day, index) => {
          const formattedDate = format(day, 'yyyy-MM-dd');
          const dayAttendance = attendanceData.filter(record => record.date === formattedDate);
          const dayEvents = events.filter(event => event.date === formattedDate);
          const hasAttendance = dayAttendance.length > 0;
          const hasEvents = dayEvents.length > 0;
          
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDateClick(day)}
              className={`
                relative min-h-[60px] md:min-h-[110px] p-2 md:p-3 rounded-2xl md:rounded-3xl border transition-all cursor-pointer group
                ${!isSameMonth(day, monthStart) ? 'bg-slate-50/50 border-transparent opacity-40' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}
                ${isSameDay(day, selectedDate) ? 'ring-2 ring-[#1a36b1] border-[#1a36b1] shadow-lg shadow-blue-100' : ''}
                ${isToday(day) ? 'bg-blue-50/30' : ''}
              `}
            >
              <span className={`text-xs md:text-sm font-bold ${isToday(day) ? 'text-[#1a36b1]' : 'text-slate-700'}`}>
                {format(day, 'd')}
              </span>
              
              <div className="mt-1 md:mt-2 space-y-0.5 md:space-y-1 overflow-hidden">
                {hasEvents && dayEvents.slice(0, 2).map(event => (
                  <div 
                    key={event.id}
                    className={`px-1 md:px-2 py-0.5 rounded-md text-[6px] md:text-[8px] font-black uppercase tracking-tighter truncate
                      ${event.type === 'holiday' ? 'bg-red-100 text-red-600' : 
                        event.type === 'exam' ? 'bg-amber-100 text-amber-600' : 
                        event.type === 'meeting' ? 'bg-blue-100 text-blue-600' : 
                        'bg-slate-100 text-slate-600'}`}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[6px] md:text-[8px] font-bold text-slate-400 pl-1">
                    +{dayEvents.length - 2} mais
                  </div>
                )}
                
                {hasAttendance && (
                  <div className="flex items-center gap-1 text-[6px] md:text-[8px] font-black text-emerald-600 uppercase tracking-tighter px-1 md:px-2">
                    <CheckCircle2 className="w-1.5 h-1.5 md:w-2 md:h-2" />
                    <span className="hidden md:inline">Chamada OK</span>
                  </div>
                )}
              </div>

              {isToday(day) && (
                <div className="absolute top-2 right-2 md:top-3 md:right-3 w-1 md:w-1.5 h-1 md:h-1.5 bg-[#1a36b1] rounded-full shadow-sm shadow-blue-200" />
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderSelectedDayDetails = () => {
    const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
    const dayRecords = attendanceData.filter(record => record.date === formattedSelectedDate);
    const dayEvents = events.filter(event => event.date === formattedSelectedDate);

    return (
      <div ref={detailsRef} className="mt-8 space-y-8 scroll-mt-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[#1a36b1] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </h2>
            <p className="text-slate-500 font-medium text-sm">Detalhes e registros do dia selecionado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={`events-${formattedSelectedDate}`}
            className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <Info className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Eventos Escolares</h3>
              </div>
              <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {dayEvents.length} {dayEvents.length === 1 ? 'Evento' : 'Eventos'}
              </div>
            </div>

            {dayEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayEvents.map(event => (
                  <div key={event.id} className="flex flex-col p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest
                        ${event.type === 'holiday' ? 'bg-red-100 text-red-600' : 
                          event.type === 'exam' ? 'bg-amber-100 text-amber-600' : 
                          event.type === 'meeting' ? 'bg-blue-100 text-blue-600' : 
                          'bg-slate-100 text-slate-600'}`}>
                        {event.type === 'holiday' ? 'Feriado' : event.type === 'exam' ? 'Prova' : event.type === 'meeting' ? 'Reunião' : 'Outro'}
                      </div>
                      {(isAdmin || event.createdBy === user?.uid) && (
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-2 leading-tight">{event.title}</h4>
                    {event.description && <p className="text-sm text-slate-500 font-medium leading-relaxed">{event.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-50/30 rounded-[2rem] border border-dashed border-slate-200">
                <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold italic">Nenhum evento agendado para este dia.</p>
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            key={`attendance-${formattedSelectedDate}`}
            className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Presença</h3>
            </div>

            {dayRecords.length > 0 ? (
              <div className="space-y-8 flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                    <p className="text-4xl font-black text-emerald-600">{dayRecords.filter(r => r.status === 'present').length}</p>
                    <p className="text-[10px] font-black text-emerald-700/50 uppercase tracking-widest mt-1">Presentes</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                    <p className="text-4xl font-black text-slate-400">{dayRecords.length}</p>
                    <p className="text-[10px] font-black text-slate-500/50 uppercase tracking-widest mt-1">Total</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                    <span>Taxa de Presença</span>
                    <span className="text-[#1a36b1]">{Math.round((dayRecords.filter(r => r.status === 'present').length / dayRecords.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(dayRecords.filter(r => r.status === 'present').length / dayRecords.length) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-[#1a36b1] rounded-full shadow-lg shadow-blue-900/20"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#1a36b1] rounded-full" />
                      <span>Presentes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-200 rounded-full" />
                      <span>Ausentes</span>
                    </div>
                  </div>

                  {/* Class Breakdown */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Por Turma</p>
                    {Array.from(new Set(dayRecords.map(r => r.classId))).map(classId => {
                      const classRecords = dayRecords.filter(r => r.classId === classId);
                      const className = classes.find(c => c.id === classId)?.name || 'Turma Desconhecida';
                      const presentCount = classRecords.filter(r => r.status === 'present').length;
                      const percentage = Math.round((presentCount / classRecords.length) * 100);
                      
                      return (
                        <div key={classId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-700">{className}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#1a36b1]">{percentage}%</span>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#1a36b1]" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-50/30 rounded-[2rem] border border-dashed border-slate-200 flex-1 flex flex-col justify-center">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold italic">Sem registros de chamada.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    const group = schedules.find(g => g.id === selectedGroup);
    const availableDays = group ? Object.keys(group.days) : ['Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sábado'];
    const dayItems = group?.days[selectedDay] || [];

    if (schedules.length === 0 && !loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Nenhuma programação encontrada</h3>
          <p className="text-slate-500 mb-8 text-center max-w-md">
            Você pode inicializar as programações padrão baseadas no PDF ou criar uma nova do zero.
          </p>
          <div className="flex gap-4">
            {isAdmin && (
              <>
                <button
                  onClick={initializeSchedules}
                  className="bg-[#1a36b1] text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  Inicializar Padrão
                </button>
                <button
                  onClick={() => setIsAddingGroup(true)}
                  className="bg-white text-slate-600 border border-slate-200 px-8 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  Criar Nova
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Group Selector */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 min-w-0 flex-1">
              {schedules.map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGroup(g.id);
                    const days = Object.keys(g.days);
                    if (!days.includes(selectedDay)) {
                      setSelectedDay(days[0]);
                    }
                  }}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                    selectedGroup === g.id 
                      ? "bg-[#1a36b1] text-white border-[#1a36b1] shadow-lg shadow-blue-900/20" 
                      : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                  )}
                >
                  {g.name} {g.shift !== 'Integral' && `(${g.shift})`}
                </button>
              ))}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddingGroup(true)}
                  className="p-3 bg-blue-50 text-[#1a36b1] rounded-xl hover:bg-blue-100 transition-colors"
                  title="Adicionar Novo Grupo"
                >
                  <Plus className="w-5 h-5" />
                </button>
                {selectedGroup && (
                  <button
                    onClick={() => handleDeleteGroup(selectedGroup)}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                    title="Excluir Grupo Selecionado"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Day Selector */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Dias da Semana</h3>
              <div className="space-y-2">
                {['Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all group",
                      selectedDay === day 
                        ? "bg-blue-50 text-[#1a36b1]" 
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <span>{day}</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", selectedDay === day ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
                  </button>
                ))}
              </div>
            </div>

            {group && (
              <div className="bg-[#1a36b1] p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-900/20">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <Info className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-black tracking-tight mb-2">{group.name}</h4>
                {group.ageRange && <p className="text-blue-100 text-sm font-medium mb-4">{group.ageRange}</p>}
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-200">
                  <Clock className="w-4 h-4" />
                  Turno {group.shift}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="lg:col-span-3">
            <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedDay}</h3>
                    <p className="text-slate-500 font-medium">Cronograma de atividades</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {dayItems.length} Atividades
                  </div>
                  {isAdmin && selectedGroup && (
                    <button
                      onClick={() => {
                        setIsEditingActivity(false);
                        setIsAddingActivity(true);
                      }}
                      className="bg-[#1a36b1] text-white p-3 rounded-xl hover:scale-105 transition-all shadow-lg shadow-blue-900/10"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {dayItems.length > 0 ? (
                  dayItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative pl-12 group"
                    >
                      <div className="absolute left-3 top-2 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#1a36b1] z-10 group-hover:scale-125 transition-transform" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-slate-200/50 transition-all duration-300">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 text-[10px] font-black text-[#1a36b1] uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </div>
                          <h4 className="text-lg font-black text-slate-900 leading-tight">{item.activity}</h4>
                          {item.details && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                              <MapPin className="w-4 h-4 text-slate-300" />
                              {item.details}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditActivity(index, item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-[#1a36b1] group-hover:border-blue-100 transition-colors">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 font-medium italic pl-12">
                    Nenhuma atividade programada para este dia.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full">
      {renderHeader()}
      
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#1a36b1] animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'calendar' ? (
            <motion.div
              key="calendar-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-x-auto">
                <div className="min-w-[300px]">
                  {renderDays()}
                  {renderCells()}
                </div>
              </div>
              {renderSelectedDayDetails()}
            </motion.div>
          ) : (
            <motion.div
              key="schedule-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {renderSchedule()}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Add Group Modal */}
      <AnimatePresence>
        {isAddingGroup && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nova Programação</h3>
                <button
                  onClick={() => setIsAddingGroup(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddGroup} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Grupo</label>
                  <select
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#1a36b1] focus:bg-white outline-none transition-all font-medium appearance-none"
                  >
                    <option value="">Selecione um grupo...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Faixa Etária (Opcional)</label>
                  <input
                    type="text"
                    value={groupAgeRange}
                    onChange={(e) => setGroupAgeRange(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#1a36b1] focus:bg-white outline-none transition-all font-medium"
                    placeholder="Ex: 06 a 09 anos"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Turno</label>
                  <select
                    value={groupShift}
                    onChange={(e) => setGroupShift(e.target.value as any)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#1a36b1] focus:bg-white outline-none transition-all font-medium appearance-none"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1a36b1] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  Criar Programação
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Activity Modal */}
      <AnimatePresence>
        {isAddingActivity && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {isEditingActivity ? 'Editar Atividade' : 'Nova Atividade'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddingActivity(false);
                    setIsEditingActivity(false);
                  }}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddActivity} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Horário</label>
                  <input
                    type="text"
                    required
                    value={activityTime}
                    onChange={(e) => setActivityTime(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#1a36b1] focus:bg-white outline-none transition-all font-medium"
                    placeholder="Ex: 09:00 às 10:00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Atividade</label>
                  <input
                    type="text"
                    required
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#1a36b1] focus:bg-white outline-none transition-all font-medium"
                    placeholder="Ex: Capoeira Angola"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detalhes / Local (Opcional)</label>
                  <textarea
                    value={activityDetails}
                    onChange={(e) => setActivityDetails(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#1a36b1] focus:bg-white outline-none transition-all font-medium min-h-[100px] resize-none"
                    placeholder="Ex: Salão Mestre Virgílio"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1a36b1] text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  {isEditingActivity ? 'Salvar Alterações' : 'Adicionar Atividade'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Evento</h2>
                <button onClick={() => setIsAddingEvent(false)} className="p-2 text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleAddEvent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Título do Evento</label>
                  <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="Ex: Reunião de Pais, Feriado Local"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Evento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['holiday', 'exam', 'meeting', 'other'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewEventType(type)}
                        className={`py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border
                          ${newEventType === type ? 'bg-[#1a36b1] text-white border-[#1a36b1]' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                      >
                        {type === 'holiday' ? 'Feriado' : type === 'exam' ? 'Prova' : type === 'meeting' ? 'Reunião' : 'Outro'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição (Opcional)</label>
                  <textarea
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    placeholder="Detalhes sobre o evento..."
                    rows={3}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#1a36b1] outline-none transition-all font-medium resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingEvent(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#f9a825] text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                  >
                    Salvar Evento
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

export default Calendar;
