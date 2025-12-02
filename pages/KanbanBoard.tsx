import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Person, Chore, ChoreStatus, ChorePriority } from "../types";
import { subscribeToChores, subscribeToPeople, completeChore, updateChore } from "../services/dataService";
import { Calendar, User } from "lucide-react";
import ChoreModal from "../components/ChoreModal";
import { PRIORITY_CONFIG } from "../constants";

const KanbanBoard: React.FC = () => {
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

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const chore = chores.find((c) => c.id === draggableId);
    if (!chore) return;

    // Optimistic update logic could be added here for smoother UI, 
    // but Firestore listeners will update state shortly.

    if (destination.droppableId === ChoreStatus.COMPLETED && source.droppableId !== ChoreStatus.COMPLETED) {
      await completeChore(chore);
    } else if (destination.droppableId === ChoreStatus.PENDING && source.droppableId !== ChoreStatus.PENDING) {
      await updateChore(chore.id, { status: ChoreStatus.PENDING, completedAt: undefined });
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

  const columns = [
    { id: ChoreStatus.PENDING, title: "To Do", bg: "bg-gray-100", header: "border-t-4 border-blue-500" },
    { id: ChoreStatus.COMPLETED, title: "Done", bg: "bg-green-50", header: "border-t-4 border-green-500" },
  ];

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 h-full overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className={`flex-1 min-w-[300px] flex flex-col rounded-xl ${col.bg} p-4`}>
              <div className={`bg-white p-3 rounded-lg shadow-sm mb-4 ${col.header} flex justify-between items-center`}>
                <h2 className="font-semibold text-gray-800">{col.title}</h2>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {chores.filter((c) => c.status === col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto space-y-3 min-h-[100px]"
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
                                className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
                                  snapshot.isDragging ? "rotate-2 scale-105" : ""
                                }`}
                                style={provided.draggableProps.style}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-medium text-gray-900 leading-snug">{chore.title}</h3>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ml-2 ${priorityConfig.class}`}>
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
                                  </div>
                                  <div className="flex items-center gap-1">
                                     <Calendar className="w-3 h-3" />
                                     {chore.dueDate ? new Date(chore.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) : "No date"}
                                  </div>
                                </div>
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