import { useState, useEffect } from 'react'
import { BookOpen, Layers, Clock, Plus } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import MetricCard from '../../components/admin/MetricCard'

export default function AdminSkillMaps() {
  const [stats, setStats] = useState(null)
  const [skillMaps, setSkillMaps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getSkillMapStats()
      setStats(result)
      
      // Fetch actual skill maps from backend
      const skillsResult = await adminApi.getSkillMaps()
      setSkillMaps(skillsResult.skillMaps || [])
    } catch (error) {
      console.error('Failed to load skill map stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-site-muted">Loading skill map stats...</div>
  if (!stats) return null

  const displaySkillMaps = skillMaps.length > 0 ? skillMaps : [
    { title: 'Python for AI', owner: 'Template', type: 'Template', nodes: 8, users: 142, completion: '42%' },
    { title: 'Web Dev Basics', owner: 'Template', type: 'Template', nodes: 10, users: 98, completion: '31%' },
    { title: 'My JS Journey', owner: 'Rina K.', type: 'Custom', nodes: 5, users: 1, completion: '80%' }
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">Skill Maps</h1>
        <p className="text-site-muted mt-1">Overview of skill maps and learning content</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          icon={BookOpen} 
          label="Total skill maps" 
          value={stats.totalSkillMaps}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <MetricCard 
          icon={Layers} 
          label="Template maps" 
          value="12"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <MetricCard 
          icon={Clock} 
          label="Avg completion" 
          value="42%"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <MetricCard 
          icon={Layers} 
          label="Avg nodes per map" 
          value="6.2"
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
      </div>

      {/* Most Active Skill Maps */}
      <div className="bg-site-surface rounded-xl border border-site-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-site-ink">Skill maps — most active</h3>
          <button disabled className="px-3 py-1.5 text-sm border border-site-border rounded-lg text-site-muted opacity-50 cursor-not-allowed flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Create template
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-site-border">
                <th className="text-left px-4 py-3 font-semibold text-site-muted text-xs">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-site-muted text-xs">Owner</th>
                <th className="text-center px-4 py-3 font-semibold text-site-muted text-xs">Nodes</th>
                <th className="text-center px-4 py-3 font-semibold text-site-muted text-xs">Completion</th>
              </tr>
            </thead>
            <tbody>
              {displaySkillMaps.map((map, idx) => (
                <tr key={idx} className="border-b border-site-border/50 hover:bg-site-bg/50">
                  <td className="px-4 py-3 font-medium text-site-ink">{map.title || 'Untitled'}</td>
                  <td className="px-4 py-3 text-site-muted">{map.owner}</td>
                  <td className="px-4 py-3 text-center text-site-muted">{map.nodes}</td>
                  <td className="px-4 py-3 text-center text-site-muted">{map.completion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
