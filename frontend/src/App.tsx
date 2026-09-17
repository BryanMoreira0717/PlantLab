import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  identifyPlant,
  simulateEvent,
  type Identification,
  type Simulation,
} from './api'
import PlantViewer from './components/PlantViewer'
import './App.css'

const MAX_PREVIEW_LABEL = 48

const COLOR_META: Record<string, { label: string; dot: string }> = {
  nenhum: { label: 'Normal', dot: '#2e7d32' },
  amarelado: { label: 'Amarelado', dot: '#c9a227' },
  amarronzado: { label: 'Amarronzado', dot: '#8d5a2b' },
  verde_escuro: { label: 'Verde escuro', dot: '#1b5e20' },
  verde_claro: { label: 'Verde claro', dot: '#7bc47f' },
}

function fileLabel(file: File): string {
  const name =
    file.name.length > MAX_PREVIEW_LABEL
      ? `${file.name.slice(0, MAX_PREVIEW_LABEL - 1)}…`
      : file.name
  const kb = file.size / 1024
  const size = kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`
  return `${name} · ${size}`
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Algo deu errado. Tente de novo.'
}

function App() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [plantName, setPlantName] = useState('')

  const [identification, setIdentification] = useState<Identification | null>(null)
  const [identifying, setIdentifying] = useState(false)
  const [identifyError, setIdentifyError] = useState<string | null>(null)

  const [eventDescription, setEventDescription] = useState('')
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simulateError, setSimulateError] = useState<string | null>(null)
  const [slowSim, setSlowSim] = useState(false)

  // Passo 7: a IA real demora — depois de 8s o loading muda o discurso.
  useEffect(() => {
    if (!simulating) return
    const timer = setTimeout(() => setSlowSim(true), 8000)
    return () => clearTimeout(timer)
  }, [simulating])

  function replaceImage(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFileError('Esse arquivo não é uma imagem. Escolha um JPG, PNG ou WEBP.')
      return
    }
    setFileError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    replaceImage(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setIsDragging(false)
    replaceImage(e.dataTransfer.files?.[0])
  }

  function removeImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(null)
    setPreviewUrl(null)
    setFileError(null)
  }

  async function handleIdentify() {
    setIdentifyError(null)
    if (!imageFile && !plantName.trim()) {
      setIdentifyError('Envie uma foto ou digite o nome da planta antes de identificar.')
      return
    }
    setIdentifying(true)
    try {
      const result = await identifyPlant(imageFile, plantName)
      setIdentification(result)
      setSimulation(null) // espécie nova → simulação anterior perde a validade
    } catch (err) {
      setIdentification(null)
      setIdentifyError(errorText(err))
    } finally {
      setIdentifying(false)
    }
  }

  async function handleSimulate() {
    setSimulateError(null)
    if (!identification) {
      setSimulateError('Identifique a planta primeiro, na Etapa 1.')
      return
    }
    if (!eventDescription.trim()) {
      setSimulateError('Descreva o evento na caixa de texto antes de simular.')
      return
    }
    setSimulating(true)
    setSlowSim(false)
    try {
      const result = await simulateEvent(
        identification.species_scientific_name,
        eventDescription.trim(),
      )
      setSimulation(result)
    } catch (err) {
      setSimulation(null)
      setSimulateError(errorText(err))
    } finally {
      setSimulating(false)
    }
  }

  const params = simulation?.simulation_params
  const colorMeta = params ? (COLOR_META[params.leaf_color_shift] ?? { label: params.leaf_color_shift, dot: '#999' }) : null
  const growthPct = params ? Math.round(params.growth_rate_change * 100) : 0

  return (
    <div className="plantlab">
      <header className="plantlab-header">
        <div className="brand">
          <span className="brand-leaf" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
              <path
                d="M12 21c-5 0-8-3.5-8-8 0-5 4-9 10-10 1.5-.2 3-.3 3-.3s-.1 1.5-.3 3c-1 6-5 10-10 10"
                fill="currentColor"
                opacity=".9"
              />
              <path
                d="M12 21c0-6 2-11 8-14-1 6-3 11-8 14Z"
                fill="currentColor"
                opacity=".55"
              />
              <path
                d="M9 17.5h6"
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h1>PlantLab 3D</h1>
            <p>Descubra o que acontece com sua planta antes de fazer — simule qualquer fenômeno em texto e veja em 3D.</p>
          </div>
        </div>
        <ol className="steps" aria-label="Etapas">
          <li className={identification ? 'done' : 'active'}><span>1</span> Identifique</li>
          <li className={simulation ? 'done' : identification ? 'active' : ''}><span>2</span> Simule</li>
          <li className={simulation ? 'done' : ''}><span>3</span> Veja o resultado</li>
        </ol>
      </header>

      <main className="plantlab-main">
        <div className="cards">
          <section className="card" aria-labelledby="identify-title">
            <p className="card-kicker">Etapa 1</p>
            <h2 id="identify-title">Identificação da planta</h2>
            <p className="card-hint">Envie uma foto ou digite o nome — um dos dois já basta.</p>

            <label
              className={`dropzone${isDragging ? ' dragging' : ''}${previewUrl ? ' has-preview' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                aria-label="Enviar foto da planta"
              />
              {previewUrl ? (
                <span className="preview-wrap">
                  <img src={previewUrl} alt="Prévia da planta selecionada" className="preview" />
                </span>
              ) : (
                <span className="dropzone-idle">
                  <span className="dropzone-icon" aria-hidden="true">📷</span>
                  <span className="dropzone-text">
                    <strong>Clique para enviar uma foto</strong>
                    <small>ou arraste a imagem até aqui · JPG, PNG, WEBP</small>
                  </span>
                </span>
              )}
            </label>

            {fileError && (
              <p className="field-error" role="alert">
                {fileError}
              </p>
            )}

            {imageFile && previewUrl && (
              <div className="file-row">
                <span className="file-name">{fileLabel(imageFile)}</span>
                <button type="button" className="link-btn" onClick={removeImage}>
                  Remover foto
                </button>
              </div>
            )}

            <div className="field">
              <label htmlFor="plant-name">Nome da planta <span className="optional">(opcional se enviar foto)</span></label>
              <input
                id="plant-name"
                type="text"
                placeholder="Ex.: manjericão, cacto, samambaia…"
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                maxLength={120}
                autoComplete="off"
              />
            </div>

            <button
              type="button"
              className="identify-btn"
              onClick={handleIdentify}
              disabled={identifying}
            >
              {identifying ? (
                <><span className="btn-spinner" aria-hidden="true" /> Identificando…</>
              ) : (
                <><span aria-hidden="true">🔍</span> Identificar planta</>
              )}
            </button>

            {identifyError && (
              <p className="error-box" role="alert">
                {identifyError}
              </p>
            )}

            {identification && !identifyError && (
              <div className="id-result">
                <p className="id-common">{identification.species_common_name}</p>
                <p className="id-scientific"><em>{identification.species_scientific_name}</em></p>
                <div className="id-meta">
                  <span className="conf" title="Confiança da identificação">
                    <span className="conf-bar"><span style={{ width: `${Math.round(identification.confidence * 100)}%` }} /></span>
                    {Math.round(identification.confidence * 100)}%
                  </span>
                  <span className="chip">{identification.archetype}</span>
                </div>
                {identification.confidence < 0.5 && (
                  <p className="warn-box" role="alert">
                    Confiança baixa ({Math.round(identification.confidence * 100)}%) — a foto pode
                    estar ruim. Tente outra foto mais nítida ou confira o nome digitado e
                    identifique de novo.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="simulate-title">
            <p className="card-kicker">Etapa 2</p>
            <h2 id="simulate-title">Simule um evento</h2>
            <p className="card-hint">Descreva com suas palavras o “e se…” que você quer testar.</p>

            <div className="field">
              <label htmlFor="event-description">O que você quer fazer com a planta?</label>
              <textarea
                id="event-description"
                placeholder={'Ex.: e se eu jogar 12 litros de água de uma vez?\nEx.: e se eu deixar 7 dias sem luz?'}
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={7}
                maxLength={600}
              />
              <span className="char-count" aria-live="polite">{eventDescription.length}/600</span>
            </div>

            <button
              type="button"
              className="simulate-btn"
              onClick={handleSimulate}
              disabled={simulating}
            >
              {simulating ? (
                <><span className="btn-spinner" aria-hidden="true" /> Simulando…</>
              ) : (
                <><span aria-hidden="true">🧪</span> Simular</>
              )}
            </button>

            {simulateError && (
              <p className="error-box" role="alert">
                {simulateError}
              </p>
            )}
          </section>
        </div>

        <section className="result" aria-labelledby="result-title" aria-live="polite">
          <p className="card-kicker">Etapa 3</p>
          <h2 id="result-title">Resultado</h2>
          <PlantViewer archetype={identification?.archetype} />
          {simulating ? (
            <div className="result-loading">
              <span className="btn-spinner big" aria-hidden="true" />
              <div>
                <p>{slowSim ? 'A IA está elaborando a resposta, quase lá…' : 'Consultando a base biológica…'}</p>
                <small className="loading-sub">A primeira resposta pode levar até ~1 minuto.</small>
              </div>
            </div>
          ) : simulation && params && colorMeta ? (
            <div className="result-full">
              {identification && (
                <p className="result-plant">
                  {identification.species_common_name} <em>({identification.species_scientific_name})</em>
                </p>
              )}
              <p className="explanation">{simulation.explanation}</p>
              <div className="params-grid">
                <div className="param-card">
                  <span className="param-label">Murchamento</span>
                  <strong className="param-value">{Math.round(params.wilt_level * 100)}%</strong>
                  <span className="mini-bar"><span style={{ width: `${params.wilt_level * 100}%` }} /></span>
                </div>
                <div className="param-card">
                  <span className="param-label">Cor das folhas</span>
                  <strong className="param-value with-dot">
                    <span className="color-dot" style={{ background: colorMeta.dot }} aria-hidden="true" />
                    {colorMeta.label}
                  </strong>
                </div>
                <div className="param-card">
                  <span className="param-label">Crescimento</span>
                  <strong className={`param-value${growthPct < 0 ? ' negative' : growthPct > 0 ? ' positive' : ''}`}>
                    {growthPct > 0 ? `+${growthPct}%` : `${growthPct}%`}
                  </strong>
                  <small className="param-sub">
                    {growthPct < 0 ? 'prejudicado' : growthPct > 0 ? 'favorecido' : 'neutro'}
                  </small>
                </div>
                <div className="param-card">
                  <span className="param-label">Estresse</span>
                  <strong className={`param-value${params.stress_flag ? ' negative' : ' positive'}`}>
                    {params.stress_flag ? '⚠ Sim' : 'Não'}
                  </strong>
                </div>
                <div className="param-card">
                  <span className="param-label">Efeito em</span>
                  <strong className="param-value">
                    {params.timeline_days} {params.timeline_days === 1 ? 'dia' : 'dias'}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <p className="result-hint">
              Identifique a planta, descreva o evento e clique em Simular — a explicação aparece aqui.
            </p>
          )}
        </section>
      </main>

      <footer className="plantlab-footer">
        <p>PlantLab 3D é uma ferramenta educativa. As simulações são aproximações e não substituem experimentos reais.</p>
      </footer>
    </div>
  )
}

export default App
