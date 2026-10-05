import { useEffect, useState } from 'react'

/** Renders an IndexedDB Blob via an object URL that is revoked on change/unmount. */
export function BlobImage({ blob, alt, className }: { blob: Blob | undefined; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!blob || !url) return <div className="photo-placeholder">🌱</div>
  return <img className={className} src={url} alt={alt} />
}
