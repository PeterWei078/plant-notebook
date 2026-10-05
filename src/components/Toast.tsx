import { useEffect } from 'react'

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [message]) // eslint-disable-line react-hooks/exhaustive-deps -- restart only when the message changes
  return <div className="toast">{message}</div>
}
