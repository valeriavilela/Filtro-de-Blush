# 🌸 Blush AR — Filtro de Maquiagem em Tempo Real

Filtro de realidade aumentada que aplica **blush realista** no rosto do usuário em tempo real, usando apenas tecnologias web (HTML, CSS, JavaScript) e o modelo **MediaPipe Face Landmarker** do Google para rastreamento facial de 468 pontos.

Funciona com webcam integrada, **Iriun Webcam**, DroidCam, OBS Virtual Camera ou qualquer câmera reconhecida pelo navegador.

---

## ✨ Descrição

O app detecta o rosto pela webcam e desenha um blush com gradiente radial, transparência e desfoque sobre as bochechas, acompanhando rotação, inclinação e distância da cabeça em tempo real (30–60 FPS). A interface tem paleta de 8 cores, controles de intensidade/tamanho/desfoque, 5 formatos de blush, alternância de simetria, visualização dos landmarks, captura de foto, tela cheia, espelhamento e modo escuro.

---

## 📦 Estrutura do projeto

```
projeto-blush/
├── index.html      # estrutura da interface
├── style.css        # visual (tema claro + modo escuro)
├── script.js         # câmera, detecção facial e renderização do blush
├── assets/
│   ├── blush/        # (reservado para texturas/PNGs extras, se desejar)
│   └── icons/         # (reservado para ícones customizados, se desejar)
└── README.md
```

> O projeto não usa nenhum arquivo de imagem local por padrão — o blush é 100% desenhado via Canvas API (gradientes), então funciona sem precisar adicionar nada nas pastas `assets/`. Elas ficam disponíveis caso você queira trocar os emojis da paleta por ícones próprios.

---

## 🧰 Requisitos

- Um navegador moderno com suporte a **WebGL, WebAssembly e getUserMedia**: Google Chrome ou Microsoft Edge (recomendados), versões recentes.
- Uma webcam (física ou virtual).
- Conexão com a internet **na primeira execução**, pois o modelo do MediaPipe (`face_landmarker.task`, ~ alguns MB) e as bibliotecas são carregados via CDN. Depois de carregado uma vez, o navegador costuma manter em cache.
- Para usar câmeras virtuais (Iriun, DroidCam, OBS), o software correspondente precisa estar instalado e rodando **antes** de abrir a página.

---

## ▶️ Instalação e como executar

Este projeto **não precisa de build nem de `npm install`** — é HTML/CSS/JS puro. Porém, por causa de duas restrições de segurança do navegador (módulos ES e acesso à câmera), **não abra o `index.html` diretamente com duplo clique** (`file://...`). Sirva a pasta por um servidor local simples:

### Opção 1 — Python (já vem em muitos sistemas)
```bash
cd projeto-blush
python -m http.server 8000
```
Depois abra: `http://localhost:8000`

### Opção 2 — Node.js
```bash
cd projeto-blush
npx serve .
```
Depois abra o endereço mostrado no terminal (geralmente `http://localhost:3000`).

### Opção 3 — Extensão do editor
Se você usa VS Code, a extensão **Live Server** também funciona perfeitamente (botão "Go Live").

> `localhost` é tratado pelo navegador como "origem segura", então a câmera funciona normalmente mesmo sem HTTPS.

---

## 🖥️ Como funciona

1. Ao abrir a página, você verá uma tela pedindo permissão de câmera.
2. Ao clicar em **"Permitir acesso à câmera"**, o navegador pede a permissão nativa — aceite.
3. O app lista todas as câmeras disponíveis no seletor do topo.
4. Se uma câmera com "Iriun" no nome for encontrada, ela é **selecionada automaticamente**; caso contrário, é usada a primeira câmera da lista (geralmente a webcam integrada).
5. O modelo de detecção facial é carregado (spinner "Carregando modelo…").
6. Assim que o rosto é detectado, o blush aparece sobre as bochechas e acompanha os movimentos da cabeça em tempo real.
7. Use o painel lateral para ajustar cor, intensidade, tamanho, desfoque, formato e simetria.
8. Use a barra de ferramentas sobre o preview para espelhar a câmera, entrar em tela cheia ou visualizar os pontos do rosto (landmarks).
9. Clique em **"📸 Tirar Foto"** para salvar uma imagem PNG com o blush aplicado.

---

## 🔄 Como trocar de webcam

Use o seletor **"📷 Câmera"** no topo da página — ele lista todos os dispositivos de vídeo autorizados pelo navegador. Ao escolher outra opção, o stream atual é encerrado e o novo é iniciado automaticamente, sem precisar recarregar a página.

---

## 📱 Como usar a Iriun Webcam

1. Instale o **Iriun Webcam** no computador (app desktop) e no celular (app Android/iOS).
2. Conecte o celular e o computador na mesma rede Wi-Fi (ou use USB, conforme o app permitir).
3. Abra o Iriun Webcam no celular e no computador — eles devem se conectar automaticamente.
4. Abra o **Blush AR** (via `localhost`, conforme instruções acima).
5. Ao permitir o acesso à câmera, o app detecta a "Iriun Webcam" na lista de dispositivos e a seleciona automaticamente. Se isso não acontecer, selecione-a manualmente no seletor de câmera.

O mesmo processo vale para **DroidCam** e **OBS Virtual Camera** — o app tenta detectá-las automaticamente pelo nome do dispositivo, e elas também aparecem no seletor manual.

---

## 🛠️ Solução de problemas

**A câmera não aparece / erro de permissão**
- Verifique se o navegador tem permissão de câmera para o site (ícone de cadeado/câmera na barra de endereço).
- Confirme que nenhum outro aplicativo está usando a câmera exclusivamente.
- No Windows, verifique em Configurações → Privacidade → Câmera se o navegador tem acesso liberado.

**A página trava em "Carregando modelo de detecção facial…"**
- Verifique sua conexão com a internet (o modelo é baixado via CDN na primeira vez).
- Confira o console do navegador (F12) para mensagens de erro de rede/CORS.
- Tente recarregar a página; o navegador tende a cachear o modelo após o primeiro carregamento.

**A tela fica preta ao abrir `index.html` direto do arquivo**
- Isso é esperado: abra o projeto por um servidor local (veja a seção *Como executar*), pois `file://` bloqueia módulos ES e, em alguns navegadores, a própria câmera.

**A Iriun Webcam não é detectada automaticamente**
- Confirme que o app Iriun está aberto e conectado antes de abrir o navegador.
- Selecione manualmente "Iriun Webcam" no seletor de câmera no topo da página.

**O blush não acompanha bem o rosto ou "treme"**
- Melhore a iluminação do ambiente — o rastreamento facial depende de boa visibilidade do rosto.
- Evite ficar muito longe da câmera ou com o rosto parcialmente fora do quadro.

**FPS baixo**
- Feche outras abas/aplicativos pesados.
- Se disponível, use um navegador com aceleração de hardware (GPU) ativada (chrome://gpu para conferir no Chrome).

---

## 🧩 Tecnologias utilizadas

- **HTML5** — estrutura semântica da interface.
- **CSS3** — layout responsivo, tema claro/escuro, animações e efeitos visuais.
- **JavaScript ES6+** (módulos, `async`/`await`, classes) — toda a lógica da aplicação.
- **[MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)** (`@mediapipe/tasks-vision`) — detecção facial de 468 pontos em tempo real, rodando no navegador via WebAssembly/WebGL.
- **Canvas API** — desenho do blush com gradientes radiais, transparência, blur e modos de mesclagem (`multiply`/`screen`) para um resultado realista, além da composição da foto final.
- **MediaDevices API** (`getUserMedia`, `enumerateDevices`) — acesso e seleção de câmeras físicas e virtuais (Iriun, DroidCam, OBS).

Nenhum framework (React/Vue/Angular) foi utilizado — o projeto é 100% JavaScript puro (*vanilla*).

---

## 🎨 Paleta de cores disponível

| Emoji | Nome |
|---|---|
| 🌸 | Rosa Claro |
| 🌷 | Rosa Bebê |
| 🌺 | Rosa Pink |
| 🍑 | Pêssego |
| 🧡 | Coral |
| 🌹 | Rosado Queimado |
| 🩷 | Rosé |
| 🤎 | Terracota |

---

## 📄 Licença

Projeto de exemplo livre para uso, estudo e adaptação.
