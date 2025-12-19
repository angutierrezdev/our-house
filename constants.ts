import { ChorePriority } from "./types";

export const APP_NAME = "ChoreMaster";

export const COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
];

export const ROUTES = {
  DASHBOARD: "/",
  KANBAN: "/kanban",
  PEOPLE: "/people",
  SETTINGS: "/settings",
};

export const PRIORITY_CONFIG: Record<ChorePriority, { label: string; class: string }> = {
  [ChorePriority.URGENT]: { 
    label: "Urgent", 
    class: "bg-red-100 text-red-700 border-red-200" 
  },
  [ChorePriority.SOON]: { 
    label: "Do it soon", 
    class: "bg-orange-100 text-orange-700 border-orange-200" 
  },
  [ChorePriority.LATER]: { 
    label: "Can wait", 
    class: "bg-blue-100 text-blue-700 border-blue-200" 
  },
  [ChorePriority.WHENEVER]: { 
    label: "When you wish", 
    class: "bg-gray-100 text-gray-700 border-gray-200" 
  },
};

export const PRIORITY_WEIGHTS: Record<ChorePriority, number> = {
  [ChorePriority.URGENT]: 1,
  [ChorePriority.SOON]: 2,
  [ChorePriority.LATER]: 3,
  [ChorePriority.WHENEVER]: 4,
};