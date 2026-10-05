import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { plantsRepo } from '../db/plantsRepo'
import { coverPhoto, FAMILIARITY_LABELS, type Familiarity, type Plant } from '../db/types'
import { TopBar } from '../components/TopBar'
import { BlobImage } from '../components/BlobImage'
import { FamiliarityBadge } from '../components/Badges'

/**
 * Two tries per question: first with the cover photo only, then (if wrong) with every photo.
 * 1st-try correct → 熟悉, 2nd-try correct → 普通, both wrong → 不熟悉.
 */

type Scope = 'all' | 'weak' | 'untested' | 'confirmed'

const SCOPES: { key: Scope; label: string; test: (p: Plant) => boolean }[] = [
  { key: 'all', label: '全部', test: () => true },
  { key: 'weak', label: '不熟悉＋普通', test: (p) => p.familiarity === 'unfamiliar' || p.familiarity === 'okay' },
  { key: 'untested', label: '未測驗', test: (p) => p.familiarity === 'untested' },
  { key: 'confirmed', label: '已確認', test: (p) => p.idStatus === 'confirmed' },
]

const COUNTS = [10, 20, 0] // 0 = all
const CHOICES = 4

interface Question {
  plant: Plant
  options: string[]
  stage: 1 | 2
  wrongPicks: string[]
  outcome: Familiarity | null
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const isQuizzable = (p: Plant) => !!p.name.trim() && p.photos.length > 0

export function QuizPage() {
  const plants = useLiveQuery(() => db.plants.toArray(), [])
  const [scope, setScope] = useState<Scope>('all')
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)

  // A first-try correct answer moves straight on to the next question.
  const currentOutcome = questions?.[index]?.outcome
  useEffect(() => {
    if (currentOutcome !== 'familiar') return
    const t = setTimeout(() => setIndex((i) => i + 1), 900)
    return () => clearTimeout(t)
  }, [currentOutcome, index])

  const namePool = useMemo(() => [...new Set((plants ?? []).map((p) => p.name.trim()).filter(Boolean))], [plants])
  const eligible = useMemo(() => {
    const test = SCOPES.find((s) => s.key === scope)!.test
    return (plants ?? []).filter((p) => isQuizzable(p) && test(p))
  }, [plants, scope])

  function start() {
    const picked = shuffle(eligible).slice(0, count || undefined)
    setQuestions(
      picked.map((plant) => {
        const answer = plant.name.trim()
        const distractors = shuffle(namePool.filter((n) => n !== answer)).slice(0, CHOICES - 1)
        return { plant, options: shuffle([answer, ...distractors]), stage: 1, wrongPicks: [], outcome: null }
      }),
    )
    setIndex(0)
  }

  async function pick(option: string) {
    if (!questions) return
    const q = questions[index]
    if (q.outcome) return
    const correct = option === q.plant.name.trim()
    let next: Question
    if (correct) next = { ...q, outcome: q.stage === 1 ? 'familiar' : 'okay' }
    else if (q.stage === 1) next = { ...q, stage: 2, wrongPicks: [option] }
    else next = { ...q, wrongPicks: [...q.wrongPicks, option], outcome: 'unfamiliar' }

    setQuestions(questions.map((x, i) => (i === index ? next : x)))
    if (next.outcome) await plantsRepo.setFamiliarity(q.plant.id, next.outcome)
  }

  // ---------- Setup ----------
  if (!questions) {
    const notEnoughNames = namePool.length < CHOICES
    return (
      <>
        <TopBar title="看圖猜植物" />
        <main className="page-content">
          <section className="form-card">
            <h2 className="form-card-title">玩法</h2>
            <p className="detail-value" style={{ fontSize: 14, margin: 0 }}>
              先看<b>封面照片</b>四選一；答錯會再給你看<b>所有照片</b>，再選一次。
              <br />
              第一次就答對 → 熟悉　第二次答對 → 普通　兩次都錯 → 不熟悉
            </p>
          </section>

          <section className="form-card">
            <div className="form-field">
              <span className="field-label">出題範圍</span>
              <div className="chip-wrap">
                {SCOPES.map((s) => (
                  <button key={s.key} className={`chip${scope === s.key ? ' active' : ''}`} onClick={() => setScope(s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <span className="field-label">題數</span>
              <div className="segmented">
                {COUNTS.map((c) => (
                  <button key={c} className={count === c ? 'active' : ''} onClick={() => setCount(c)}>
                    {c ? `${c} 題` : '全部'}
                  </button>
                ))}
              </div>
            </div>
            <p className="hint">
              符合範圍且有照片、有名稱的植物：{eligible.length} 種
              {count > 0 && eligible.length > 0 && eligible.length < count && `（本次出 ${eligible.length} 題）`}
            </p>
          </section>

          {notEnoughNames ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="emoji">🌱</div>
              四選一至少需要 4 種有名稱的植物，目前只有 {namePool.length} 種，先多建立幾筆吧！
            </div>
          ) : (
            <button className="btn btn-primary" disabled={eligible.length === 0} onClick={start}>
              {eligible.length === 0 ? '這個範圍沒有可出題的植物' : '開始測驗'}
            </button>
          )}
        </main>
      </>
    )
  }

  // ---------- Results ----------
  if (index >= questions.length) {
    const tally = (f: Familiarity) => questions.filter((q) => q.outcome === f).length
    return (
      <>
        <TopBar title="測驗結果" />
        <main className="page-content">
          <div className="quiz-score">
            <div className="score-num">
              {tally('familiar') + tally('okay')} / {questions.length}
            </div>
            <div className="hint">
              熟悉 {tally('familiar')}　普通 {tally('okay')}　不熟悉 {tally('unfamiliar')}
            </div>
          </div>
          <section className="form-card">
            <div className="result-list">
              {questions.map((q) => (
                <Link key={q.plant.id} to={`/plant/${q.plant.id}`} className="result-item">
                  <span>{q.plant.name}</span>
                  {q.outcome && <FamiliarityBadge familiarity={q.outcome} />}
                </Link>
              ))}
            </div>
          </section>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => setQuestions(null)}>
              回設定
            </button>
            <button className="btn btn-primary" onClick={start}>
              再來一輪
            </button>
          </div>
        </main>
      </>
    )
  }

  // ---------- Question ----------
  const q = questions[index]
  const answer = q.plant.name.trim()
  const cover = coverPhoto(q.plant)
  const showAll = q.stage === 2 || q.outcome !== null
  const photos = showAll && cover ? [cover, ...q.plant.photos.filter((p) => p.id !== cover.id)] : cover ? [cover] : []

  return (
    <>
      <TopBar
        title="看圖猜植物"
        action={
          <button className="link-btn" onClick={() => setQuestions(null)}>
            結束
          </button>
        }
      />
      <main className="page-content">
        <div className="quiz-progress">
          <div style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <div className="quiz-meta">
          <span>
            第 {index + 1} / {questions.length} 題
          </span>
          <span>{q.stage === 1 ? '第一次機會' : '第二次機會'}</span>
        </div>

        {photos.length > 1 ? (
          <div className="carousel quiz-carousel" style={{ marginBottom: 8 }}>
            {photos.map((p) => (
              <div className="carousel-item" key={p.id}>
                <BlobImage blob={p.blob} alt="植物照片" />
                {p.label && <span className="photo-label">{p.label}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="quiz-photo">
            <BlobImage blob={photos[0]?.blob} alt="植物照片" />
          </div>
        )}

        {!q.outcome && (
          <div className={`quiz-hint${q.stage === 2 ? ' retry' : ''}`}>
            {q.stage === 1
              ? '這是什麼植物？'
              : photos.length > 1
                ? '答錯了！左右滑動看所有照片，再猜一次'
                : '答錯了！再仔細看看，再猜一次'}
          </div>
        )}

        <div className="quiz-options" style={{ marginTop: q.outcome ? 12 : 0 }}>
          {q.options.map((option) => {
            const isWrong = q.wrongPicks.includes(option)
            const reveal = q.outcome !== null && option === answer
            return (
              <button
                key={option}
                className={`quiz-option${isWrong ? ' wrong' : ''}${reveal ? ' correct' : ''}`}
                disabled={isWrong || q.outcome !== null}
                onClick={() => pick(option)}
              >
                {option}
              </button>
            )
          })}
        </div>

        {q.outcome && (
          <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} className={`quiz-feedback ${q.outcome === 'familiar' ? 'good' : q.outcome === 'okay' ? 'okay' : 'bad'}`}>
            <div className="big">
              {q.outcome === 'familiar' ? '🎉 答對了！' : q.outcome === 'okay' ? '👍 第二次答對' : `答案是「${answer}」`}
            </div>
            <div>熟悉度 → {FAMILIARITY_LABELS[q.outcome]}</div>
            {q.outcome !== 'familiar' && q.plant.keyFeatures.some((k) => k.trim()) && (
              <ol className="key-features" style={{ textAlign: 'left', marginTop: 10, color: 'var(--color-text)' }}>
                {q.plant.keyFeatures
                  .filter((k) => k.trim())
                  .map((k, i) => (
                    <li key={i}>
                      <span className="num">{i + 1}</span>
                      <span>{k}</span>
                    </li>
                  ))}
              </ol>
            )}
            {q.outcome !== 'familiar' && (
              <button className="btn btn-primary" onClick={() => setIndex(index + 1)}>
                {index + 1 < questions.length ? '下一題' : '看結果'}
              </button>
            )}
          </div>
        )}
      </main>
    </>
  )
}
