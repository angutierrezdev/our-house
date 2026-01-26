import { Chore, Person } from "../types";

export const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

const CHORES_KEY = "choremaster_chores";
const PEOPLE_KEY = "choremaster_people";

export const getLocalChores = (): Chore[] => {
  const stored = localStorage.getItem(CHORES_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLocalChores = (chores: Chore[]) => {
  localStorage.setItem(CHORES_KEY, JSON.stringify(chores));
};

export const getLocalPeople = (): Person[] => {
  const stored = localStorage.getItem(PEOPLE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLocalPeople = (people: Person[]) => {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
};