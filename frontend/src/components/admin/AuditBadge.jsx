const actionColors = {
  ban_user: 'bg-red-50 text-red-700 border-red-200',
  unban_user: 'bg-green-50 text-green-700 border-green-200',
  promote_to_admin: 'bg-purple-50 text-purple-700 border-purple-200',
  demote_from_admin: 'bg-blue-50 text-blue-700 border-blue-200',
  adjust_xp: 'bg-amber-50 text-amber-700 border-amber-200',
  void_xp: 'bg-red-50 text-red-700 border-red-200',
  manual_weekly_reset: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  recalculate_xp: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delete_skill_map: 'bg-red-50 text-red-700 border-red-200',
  dismiss_flag: 'bg-gray-50 text-gray-700 border-gray-200',
  update_xp_settings: 'bg-blue-50 text-blue-700 border-blue-200',
  update_flag_settings: 'bg-blue-50 text-blue-700 border-blue-200',
  export_data: 'bg-green-50 text-green-700 border-green-200'
}

const actionLabels = {
  ban_user: 'Ban User',
  unban_user: 'Unban User',
  promote_to_admin: 'Promote Admin',
  demote_from_admin: 'Demote Admin',
  adjust_xp: 'Adjust XP',
  void_xp: 'Void XP',
  manual_weekly_reset: 'Manual Reset',
  recalculate_xp: 'Recalculate XP',
  delete_skill_map: 'Delete Skill Map',
  dismiss_flag: 'Dismiss Flag',
  update_xp_settings: 'Update XP Settings',
  update_flag_settings: 'Update Flag Settings',
  export_data: 'Export Data'
}

export default function AuditBadge({ action }) {
  const colors = actionColors[action] || 'bg-gray-50 text-gray-700 border-gray-200'
  const label = actionLabels[action] || action

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${colors}`}>
      {label}
    </span>
  )
}
