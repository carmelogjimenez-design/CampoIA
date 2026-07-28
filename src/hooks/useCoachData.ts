import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Player, TrainingSession, SessionExercise, Task, Match } from '../types/database'

export function useCoachData() {
  const { session } = useAuth()
  const coachId = session?.user.id ?? null
  const [players, setPlayers] = useState<Player[]>([])
  const [training, setTraining] = useState<TrainingSession[]>([])
  const [sessionEx, setSessionEx] = useState<SessionExercise[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!coachId) return
    setLoading(true); setError(null)
    try {
      const q = (t: string) => supabase.from(t).select('*').eq('coach_id', coachId)
      const [p, tr, ex, tk, mt] = await Promise.all([
        q('players').order('created_at', { ascending: true }),
        q('training_sessions').order('date', { ascending: false }),
        q('session_exercises').order('ord', { ascending: true }),
        q('tasks').order('created_at', { ascending: false }),
        q('matches').order('date', { ascending: false }),
      ])
      // si la consulta principal falla, es un error real (no "vacío")
      if (p.error) throw p.error
      setPlayers((p.data as Player[]) ?? [])
      setTraining((tr.data as TrainingSession[]) ?? [])
      setSessionEx((ex.data as SessionExercise[]) ?? [])
      setTasks((tk.data as Task[]) ?? [])
      setMatches((mt.data as Match[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [coachId])

  useEffect(() => { reload() }, [reload])

  return {
    coachId, players, training, sessionEx, tasks, matches, loading, error, reload,
    setTraining, setSessionEx, setTasks, setMatches,
  }
}
