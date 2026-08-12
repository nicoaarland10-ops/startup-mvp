import { useState } from 'react'

const roleBadge = {
  OWNER: 'bg-indigo-100 text-indigo-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-600',
}

const statusBadge = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
}

function MemberRow({ member, onRoleChange, onRemove }) {
  const [removing, setRemoving] = useState(false)
  const [busy, setBusy] = useState(false)
  const isOwner = member.role === 'OWNER'
  const displayName = member.name || member.email

  const handleRoleChange = async (e) => {
    setBusy(true)
    try {
      await onRoleChange(member.id, e.target.value)
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmRemove = async () => {
    setBusy(true)
    try {
      await onRemove(member.id)
    } finally {
      setBusy(false)
      setRemoving(false)
    }
  }

  return (
    <li className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
        {member.name && <p className="text-xs text-gray-400 truncate">{member.email}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge[member.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {member.status === 'PENDING' ? 'Pending' : 'Active'}
        </span>

        {isOwner ? (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleBadge.OWNER}`}>Owner</span>
        ) : (
          <>
            <select
              aria-label={`Change role for ${displayName}`}
              value={member.role}
              onChange={handleRoleChange}
              disabled={busy}
              className={`text-xs font-medium rounded-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${roleBadge[member.role] ?? roleBadge.MEMBER}`}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>

            {removing ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={busy}
                  className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg px-2 py-1"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setRemoving(false)}
                  disabled={busy}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={`Remove ${displayName}`}
                onClick={() => setRemoving(true)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </li>
  )
}

export default function MemberManager({ members = [], onRoleChange, onRemove }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-800">Members</h2>
        <span className="text-xs text-gray-400">{members.length} total</span>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No members yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} onRoleChange={onRoleChange} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </div>
  )
}
