export interface Person {
  id: string;
  name: string;
  color: string;
  avatar?: string;
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

export interface Chore {
  id: string;
  title: string;
  description: string;
  frequency: ChoreFrequency;
  priority: ChorePriority;
  assigneeId: string; // can be empty string if unassigned
  status: ChoreStatus;
  completedAt?: number; // timestamp
  dueDate?: number; // timestamp (optional)
  createdAt: number; // timestamp
}

export interface AppState {
  people: Person[];
  chores: Chore[];
  loading: boolean;
}