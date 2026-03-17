import React, { useEffect, useState } from "react";
import { Person, Chore, ChoreStatus, ChorePriority, ChoreDifficulty } from "../types";
import { subscribeToChores, subscribeToPeople, completeChore, deleteChore } from "../services/dataService";
import { CheckCircle2, Clock, Trash2, Plus, Calendar, Zap, ListChecks } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import ChoreModal from "../components/ChoreModal";
import { PRIORITY_CONFIG } from "../constants";

const Dashboard: React.FC = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | undefined>(undefined);

  useEffect(() => {
    const unsubChores = subscribeToChores(setChores);
    const unsubPeople = subscribeToPeople(setPeople);
    return () => {
      unsubChores();
      unsubPeople();
    };
  }, []);

  const pendingChores = chores.filter((c) => c.status === ChoreStatus.PENDING || c.status === ChoreStatus.IN_PROGRESS);
  const completedChores = chores.filter((c) => c.status === ChoreStatus.COMPLETED);

  const chartData = people.map(person => {
    const count = completedChores.filter(c => c.assigneeId === person.id).length;
    return { name: person.name, completed: count, color: person.color };
  });

  const getAssignee = (id: string) => people.find((p) => p.id === id);

  const handleAddChore = () => {
    setEditingChore(undefined);
    setIsModalOpen(true);
  };

  const handleEditChore = (chore: Chore) => {
    setEditingChore(chore);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingChore(undefined);
  };

  const handleCompleteWithChecklist = async (e: React.MouseEvent, chore: Chore) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hasUnfinished = chore.checklist?.some(item => !item.completed);
    
    if (hasUnfinished) {
      const confirmAll = window.confirm("The checklist is not fully completed. Mark all items as done and complete the task?");
      if (confirmAll) {
        const updatedChecklist = chore.checklist?.map(item => ({ ...item, completed: true }));
        await completeChore({ ...chore, checklist: updatedChecklist });
      }
    } else {
      await completeChore(chore);
    }
  };

  const getDifficultyColor = (diff: ChoreDifficulty) => {
    switch (diff) {
      case ChoreDifficulty.EASY: return 'text-green-600 bg-green-50 border-green-100';
      case ChoreDifficulty.MEDIUM: return 'text-orange-600 bg-orange-50 border-orange-100';
      case ChoreDifficulty.HARD: return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Stats Cards - Moved below chores on mobile */}
      <div className="order-2 md:order-1 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between md:justify-start">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Tasks</p>
              <h3 className="text-2xl font-bold text-gray-900">{pendingChores.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between md:justify-start">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <h3 className="text-2xl font-bold text-gray-900">{completedChores.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
           <button 
             type="button"
             onClick={handleAddChore}
             className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
           >
             <Plus className="w-5 h-5" />
             Add New Chore
           </button>
        </div>
      </div>

      <div className="order-1 md:order-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Chores</h2>
          </div>
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[500px]">
            {pendingChores.length === 0 ? (
               <div className="p-8 text-center text-gray-400">No active chores. You're all caught up!</div>
            ) : (
              pendingChores.map((chore) => {
                const assignee = getAssignee(chore.assigneeId);
                const priorityConfig = PRIORITY_CONFIG[chore.priority] || PRIORITY_CONFIG[ChorePriority.SOON];
                
                const checklistTotal = chore.checklist?.length || 0;
                const checklistDone = chore.checklist?.filter(i => i.completed).length || 0;
                const progressPercent = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;

                return (
                  <div 
                    key={chore.id} 
                    onClick={() => handleEditChore(chore)}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer active:bg-gray-100"
                  >
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
                      <button 
                        type="button"
                        onClick={(e) => handleCompleteWithChecklist(e, chore)}
                        className="text-gray-400 hover:text-green-600 active:text-green-700 transition-colors flex-shrink-0 p-1"
                        title="Complete task"
                      >
                        <CheckCircle2 className="w-7 h-7" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-gray-900 truncate max-w-full">{chore.title}</h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityConfig.class} whitespace-nowrap`}>
                            {priorityConfig.label}
                          </span>
                          <span className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded border capitalize ${getDifficultyColor(chore.difficulty || ChoreDifficulty.MEDIUM)}`}>
                            <Zap className="w-2.5 h-2.5" />
                            {chore.difficulty || 'medium'}
                          </span>
                          {chore.status === ChoreStatus.IN_PROGRESS && (
                             <span className="text-[10px] px-1.5 py-0.5 rounded border bg-yellow-100 text-yellow-700 border-yellow-200 whitespace-nowrap">
                               In Progress
                             </span>
                          )}
                        </div>
                        
                        {checklistTotal > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                               <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {checklistDone}/{checklistTotal} Items</span>
                               <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }} 
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1.5 flex-wrap">
                          {assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div 
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0"
                                style={{ backgroundColor: assignee.color }}
                              >
                                {assignee.name[0]}
                              </div>
                              <span className="truncate max-w-[80px] md:max-w-none">{assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Unassigned</span>
                          )}
                          <span className="flex items-center gap-1 text-xs md:text-sm">
                            <Calendar className="w-3 h-3" />
                            {chore.dueDate ? new Date(chore.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "--/--"}
                          </span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] md:text-xs capitalize">
                            {chore.frequency}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm("Delete this chore permanently?")) {
                          deleteChore(chore.id);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 p-2 md:opacity-0 group-hover:opacity-100 transition-all ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Completion Stats</h2>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  tick={{fontSize: 11, fill: '#6b7280'}} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  allowDecimals={false} 
                  axisLine={false}
                  tickLine={false}
                  tick={{fontSize: 11, fill: '#9ca3af'}}
                />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="completed" 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


      <ChoreModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        people={people} 
        existingChore={editingChore}
      />
    </div>
  );
};

export default Dashboard;