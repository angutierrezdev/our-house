import React, { useEffect, useState } from "react";
import { Person } from "../types";
import { subscribeToPeople, addPerson, deletePerson } from "../services/dataService";
import { COLORS } from "../constants";
import { Trash2, UserPlus } from "lucide-react";

const PeopleManager: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  useEffect(() => {
    const unsub = subscribeToPeople(setPeople);
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addPerson({
      name: newName,
      color: selectedColor,
      avatar: ""
    });
    setNewName("");
    setSelectedColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Household Members</h2>
        
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 items-center">
             {COLORS.map(c => (
               <button
                 key={c}
                 type="button"
                 onClick={() => setSelectedColor(c)}
                 className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedColor === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                 style={{ backgroundColor: c }}
               />
             ))}
          </div>
          <button
            type="submit"
            disabled={!newName.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add
          </button>
        </form>

        <div className="space-y-3">
          {people.length === 0 ? (
             <p className="text-center text-gray-400 py-4">No people added yet.</p>
          ) : (
            people.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name[0]}
                  </div>
                  <span className="font-medium text-gray-900">{person.name}</span>
                </div>
                <button
                  onClick={() => deletePerson(person.id)}
                  className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  title="Remove person"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleManager;