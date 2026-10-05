interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = '確定',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
