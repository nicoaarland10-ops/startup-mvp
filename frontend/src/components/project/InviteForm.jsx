import { useState } from 'react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function InviteForm({ onInvite }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [validationError, setValidationError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setValidationError('Email is required')
      return
    }
    if (!EMAIL_RE.test(trimmed)) {
      setValidationError('Enter a valid email address')
      return
    }
    setValidationError(null)

    setSubmitting(true)
    try {
      await onInvite({ email: trimmed, role })
      setEmail('')
      setRole('MEMBER')
    } catch (err) {
      const message = err?.code === 'CONFLICT'
        ? 'This person is already invited or a member of this project.'
        : err?.message || 'Failed to send invite'
      setServerError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Invite a member</h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="flex-1 w-full">
          <label htmlFor="invite-email" className="block text-xs font-medium text-gray-500 mb-1">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submitting}
          />
        </div>

        <div className="w-full sm:w-40">
          <label htmlFor="invite-role" className="block text-xs font-medium text-gray-500 mb-1">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {submitting ? 'Sending…' : 'Send invite'}
        </button>
      </form>

      {validationError && (
        <p role="alert" className="text-sm text-red-600 mt-2">{validationError}</p>
      )}
      {serverError && (
        <p role="alert" className="text-sm text-red-600 mt-2">{serverError}</p>
      )}
    </div>
  )
}
