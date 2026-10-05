import { useState } from 'react'
import { optionsRepo } from '../db/optionsRepo'
import type { OptionItem, OptionListKey } from '../db/types'

type OptionChipsProps = {
  listKey: OptionListKey
  options: OptionItem[]
  allowAdd?: boolean
} & (
  | { multiple: true; value: string[]; onChange: (ids: string[]) => void }
  | { multiple?: false; value: string | null; onChange: (id: string | null) => void }
)

/** Chip selector over a user-editable option list, with inline "+ 新增". */
export function OptionChips(props: OptionChipsProps) {
  const { listKey, options, allowAdd = true } = props
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const isSelected = (id: string) => (props.multiple ? props.value.includes(id) : props.value === id)

  function toggle(id: string) {
    if (props.multiple) {
      props.onChange(props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id])
    } else {
      props.onChange(props.value === id ? null : id)
    }
  }

  async function commitAdd() {
    const name = draft.trim()
    setAdding(false)
    setDraft('')
    if (!name) return
    const option = await optionsRepo.findOrCreate(listKey, name)
    if (!isSelected(option.id)) toggle(option.id)
  }

  return (
    <div className="chip-wrap">
      {options.map((o) => (
        <button type="button" key={o.id} className={`chip${isSelected(o.id) ? ' active' : ''}`} onClick={() => toggle(o.id)}>
          {o.name}
        </button>
      ))}
      {!allowAdd ? null : adding ? (
        <input
          className="chip-input"
          autoFocus
          value={draft}
          placeholder="新選項"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitAdd()
            }
          }}
        />
      ) : (
        <button type="button" className="chip add" onClick={() => setAdding(true)}>
          ＋ 新增
        </button>
      )}
    </div>
  )
}
