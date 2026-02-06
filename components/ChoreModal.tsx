import React, { useState, useEffect } from "react";
import { X, Sparkles, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { Person, Chore, ChoreFrequency, ChoreStatus, ChorePriority, ChoreDifficulty, ChecklistItem } from "../types";
import { addChore, updateChore, completeChore } from "../services/dataService";
import AIAssistant from "./AIAssistant";
import { getSettings } from "../services/settingsService";

interface ChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  existingChore?: Chore;
}

const ChoreModal: React.FC<ChoreModalProps> = ({ isOpen, onClose, people, existingChore }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<ChoreFrequency>(ChoreFrequency.ONE_TIME);
  const [priority, setPriority] = useState<ChorePriority>(ChorePriority.SOON);
  const [difficulty, setDifficulty] = useState<ChoreDifficulty>(ChoreDifficulty.MEDIUM);
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(getSettings().aiEnabled);

  useEffect(() => {
    const refreshSettings = () => setAiEnabled(getSettings().aiEnabled);
    window.addEventListener("settingsChanged", refreshSettings);
    refreshSettings();

    if (existingChore) {
      setTitle(existingChore.title);
      setDescription(existingChore.description);
      setFrequency(existingChore.frequency);
      setPriority(existingChore.priority || ChorePriority.SOON);
      setDifficulty(existingChore.difficulty || ChoreDifficulty.MEDIUM);
      setAssigneeId(existingChore.assigneeId);
      setDueDate(existingChore.dueDate ? new Date(existingChore.dueDate).toISOString().split('T')[0] : "");
      setChecklist(existingChore.checklist || []);
    } else {
      resetForm();
    }

    return () => window.removeEventListener("settingsChanged", refreshSettings);
  }, [existingChore, isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFrequency(ChoreFrequency.ONE_TIME);
    setPriority(ChorePriority.SOON);
    setDifficulty(ChoreDifficulty.MEDIUM);
    setAssigneeId("");
    setDueDate("");
    setChecklist([]);
    setNewChecklistItem("");
  };

  const calculateStatus = (list: ChecklistItem[], currentStatus: ChoreStatus): ChoreStatus => {
    if (list.length === 0) return currentStatus;
    
    const completedCount = list.filter(i => i.completed).length;
    
    if (completedCount === list.length && list.length > 0) {
      return ChoreStatus.COMPLETED;
    } else if (completedCount > 0) {
      return ChoreStatus.IN_PROGRESS;
    } else {
      // If we have items but none are checked, we might want to stay in progress if it was manually set
      // but per requirements: "if I check one it becomes in progress" implies 0 checked is Pending or original
      return currentStatus === ChoreStatus.COMPLETED ? ChoreStatus.IN_PROGRESS : currentStatus;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = dueDate ? new Date(dueDate).getTime() : undefined;
    
    let targetStatus = existingChore ? existingChore.status : ChoreStatus.PENDING;
    targetStatus = calculateStatus(checklist, targetStatus);

    const choreData = {
      title,
      description,
      frequency,
      priority,
      difficulty,
      assigneeId,
      checklist,
      status: targetStatus
    };

    // Add dueDate only when timestamp is defined because Firebase's addDoc function breaks if undefined is sent
    if (timestamp) {
      (choreData as any).dueDate = timestamp;
    }

    if (existingChore) {
      // Special case: if status transitions to completed via checklist, use completeChore to trigger recurring logic
      if (targetStatus === ChoreStatus.COMPLETED && existingChore.status !== ChoreStatus.COMPLETED) {
        await completeChore({ ...existingChore, ...choreData } as Chore);
      } else {
        await updateChore(existingChore.id, choreData as Partial<Chore>);
      }
    } else {
      const newChoreData = {
        ...choreData,
        createdAt: Date.now(),
      };
      
      // If the new chore is already "completed" by some logic (though unlikely for new), handle it
      if (targetStatus === ChoreStatus.COMPLETED) {
        // We'd need to create it then complete it, or just add it as completed
        await addChore(newChoreData as Omit<Chore, "id">);
      } else {
        await addChore(newChoreData as Omit<Chore, "id">);
      }
    }
    onClose();
    resetForm();
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { id: crypto.randomUUID(), text: newChecklistItem.trim(), completed: false }]);
    setNewChecklistItem("");
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleAISuggestion = (suggestion: { title: string, frequency: string }) => {
    setTitle(suggestion.title);
    setFrequency(suggestion.frequency as ChoreFrequency);
    setShowAI(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {existingChore ? "Edit Chore" : "New Chore"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
           {(!existingChore && aiEnabled) && (
             <div className="mb-6">
               <button 
                 type="button"
                 onClick={() => setShowAI(!showAI)}
                 className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors border border-purple-100 shadow-sm"
               >
                 <Sparkles className="w-4 h-4" />
                 {showAI ? "Hide AI Assistant" : "Need ideas? Ask AI"}
               </button>
               {showAI && <AIAssistant onSelect={handleAISuggestion} />}
             </div>
           )}

          <form id="chore-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="e.g. Clean the kitchen"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Add more details about the task..."
                  rows={2}
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Checklist Items</label>
                <div className="space-y-2 mb-3">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100 group">
                      <button 
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`transition-colors ${item.completed ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}
                      >
                        {item.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                        {item.text}
                      </span>
                      <button 
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addChecklistItem(); }}}
                    placeholder="Add a sub-task..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as ChoreFrequency)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                  >
                    <option value={ChoreFrequency.ONE_TIME}>One-time</option>
                    <option value={ChoreFrequency.DAILY}>Daily</option>
                    <option value={ChoreFrequency.WEEKLY}>Weekly</option>
                    <option value={ChoreFrequency.MONTHLY}>Monthly</option>
                    <option value={ChoreFrequency.YEARLY}>Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ChorePriority)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                  >
                    <option value={ChorePriority.URGENT}>Urgent</option>
                    <option value={ChorePriority.SOON}>Do it soon</option>
                    <option value={ChorePriority.LATER}>Can wait</option>
                    <option value={ChorePriority.WHENEVER}>When you wish</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as ChoreDifficulty)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                  >
                    <option value={ChoreDifficulty.EASY}>Easy</option>
                    <option value={ChoreDifficulty.MEDIUM}>Medium</option>
                    <option value={ChoreDifficulty.HARD}>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                >
                  <option value="">Unassigned</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-white transition-colors text-sm shadow-sm"
          >
            Cancel
          </button>
          <button
            form="chore-form"
            type="submit"
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-md active:scale-[0.98]"
          >
            {existingChore ? "Save Changes" : "Create Chore"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChoreModal;