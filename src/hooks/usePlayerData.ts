import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Player, TrainingSession, SessionExercise, Task } from '../types/database'

export function usePlayerData() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Player | null>(null)
  const [training, setTraining] = useState<TrainingSession[]>([])
  const [sessionEx, setSessionEx] = useState<SessionExercise[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const { data: p } = await supabase.from('players').select('*')
      .eq('auth_user_id', session.user.id).maybeSingle()
    if (!p) { setLoading(false); return }
    const player = p as Player
    setProfile(player)
    const [tr, ex, tk] = await Promise.all([
      supabase.from('training_sessions').select('*').eq('player_id', player.id).order('date', { ascending: false }),
      supabase.from('session_exercises').select('*').eq('player_id', player.id).order('ord', { ascending: true }),
      supabase.from('tasks').select('*').eq('player_id', player.id).order('created_at', { ascending: false }),
    ])
    setTraining((tr.data as TrainingSession[]) ?? [])
    setSessionEx((ex.data as SessionExercise[]) ?? [])
    setTasks((tk.data as Task[]) ?? [])
    setLoading(false)
  }, [session])

  useEffect(() => { reload() }, [reload])

  return { profile, training, sessionEx, tasks, loading, reload }
}
