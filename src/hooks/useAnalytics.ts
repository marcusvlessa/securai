import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface AnalyticsData {
  totalCases: number
  activeCases: number
  closedCases: number
  totalEvidence: number
  totalUsers: number
  recentActivity: any[]
  casesByStatus: { status: string; count: number }[]
  evidenceByType: { type: string; count: number }[]
  userActivity: { date: string; count: number }[]
  topCrimeTypes: { crime_type: string; count: number }[]
}

interface UseAnalyticsResult {
  data: AnalyticsData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useAnalytics = (timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): UseAnalyticsResult => {
  const { profile } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getTimeRangeDate = (range: string) => {
    const now = new Date()
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  const fetchAnalytics = async () => {
    if (!profile?.organization_id) return

    setLoading(true)
    setError(null)

    try {
      const startDate = getTimeRangeDate(timeRange).toISOString()
      const organizationId = profile.organization_id

      // Fetch cases data
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('id, status, created_at, metadata')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)

      if (casesError) throw casesError

      // Fetch evidence data
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('evidence')
        .select('id, type, created_at, case_id, analysis_results')
        .in('case_id', casesData?.map(c => c.id) || [])
        .gte('created_at', startDate)

      if (evidenceError) throw evidenceError

      // Fetch users data
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, last_login, created_at')
        .eq('organization_id', organizationId)

      if (usersError) throw usersError

      // Fetch recent activity
      const { data: activityData, error: activityError } = await supabase
        .from('analytics_events')
        .select('event_type, event_data, created_at, user_id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(20)

      if (activityError) throw activityError

      // Process data
      const totalCases = casesData?.length || 0
      const activeCases = casesData?.filter(c => ['open', 'investigating'].includes(c.status)).length || 0
      const closedCases = casesData?.filter(c => c.status === 'closed').length || 0
      const totalEvidence = evidenceData?.length || 0
      const totalUsers = usersData?.length || 0

      // Cases by status
      const statusCounts = casesData?.reduce((acc, case_) => {
        acc[case_.status] = (acc[case_.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const casesByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }))

      // Evidence by type
      const typeCounts = evidenceData?.reduce((acc, evidence) => {
        acc[evidence.type] = (acc[evidence.type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const evidenceByType = Object.entries(typeCounts).map(([type, count]) => ({
        type,
        count
      }))

      // User activity over time
      const activityByDate = activityData?.reduce((acc, activity) => {
        const date = activity.created_at.split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const userActivity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Top crime types (from evidence analysis results)
      const crimeTypeCounts = evidenceData?.reduce((acc, evidence) => {
        if (evidence.analysis_results?.crime_types) {
          evidence.analysis_results.crime_types.forEach((crimeType: string) => {
            acc[crimeType] = (acc[crimeType] || 0) + 1
          })
        }
        return acc
      }, {} as Record<string, number>) || {}

      const topCrimeTypes = Object.entries(crimeTypeCounts)
        .map(([crime_type, count]) => ({ crime_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setData({
        totalCases,
        activeCases,
        closedCases,
        totalEvidence,
        totalUsers,
        recentActivity: activityData || [],
        casesByStatus,
        evidenceByType,
        userActivity,
        topCrimeTypes
      })
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      setError(error.message || 'Erro ao carregar dados de analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [profile?.organization_id, timeRange])

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics
  }
}

// Hook for tracking events
export const useTrackEvent = () => {
  const { user, profile } = useAuth()

  const trackEvent = async (eventType: string, eventData: any = {}, caseId?: string) => {
    if (!user || !profile) return

    try {
      await supabase.from('analytics_events').insert({
        organization_id: profile.organization_id,
        case_id: caseId || null,
        user_id: user.id,
        event_type: eventType,
        event_data: eventData,
        user_agent: navigator.userAgent
      })
    } catch (error) {
      console.error('Error tracking event:', error)
    }
  }

  return { trackEvent }
}