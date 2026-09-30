import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  identifyPlant,
  simulateEvent,
  type Identification,
  type Simulation,
} from './api'
import PlantViewer from './components/PlantViewer'
import { FX_KINDS, type FxKind } from './components/fx'
import './App.css'

const MAX_PREVIEW_LABEL = 48

const COLOR_META: Record<string, { label: string; dot: string }> = {
  nenhum: { label: 'Normal', dot: '#2e7d32' },
  amarelado: { label: 'Amarelado', dot: '#c9a227' },
  amarronzado: { label: 'Amarronzado', dot: '#8d5a2b' },
  verde_escuro: { label: 'Verde escuro', dot: '#1b5e20' },
  verde_claro: { label: 'Verde claro', dot: '#7bc47f' },
}

/** Cenários sem API para demonstrar, imediatamente, os modelos e os efeitos 3D. */
const DEMO_CASES = [
  { title: 'Manjericão no fundo do rio', common: 'Manjericão', scientific: 'Ocimum basilicum', archetype: 'folha_larga', event: 'Joguei o manjericão no fundo do rio: a planta fica submersa na correnteza.', explanation: 'Debaixo d’água, as folhas e raízes recebem pouco oxigênio e luz. A correnteza também pode danificar a planta; é uma demonstração educativa.', params: { wilt_level: 0.85, leaf_color_shift: 'amarelado', growth_rate_change: -0.9, stress_flag: true, timeline_days: 2 } },
  { title: 'Monstera com 700 L de água', common: 'Costela-de-adão', scientific: 'Monstera deliciosa', archetype: 'folha_larga', event: 'Joguei 700 litros de água de uma vez na planta, uma inundação enorme.', explanation: 'O volume extremo encharca o substrato e pode arrastar o vaso. A chuva intensa e a água subindo são representadas na cena.', params: { wilt_level: 0.95, leaf_color_shift: 'amarronzado', growth_rate_change: -1, stress_flag: true, timeline_days: 1 } },
  { title: 'Girassol bem cuidado', common: 'Girassol', scientific: 'Helianthus annuus', archetype: 'arbustiva', event: 'Cuidei certinho: água na medida, luz adequada e solo drenado.', explanation: 'Com água, luz e drenagem adequadas, a planta tende a manter folhas firmes e crescer. O brilho é uma metáfora visual de vitalidade, não uma resposta biológica literal.', params: { wilt_level: 0, leaf_color_shift: 'verde_claro', growth_rate_change: 0.8, stress_flag: false, timeline_days: 14 } },
  { title: 'Roseira em solo compactado', common: 'Roseira', scientific: 'Rosa chinensis', archetype: 'arbustiva', event: 'Plantei a roseira em terra muito compactada e sem drenagem.', explanation: 'Solo compactado reduz a circulação de ar e dificulta a drenagem. As raízes podem sofrer com falta de oxigênio e excesso de água.', params: { wilt_level: 0.65, leaf_color_shift: 'amarelado', growth_rate_change: -0.6, stress_flag: true, timeline_days: 10 } },
  { title: 'Samambaia no escuro', common: 'Samambaia', scientific: 'Nephrolepis exaltata', archetype: 'graminea', event: 'Deixei a samambaia sete dias dentro de um armário sem luz.', explanation: 'Sem luz, a fotossíntese cai e a planta consome suas reservas. O efeito depende da espécie e da duração.', params: { wilt_level: 0.5, leaf_color_shift: 'verde_escuro', growth_rate_change: -0.7, stress_flag: true, timeline_days: 7 } },
  { title: 'Manjericão no calor seco', common: 'Manjericão', scientific: 'Ocimum basilicum', archetype: 'folha_larga', event: 'Deixei o manjericão no sol forte e calor seco por horas.', explanation: 'Calor e alta evaporação podem levar à perda de água e queimaduras nas folhas, especialmente sem aclimatação.', params: { wilt_level: 0.72, leaf_color_shift: 'amarronzado', growth_rate_change: -0.65, stress_flag: true, timeline_days: 1 } },
  { title: 'Cacto em geada', common: 'Cacto', scientific: 'Echinopsis', archetype: 'suculenta', event: 'Deixei o cacto exposto a uma geada e temperaturas abaixo de zero.', explanation: 'O frio intenso pode lesar tecidos, mesmo em espécies resistentes à seca. A tolerância varia entre cactos.', params: { wilt_level: 0.3, leaf_color_shift: 'amarronzado', growth_rate_change: -0.8, stress_flag: true, timeline_days: 1 } },
  { title: 'Costela-de-adão com pragas', common: 'Costela-de-adão', scientific: 'Monstera deliciosa', archetype: 'folha_larga', event: 'Uma infestação de pulgões está atacando as folhas novas.', explanation: 'Insetos sugadores retiram seiva e podem deformar brotos. A inspeção precoce ajuda a conter a infestação.', params: { wilt_level: 0.35, leaf_color_shift: 'amarelado', growth_rate_change: -0.5, stress_flag: true, timeline_days: 5 } },
  { title: 'Girassol em vendaval', common: 'Girassol', scientific: 'Helianthus annuus', archetype: 'arbustiva', event: 'Um vendaval forte está balançando e tombando o girassol.', explanation: 'Vento forte pode quebrar caules, rasgar folhas e aumentar a perda de água. Estruturas de apoio podem reduzir danos.', params: { wilt_level: 0.45, leaf_color_shift: 'nenhum', growth_rate_change: -0.4, stress_flag: true, timeline_days: 1 } },
  { title: 'Rosa com excesso de adubo', common: 'Roseira', scientific: 'Rosa chinensis', archetype: 'arbustiva', event: 'Coloquei fertilizante demais no vaso da roseira.', explanation: 'O excesso de sais do fertilizante pode dificultar a absorção de água e queimar raízes e folhas. Adubo não substitui os cuidados básicos.', params: { wilt_level: 0.55, leaf_color_shift: 'amarronzado', growth_rate_change: -0.55, stress_flag: true, timeline_days: 3 } },
  { title: 'Girassol com luz adequada', common: 'Girassol', scientific: 'Helianthus annuus', archetype: 'arbustiva', event: 'Coloquei o girassol num local claro, com luz adequada e rega moderada.', explanation: 'Luz apropriada e água sem encharcamento favorecem a fotossíntese e o crescimento. O halo representa vitalidade de forma simbólica.', params: { wilt_level: 0, leaf_color_shift: 'verde_claro', growth_rate_change: 0.55, stress_flag: false, timeline_days: 10 } },
  { title: 'Samambaia sem água', common: 'Samambaia', scientific: 'Nephrolepis exaltata', archetype: 'graminea', event: 'Esqueci de regar a samambaia por vários dias; a terra ficou seca.', explanation: 'A falta de água reduz a pressão nas células e causa murcha. O tempo para recuperação depende do grau de desidratação.', params: { wilt_level: 0.8, leaf_color_shift: 'amarronzado', growth_rate_change: -0.7, stress_flag: true, timeline_days: 4 } },
  { title: 'Manjericão no micro-ondas', common: 'Manjericão', scientific: 'Ocimum basilicum', archetype: 'folha_larga', event: 'Coloquei o vaso com manjericão dentro do micro-ondas.', explanation: 'Micro-ondas não é ambiente para plantas: o aquecimento pode danificar tecidos e o vaso. Não faça esse experimento; a visualização é apenas educativa.', params: { wilt_level: 1, leaf_color_shift: 'amarronzado', growth_rate_change: -1, stress_flag: true, timeline_days: 0 } },
  { title: 'Orquídea abrindo flores', common: 'Orquídea', scientific: 'Phalaenopsis', archetype: 'folha_larga', event: 'A orquídea está abrindo flores novas depois de meses bem cuidada.', explanation: 'A floração marca uma fase do ciclo de vida que depende de espécie, luz, temperatura e maturidade. As pétalas animadas são uma representação visual.', params: { wilt_level: 0, leaf_color_shift: 'verde_claro', growth_rate_change: 0.35, stress_flag: false, timeline_days: 30 } },
  { title: 'Tomate sendo polinizado', common: 'Tomateiro', scientific: 'Solanum lycopersicum', archetype: 'arbustiva', event: 'Abelhas estão visitando e polinizando as flores do tomateiro.', explanation: 'A polinização transfere pólen e pode permitir a formação de frutos. Muitas variedades de tomate também conseguem autopolinizar-se.', params: { wilt_level: 0, leaf_color_shift: 'verde_claro', growth_rate_change: 0.4, stress_flag: false, timeline_days: 7 } },
  { title: 'Babosa em solo seco', common: 'Babosa', scientific: 'Aloe vera', archetype: 'suculenta', event: 'A babosa está num substrato seco e ficou vários dias sem rega.', explanation: 'A babosa armazena água e tolera períodos secos, mas isso não significa que nunca precise de água. O intervalo depende do substrato e do clima.', params: { wilt_level: 0.25, leaf_color_shift: 'verde_escuro', growth_rate_change: -0.25, stress_flag: true, timeline_days: 14 } },
  { title: 'Lavanda recebendo composto', common: 'Lavanda', scientific: 'Lavandula angustifolia', archetype: 'arbustiva', event: 'Misturei uma pequena quantidade de composto orgânico bem curtido ao solo da lavanda.', explanation: 'Composto bem maturado pode melhorar a estrutura do solo. A lavanda prefere boa drenagem; adições em excesso ou solo encharcado podem prejudicá-la.', params: { wilt_level: 0, leaf_color_shift: 'verde_claro', growth_rate_change: 0.3, stress_flag: false, timeline_days: 21 } },
  { title: 'Bambu sob chuva leve', common: 'Bambu', scientific: 'Bambusa vulgaris', archetype: 'graminea', event: 'Uma garoa leve caiu sobre o bambu e molhou o solo sem encharcar.', explanation: 'Uma chuva leve repõe um pouco da água do solo sem necessariamente causar alagamento. A necessidade real depende da espécie e da drenagem.', params: { wilt_level: 0, leaf_color_shift: 'nenhum', growth_rate_change: 0.1, stress_flag: false, timeline_days: 1 } },
  { title: 'Limoeiro transplantado', common: 'Limoeiro', scientific: 'Citrus limon', archetype: 'arvore_pequena', event: 'Transplantei o limoeiro com cuidado para um vaso maior e substrato drenado.', explanation: 'Um transplante cuidadoso oferece mais espaço às raízes, mas pode causar estresse temporário. Manter o torrão e evitar danos reduz o choque.', params: { wilt_level: 0.15, leaf_color_shift: 'nenhum', growth_rate_change: 0.25, stress_flag: false, timeline_days: 7 } },
  { title: 'Roseira sendo podada', common: 'Roseira', scientific: 'Rosa chinensis', archetype: 'arbustiva', event: 'Fiz uma poda leve, removendo ramos secos da roseira com tesoura limpa.', explanation: 'A poda de partes secas pode ajudar na manutenção, desde que respeite a espécie e a época adequada. A cena mostra a queda simbólica de folhas cortadas.', params: { wilt_level: 0.05, leaf_color_shift: 'nenhum', growth_rate_change: 0.15, stress_flag: false, timeline_days: 10 } },
  { title: 'Tomateiro atingido por granizo', common: 'Tomateiro', scientific: 'Solanum lycopersicum', archetype: 'arbustiva', event: 'Uma chuva de granizo atingiu as folhas e os frutos do tomateiro.', explanation: 'Pedras de granizo podem rasgar folhas, ferir caules e frutos. A intensidade do dano depende do tamanho das pedras e da duração da tempestade.', params: { wilt_level: 0.55, leaf_color_shift: 'amarronzado', growth_rate_change: -0.6, stress_flag: true, timeline_days: 1 } },
  { title: 'Costela-de-adão com água sanitária', common: 'Costela-de-adão', scientific: 'Monstera deliciosa', archetype: 'folha_larga', event: 'Derramei água sanitária nas folhas e no vaso da planta.', explanation: 'Água sanitária pode queimar tecidos vegetais e contaminar o solo. Não aplique produtos domésticos em plantas; mantenha-os longe de crianças e animais.', params: { wilt_level: 0.9, leaf_color_shift: 'amarronzado', growth_rate_change: -0.9, stress_flag: true, timeline_days: 1 } },
  { title: 'Manjericão com chuva leve', common: 'Manjericão', scientific: 'Ocimum basilicum', archetype: 'folha_larga', event: 'Uma chuvinha leve molhou as folhas do manjericão, sem deixar o vaso alagado.', explanation: 'Uma chuva leve não é o mesmo que uma inundação: o efeito depende de quanto o substrato retém água e se o vaso tem drenagem.', params: { wilt_level: 0, leaf_color_shift: 'nenhum', growth_rate_change: 0.12, stress_flag: false, timeline_days: 1 } },
]

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

  // Ferramenta de dev/teste: ?fx=fire|water|... força o efeito, ?archetype=
  // troca o modelo — sem backend, sem gastar quota. Ex.: ?fx=fire&archetype=suculenta
  const [devOverride] = useState(() => {
    const query = new URLSearchParams(window.location.search)
    const fxParam = query.get('fx')
    return {
      fx: fxParam && (FX_KINDS as string[]).includes(fxParam) ? (fxParam as FxKind) : null,
      archetype: query.get('archetype'),
    }
  })

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

  function previewDemo(demo: (typeof DEMO_CASES)[number]) {
    setIdentification({
      species_common_name: demo.common,
      species_scientific_name: demo.scientific,
      confidence: 1,
      archetype: demo.archetype,
    })
    setPlantName(demo.common)
    setEventDescription(demo.event)
    setSimulation({ explanation: demo.explanation, simulation_params: demo.params })
    setIdentifyError(null)
    setSimulateError(null)
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

            <details className="demo-scenarios">
              <summary>✨ Testar cenários prontos (sem chave de IA)</summary>
              <p>Pré-visualizações educativas: clique para trocar a espécie e ver a animação sem chamar serviços externos.</p>
              <div className="demo-scenario-list">
                {DEMO_CASES.map((demo) => (
                  <button type="button" key={demo.title} onClick={() => previewDemo(demo)}>
                    {demo.title}
                  </button>
                ))}
              </div>
            </details>

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
          <PlantViewer
            archetype={devOverride.archetype ?? identification?.archetype}
            species={identification?.species_scientific_name ?? identification?.species_common_name}
            simulation={simulation?.simulation_params ?? null}
            event={eventDescription}
            forceFx={devOverride.fx}
          />
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
