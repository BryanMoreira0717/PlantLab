# Protocolo E-01 — Casos extremos ("e se..." destrutivo ou absurdo)

Status: vigente. Aplica-se ao Passo 6 (prompt do LLM) e ao Passo 10 (animações 3D).

## Princípio

Todo "e se..." merece resposta à altura. O usuário nem sempre está brincando —
e mesmo quando está, a resposta certa educa sem moralismo e diverte sem desrespeitar.

## Diretrizes

1. Levar a sério: responder o cenário de forma literal — o que aconteceria de verdade
   com a planta naquela situação.
2. Sem recusa e sem sermão: não negar a resposta nem dar lição de moral; explicar as
   consequências físicas e biológicas de forma direta, educativa e com leveza.
3. Animação dedicada quando viável: mapear o evento para uma animação específica do
   modelo 3D (ex.: planta no rio → submersão/arrasto pela correnteza; planta ao sol
   extremo → ressecamento e queimadura acelerados), acompanhada da explicação.
4. Fallback honesto: se não houver animação específica para o caso, usar os parâmetros
   genéricos de estresse no nível máximo coerente + explicação que cubra o cenário.
5. Segurança e ambiente: se o evento envolver risco a pessoas, animais ou ao ambiente
   (ex.: descartar planta tóxica em rio), incluir um aviso breve além da explicação
   sobre a planta. Informar, nunca incentivar a prática destrutiva.

## Exemplos de referência

### Água e líquidos

| "E se..." | Animação | Explicação cobre |
|-----------|----------|------------------|
| Jogar a planta no rio | Submersão, arrasto, perda do substrato | Correnteza leva solo e nutrientes, raízes asfixiam sem oxigênio, tecidos apodrecem, planta se decompõe ou encalha |
| Jogar a planta no mar | Flutuação + murcha osmótica rápida | Sal puxa a água das células por osmose reversa; sódio e cloreto em excesso queimam as raízes |
| Jogar água fervendo | Vapor + cozimento dos tecidos | Calor desnatura proteínas e rompe membranas: morte celular quase imediata |
| Jogar na descarga / vaso sanitário | Redemoinho, submersão | Afogamento radicular + química do esgoto; incluir aviso sanitário (diretriz 5) |

### Temperatura extrema

| "E se..." | Animação | Explicação cobre |
|-----------|----------|------------------|
| Jogar a planta no sol (extremo) | Ressecamento, folhas queimando/murchando rápido | Escaldadura foliar, perda hídrica violenta, colapso dos tecidos, morte por dessecação |
| Meter no freezer / geada forte | Congelamento, cristais de gelo | Água interna forma cristais que rompem as paredes celulares; a necrose aparece ao descongelar |
| Botar fogo direto | Chamas, carbonização | Combustão destrói os tecidos na hora; a rebrota da raiz é exceção raríssima |

### Química doméstica

| "E se..." | Animação | Explicação cobre |
|-----------|----------|------------------|
| Regar com água sanitária / produto de limpeza | Espuma, queimadura química | Hipoclorito e surfactantes oxidam tecidos, matam a microbiota do solo e queimam as raízes |
| Regar com refrigerante / café / suco | Calda pegajosa, fermentação | Açúcar alimenta fungos e bactérias, acidez desregula o pH, fermenta e atrai pragas |
| Jogar óleo ou tinta nas folhas | Película sufocante sobre as folhas | Bloqueia os estômatos: sem fotossíntese e sem transpiração, a folha "asfixia" |
| Urina pura no vaso | Encharco com sais | Ureia e sais em excesso queimam as raízes (responder sem mito e sem nojo: diluída e ocasional até tem nitrogênio, pura mata) |

### Física e mecânica

| "E se..." | Animação | Explicação cobre |
|-----------|----------|------------------|
| Jogar da varanda / queda de altura | Impacto, quebra, substrato espalhado | Trauma mecânico rompe vasos, caule e raízes; a sobrevivência depende do ponto da quebra |
| Meter no micro-ondas | Aquecimento interno, vapor | A radiação agita a água interna até ferver: os tecidos cozinham de dentro para fora |
| Plantar de cabeça para baixo | Inversão + reorientação lenta | Gravitropismo: a planta gasta energia tentando reorientar caule para cima e raiz para baixo; atrasa e enfraquece |

### Ambiente

| "E se..." | Animação | Explicação cobre |
|-----------|----------|------------------|
| Meses no escuro total | Estiolamento, definhamento | Sem fotossíntese ela consome as próprias reservas: caule pálido e esticado, depois colapso e morte |
| Deixar dias com a raiz nua, sem solo | Ressecamento radicular | Raízes expostas perdem água em horas; os pelos absorventes morrem primeiro e a planta pode não voltar a beber mesmo replantada |

## Operacionalização

- Passo 6: o prompt do LLM deve instruir o modelo a tratar casos extremos sem recusa,
  com explicação literal do cenário e `simulation_params` coerentes (estresse alto).
- Passo 10: criar o mapa evento → animação especial, com fallback para estresse
  genérico quando o evento não tiver animação dedicada.
- Testes: incluir casos extremos cobrindo grupos distintos (água, temperatura,
  química, física, ambiente) em cada bateria de testes do Passo 6 e do Passo 10.
