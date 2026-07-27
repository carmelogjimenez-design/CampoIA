// ════════════════════════════════════════════════════════════
// CAMPO — Tipos de la base de datos (Supabase)
// Estos tipos hacen que TypeScript te avise si escribes mal
// el nombre de una columna o le pasas el tipo equivocado.
// ════════════════════════════════════════════════════════════

export type PosGroup = 'POR' | 'DEF' | 'MED' | 'DEL'
export type PlayerStatus = 'active' | 'injured' | 'rest'

export interface Player {
  id: string
  coach_id: string | null
  auth_user_id: string | null
  invite_code: string | null
  name: string
  pos: string | null
  pos_group: PosGroup | null
  age: number | null
  foot: string | null
  club: string | null
  category: string | null
  status: PlayerStatus | null
  trend: string | null
  tag: string | null
  adherence: number | null
  mins: number | null
  callups: number | null
  played: number | null
  scored: number | null
  assisted: number | null
  score: number | null
  height_cm: number | null
  weight_kg: number | null
  vertical_jump: number | null
  horizontal_jump: number | null
  flexibility_cmj: number | null
  rm_squat: number | null
  rm_deadlift: number | null
  rm_bench: number | null
  ai_attributes: Record<string, number> | null
  ai_metrics: Record<string, number> | null
  strength: string | null
  improve: string | null
  photo_url: string | null
  created_at: string
}

export interface Match {
  id: string
  coach_id: string | null
  player_id: string
  date: string | null
  rival: string | null
  result: string | null
  mins: number | null
  called: string | null
  role: string | null
  goals: number | null
  assists: number | null
  conceded: number | null
  clean_sheet: boolean | null
  notes: string | null
  created_at: string
}

export interface TrainingSession {
  id: string
  coach_id: string | null
  player_id: string
  date: string | null
  type: string | null
  duration: number | null
  rpe: number | null
  goal: string | null
  notes: string | null
  completed: boolean
  completed_at: string | null
  player_feedback: string | null
  created_at: string
}

export interface SessionExercise {
  id: string
  session_id: string
  coach_id: string | null
  player_id: string
  title: string
  series: string | null
  reps: string | null
  weight: string | null
  video_url: string | null
  ord: number
  done: boolean
  feedback: string | null
  created_at: string
}

export interface Task {
  id: string
  coach_id: string | null
  player_id: string
  title: string | null
  description: string | null
  type: string | null
  priority: string | null
  due_date: string | null
  series: string | null
  reps: string | null
  weight: string | null
  video_url: string | null
  done: boolean
  created_at: string
}

export interface CheckIn {
  id: string
  coach_id: string | null
  player_id: string
  date: string | null
  mood: string | null
  energy: string | null
  sleep_hours: number | null
  pain: number | null
  pain_zone: string | null
  notes: string | null
  created_at: string
}

export interface Message {
  id: string
  coach_id: string | null
  player_id: string
  sender: string | null
  from_role: string | null
  text: string | null
  read: boolean
  created_at: string
}

export interface VideoAnalysis {
  id: string
  coach_id: string | null
  player_id: string
  title: string | null
  video_url: string | null
  video_type: string | null
  comment: string | null
  created_at: string
}

export type UserRole = 'coach' | 'player'
