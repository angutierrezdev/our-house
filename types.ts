export interface Person {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  updatedAt?: number; // timestamp — used for last-write-wins conflict resolution
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export enum ChoreFrequency {
  ONE_TIME = 'one-time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum ChoreStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

export enum ChorePriority {
  URGENT = 'urgent',
  SOON = 'soon',
  LATER = 'later',
  WHENEVER = 'whenever',
}

export enum ChoreDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface Chore {
  id: string;
  title: string;
  description: string;
  frequency: ChoreFrequency;
  priority: ChorePriority;
  difficulty: ChoreDifficulty;
  assigneeId: string; // can be empty string if unassigned
  status: ChoreStatus;
  completedAt?: number; // timestamp
  dueDate?: number; // timestamp (optional)
  createdAt: number; // timestamp
  updatedAt?: number; // timestamp — used for last-write-wins conflict resolution
  checklist?: ChecklistItem[];
}

export interface AppState {
  people: Person[];
  chores: Chore[];
  loading: boolean;
}