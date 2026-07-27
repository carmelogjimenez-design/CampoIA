import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Player } from '../types/database'
import { useAuth } from '../context/AuthContext'

export function usePlayers() {
  const { session } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const coachId = session?.user.id ?? null

  const reload = useCallback(async () => {
    if (!coachId) return
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    setPlayers((data as Player[]) ?? [])
    setLoading(false)
  }, [coachId])

  useEffect(() => { reload() }, [reload])

  async function addPlayer(input: Partial<Player>) {
    if (!coachId) return { error: 'Sin sesión' }
    const { data, error } = await supabase
      .from('players')
      .insert([{ ...input, coach_id: coachId }])
      .select()
      .single()
    if (error) return { error: error.message }
    setPlayers(prev => [...prev, data as Player])
    return { data: data as Player }
  }

  return { players, loading, error, reload, addPlayer }
}
