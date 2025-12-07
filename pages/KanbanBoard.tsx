import React, { useEffect, useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Person, Chore, ChoreStatus, ChorePriority } from "../types";
import { subscribeToChores, subscribeToPeople, completeChore, updateChore } from "../services/dataService";
import { Calendar, User, ArrowRight, Check } from "lucide-react";
import ChoreModal from "../components/ChoreModal";
import { PRIORITY_CONFIG } from "../constants";

const KanbanBoard: React.FC = () => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | undefined>(undefined);
  
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const unsubChores = subscribeToChores(setChores);
    const unsubPeople = subscribeToPeople(setPeople);
    return () => {
      unsubChores();
      unsubPeople();
    };
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const chore = chores.find((c) => c.id === draggableId);
    if (!chore) return;

    const destStatus = destination.droppableId as ChoreStatus;
    const sourceStatus = source.droppableId as ChoreStatus;

    // Handle completion logic
    if (destStatus === ChoreStatus.COMPLETED && sourceStatus !== ChoreStatus.COMPLETED) {
      await completeChore(chore);
    } 
    // Handle un-completion logic (move from Done back to Pending/In Progress)
    else if (destStatus !== ChoreStatus.COMPLETED && sourceStatus === ChoreStatus.COMPLETED) {
      await updateChore(chore.id, { status: destStatus, completedAt: undefined });
    } 
    // Handle Pending <-> In Progress
    else {
      await updateChore(chore.id, { status: destStatus });
    }
  };

  const handleAdvanceState = async (e: React.MouseEvent, chore: Chore) => {
    e.stopPropagation(); // Prevent opening the modal
    if (chore.status === ChoreStatus.PENDING) {
      await updateChore(chore.id, { status: ChoreStatus.IN_PROGRESS });
    } else if (chore.status === ChoreStatus.IN_PROGRESS) {
      await completeChore(chore);
    }
  };

  const getAssignee = (id: string) => people.find((p) => p.id === id);

  const handleEditChore = (chore: Chore) => {
    setEditingChore(chore);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingChore(undefined);
  };

  const scrollToColumn = (columnId: string) => {
    const el = columnRefs.current[columnId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const columns = [
    { 
      id: ChoreStatus.PENDING, 
      title: "To Do", 
      bg: "bg-gray-100", 
      header: "border-t-4 border-blue-500",
      btnClass: "bg-blue-100 text-blue-700 border-blue-300",
      count: chores.filter((c) => c.status === ChoreStatus.PENDING).length
    },
    { 
      id: ChoreStatus.IN_PROGRESS, 
      title: "In Progress", 
      bg: "bg-yellow-50", 
      header: "border-t-4 border-yellow-500",
      btnClass: "bg-yellow-100 text-yellow-700 border-yellow-300",
      count: chores.filter((c) => c.status === ChoreStatus.IN_PROGRESS).length
    },
    { 
      id: ChoreStatus.COMPLETED, 
      title: "Done", 
      bg: "bg-green-50", 
      header: "border-t-4 border-green-500",
      btnClass: "bg-green-100 text-green-700 border-green-300",
      count: chores.filter((c) => c.status === ChoreStatus.COMPLETED).length
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)] md:h-[calc(100vh-8rem)] relative">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Task Board</h1>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Mobile: Snap scrolling, Desktop: Standard overflow */}
        <div className="flex-1 flex gap-4 md:gap-6 overflow-x-auto pb-24 md:pb-4 snap-x snap-mandatory px-0.5 scrollbar-hide">
          {columns.map((col) => (
            <div 
              key={col.id}
              ref={(el) => { columnRefs.current[col.id] = el; }}
              className={`flex-shrink-0 w-[85vw] md:w-[320px] md:flex-1 flex flex-col rounded-xl ${col.bg} p-3 md:p-4 snap-center h-full`}
            >
              <div className={`bg-white p-3 rounded-lg shadow-sm mb-3 md:mb-4 ${col.header} flex justify-between items-center sticky top-0 z-10`}>
                <h2 className="font-semibold text-gray-800">{col.title}</h2>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {col.count}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto space-y-3 min-h-[100px] pr-1"
                  >
                    {chores
                      .filter((c) => c.status === col.id)
                      .map((chore, index) => {
                        const assignee = getAssignee(chore.assigneeId);
                        const priorityConfig = PRIORITY_CONFIG[chore.priority] || PRIORITY_CONFIG[ChorePriority.SOON];

                        return (
                          <Draggable key={chore.id} draggableId={chore.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => handleEditChore(chore)}
                                className={`bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
                                  snapshot.isDragging ? "rotate-2 scale-105 z-50" : ""
                                }`}
                                style={provided.draggableProps.style}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-medium text-gray-900 leading-snug text-sm md:text-base">{chore.title}</h3>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ml-2 flex-shrink-0 ${priorityConfig.class}`}>
                                    {priorityConfig.label}
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                                  <div className="flex items-center gap-2">
                                    {assignee ? (
                                      <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: assignee.color }}
                                        title={assignee.name}
                                      >
                                        {assignee.name[0]}
                                      </div>
                                    ) : (
                                      <User className="w-5 h-5 text-gray-300" />
                                    )}
                                    <div className="flex items-center gap-1 ml-2">
                                       <Calendar className="w-3 h-3" />
                                       {chore.dueDate ? new Date(chore.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) : "No date"}
                                    </div>
                                  </div>
                                </div>

                                {/* Call to Action Button */}
                                {chore.status !== ChoreStatus.COMPLETED && (
                                  <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                                    <button
                                      onClick={(e) => handleAdvanceState(e, chore)}
                                      className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full font-medium transition-colors ${
                                        chore.status === ChoreStatus.PENDING 
                                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100" 
                                          : "bg-green-50 text-green-700 hover:bg-green-100"
                                      }`}
                                    >
                                      {chore.status === ChoreStatus.PENDING ? "Start" : "Finish"}
                                      {chore.status === ChoreStatus.PENDING ? <ArrowRight className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Mobile Floating Column Navigation - Fixed Bottom */}
      <div className="md:hidden fixed bottom-[4.5rem] left-0 right-0 px-4 z-20 flex justify-center pointer-events-none">
        <div className="flex gap-2 bg-white/95 backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.15)] p-2 rounded-2xl border border-gray-100 pointer-events-auto">
          {columns.map((col) => (
            <button
              key={col.id}
              onClick={() => scrollToColumn(col.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border-b-2 transition-all active:scale-95 ${col.btnClass}`}
            >
              {col.title}
            </button>
          ))}
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

export default KanbanBoard;