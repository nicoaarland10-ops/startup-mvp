import { useState } from 'react'

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function CommentThread({ comments = [], onAddComment }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const trimmed = body.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      await onAddComment(trimmed)
      setBody('')
    } catch (err) {
      setError(err?.message || 'Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Comments</h2>

      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No comments yet</p>
      ) : (
        <ul className="divide-y divide-gray-50 mb-4">
          {comments.map((comment) => (
            <li key={comment.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {comment.author?.name || comment.author?.email || 'Unknown'}
                </p>
                <p className="text-xs text-gray-400 shrink-0">{formatDate(comment.createdAt)}</p>
              </div>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="comment-body" className="block text-xs font-medium text-gray-500">
          Add a comment
        </label>
        <textarea
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a comment…"
          maxLength={2000}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={submitting}
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {submitting ? 'Posting…' : 'Post comment'}
        </button>
      </form>
    </div>
  )
}
