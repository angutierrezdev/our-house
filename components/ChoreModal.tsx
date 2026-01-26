import React, { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { Person, Chore, ChoreFrequency, ChoreStatus, ChorePriority, ChoreDifficulty } from "../types";
import { addChore, updateChore } from "../services/dataService";
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
  const [showAI, setShowAI] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(getSettings().aiEnabled);

  useEffect(() => {
    // Refresh settings whenever modal opens or when settings change event happens
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
    setDueDate(""); // Default to no date
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = dueDate ? new Date(dueDate).getTime() : undefined;

    const choreData: any = {
      title,
      description,
      frequency,
      priority,
      difficulty,
      assigneeId,
    };

    // Only add dueDate if it has a value (Firestore doesn't allow undefined)
    if (timestamp !== undefined) {
      choreData.dueDate = timestamp;
    }

    if (existingChore) {
      await updateChore(existingChore.id, choreData as Partial<Chore>);
    } else {
      await addChore({
        ...choreData,
        status: ChoreStatus.PENDING,
        createdAt: Date.now(),
      } as Omit<Chore, "id">);
    }
    onClose();
    resetForm();
  };

  const handleAISuggestion = (suggestion: { title: string, frequency: string }) => {
    setTitle(suggestion.title);
    setFrequency(suggestion.frequency as ChoreFrequency);
    setShowAI(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {existingChore ? "Edit Chore" : "New Chore"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
           {(!existingChore && aiEnabled) && (
             <div className="mb-4">
               <button 
                 type="button"
                 onClick={() => setShowAI(!showAI)}
                 className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
               >
                 <Sparkles className="w-4 h-4" />
                 {showAI ? "Hide AI Assistant" : "Ask AI for Ideas"}
               </button>
               {showAI && <AIAssistant onSelect={handleAISuggestion} />}
             </div>
           )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. Wash Dishes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Optional details..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ChoreFrequency)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={ChoreFrequency.ONE_TIME}>One-time</option>
                  <option value={ChoreFrequency.DAILY}>Daily</option>
                  <option value={ChoreFrequency.WEEKLY}>Weekly</option>
                  <option value={ChoreFrequency.MONTHLY}>Monthly</option>
                  <option value={ChoreFrequency.YEARLY}>Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ChorePriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ChoreDifficulty)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={ChoreDifficulty.EASY}>Easy</option>
                  <option value={ChoreDifficulty.MEDIUM}>Medium</option>
                  <option value={ChoreDifficulty.HARD}>Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {existingChore ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChoreModal;