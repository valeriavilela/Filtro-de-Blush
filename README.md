# 🌸 Blush AR — Filtro de Maquiagem em Tempo Real

Filtro de realidade aumentada que aplica **blush realista** no rosto do usuário em tempo real, utilizando apenas tecnologias web (HTML, CSS e JavaScript) e o modelo **MediaPipe Face Landmarker** do Google para rastreamento facial de 468 pontos.

🚀 **Demonstração online:** https://blushfiltro.web.app

> O projeto está hospedado no **Firebase Hosting**, permitindo acesso por meio de um domínio público, sem necessidade de instalação ou configuração por parte do usuário.

Funciona com webcam integrada, **Iriun Webcam**, DroidCam, OBS Virtual Camera ou qualquer câmera reconhecida pelo navegador.

---

# ✨ Descrição

O **Blush AR** é uma aplicação web de realidade aumentada que detecta o rosto do usuário pela webcam e aplica um efeito de blush de forma natural sobre as bochechas, acompanhando os movimentos da cabeça em tempo real.

O blush é desenhado utilizando gradientes, transparência, desfoque e modos de mesclagem da Canvas API, proporcionando um efeito semelhante ao de uma maquiagem real.

A interface oferece:

- 🎨 8 cores de blush;
- 💖 Controle de intensidade;
- 📏 Ajuste de tamanho;
- 🌫️ Controle de desfoque;
- 😊 5 formatos diferentes de blush;
- ⚖️ Modo simétrico ou individual;
- 📍 Visualização dos pontos faciais (landmarks);
- 📸 Captura de foto;
- 🪞 Espelhamento da câmera;
- 🌙 Modo escuro;
- 📺 Tela cheia.

---

# 🌐 Acesso Online

A aplicação encontra-se publicada no **Firebase Hosting**, permitindo acesso direto pelo navegador através de um domínio público.

### Link da aplicação

👉 https://blushfiltro.web.app

Por utilizar HTTPS, o navegador permite acesso seguro à webcam, dispensando configurações adicionais para utilização da aplicação.

---

# 📦 Estrutura do projeto

```text
projeto-blush/
├── index.html          # Estrutura da interface
├── style.css           # Estilos da aplicação
├── script.js           # Câmera, rastreamento facial e renderização do blush
├── assets/
│   ├── blush/          # Reservado para texturas ou imagens
│   └── icons/          # Reservado para ícones personalizados
└── README.md
```

O projeto não utiliza imagens para desenhar o blush. Todo o efeito é gerado dinamicamente através da **Canvas API**, utilizando gradientes radiais, transparência e efeitos de blur.

---

# 🧰 Requisitos

- Google Chrome ou Microsoft Edge (versões recentes);
- Webcam física ou virtual;
- Conexão com a internet na primeira execução para baixar o modelo do MediaPipe;
- Para câmeras virtuais (Iriun, DroidCam ou OBS), o software correspondente deve estar instalado e em execução.

---

# ▶️ Como utilizar

## Opção 1 — Utilizar a versão online (Recomendado)

Basta acessar:

```
https://SEU-DOMINIO
```

Permita o acesso à câmera quando solicitado e utilize normalmente.

Não é necessário instalar nenhuma dependência.

---

## Opção 2 — Executar localmente (Desenvolvimento)

Caso deseje modificar o projeto ou estudar seu funcionamento, execute-o localmente.

**Importante:** não abra o arquivo `index.html` diretamente pelo navegador (`file://`), pois módulos JavaScript e acesso à câmera são bloqueados por questões de segurança.

### Python

```bash
cd projeto-blush
python -m http.server 8000
```

Abra:

```
http://localhost:8000
```

---

### Node.js

```bash
cd projeto-blush
npx serve .
```

Abra o endereço informado no terminal.

---

### VS Code

Também é possível utilizar a extensão **Live Server**.

---

# 🖥️ Como funciona

1. O usuário acessa a aplicação pelo domínio público ou por um servidor local.
2. A aplicação solicita permissão para acessar a câmera.
3. Todas as webcams disponíveis são listadas automaticamente.
4. Caso exista uma **Iriun Webcam**, ela será selecionada automaticamente.
5. O modelo **MediaPipe Face Landmarker** é carregado.
6. O rosto é detectado utilizando 468 pontos faciais.
7. O blush é desenhado dinamicamente sobre as bochechas.
8. Conforme o usuário movimenta a cabeça, o blush acompanha a posição em tempo real.
9. Os controles laterais permitem alterar cor, intensidade, tamanho, formato e desfoque.
10. O usuário pode capturar uma fotografia já contendo o efeito aplicado.

---

# 🔄 Como trocar de webcam

Utilize o seletor **📷 Câmera**, localizado na parte superior da aplicação.

Ao selecionar outro dispositivo:

- a câmera atual é encerrada;
- a nova câmera é iniciada automaticamente;
- não é necessário atualizar a página.

---

# 📱 Como utilizar a Iriun Webcam

1. Instale o **Iriun Webcam** no computador.
2. Instale o aplicativo no celular.
3. Conecte ambos na mesma rede Wi-Fi (ou via USB).
4. Abra o aplicativo no computador e no celular.
5. Acesse o Blush AR.
6. Permita o acesso à câmera.
7. Caso detectada, a Iriun Webcam será selecionada automaticamente.

O mesmo comportamento ocorre com:

- DroidCam
- OBS Virtual Camera

---

# 🛠️ Solução de problemas

## A câmera não aparece

- Verifique as permissões da câmera no navegador;
- Feche outros aplicativos que estejam utilizando a webcam;
- No Windows, confirme que o navegador possui acesso à câmera nas configurações de privacidade.

---

## O modelo não carrega

Verifique:

- conexão com a internet;
- bloqueios por firewall;
- mensagens de erro no Console (F12).

---

## A tela fica preta

Não abra o arquivo diretamente (`file://`).

Utilize:

- Firebase Hosting;
- Live Server;
- Python;
- Node.js.

---

## A Iriun Webcam não aparece

- Confirme que o aplicativo está aberto;
- Reinicie a página;
- Selecione manualmente a câmera.

---

## O blush treme

Melhore a iluminação do ambiente e mantenha o rosto totalmente visível para a câmera.

---

## FPS baixo

- Feche outras aplicações;
- Utilize aceleração por hardware no navegador;
- Evite executar aplicações pesadas simultaneamente.

---

# 🧩 Tecnologias utilizadas

- **HTML5** — Estrutura da interface.
- **CSS3** — Layout responsivo, animações e modo escuro.
- **JavaScript ES6+** — Lógica da aplicação.
- **MediaPipe Face Landmarker** (`@mediapipe/tasks-vision`) — Rastreamento facial em tempo real.
- **Canvas API** — Renderização do blush utilizando gradientes, blur e modos de mesclagem.
- **MediaDevices API** (`getUserMedia` e `enumerateDevices`) — Acesso às webcams.
- **Firebase Hosting** — Hospedagem da aplicação e disponibilização através de um domínio público com HTTPS.

O projeto foi desenvolvido inteiramente em **JavaScript puro (Vanilla JavaScript)**, sem utilização de frameworks como React, Vue ou Angular.

---

# 🎨 Paleta de cores

| Emoji | Cor |
|-------|----------------|
| 🌸 | Rosa Claro |
| 🌷 | Rosa Bebê |
| 🌺 | Rosa Pink |
| 🍑 | Pêssego |
| 🧡 | Coral |
| 🌹 | Rosado Queimado |
| 🩷 | Rosé |
| 🤎 | Terracota |

---

# ☁️ Deploy

A aplicação foi publicada utilizando o **Firebase Hosting**, permitindo acesso através de um domínio público com HTTPS.

Entre as principais vantagens da hospedagem estão:

- Disponibilidade online 24 horas por dia;
- Acesso direto pelo navegador;
- Comunicação segura via HTTPS;
- Compatibilidade com computadores e dispositivos móveis;
- Não há necessidade de instalação para utilização da aplicação.

---

# 📄 Licença

Este projeto foi desenvolvido para fins de estudo, pesquisa e demonstração de técnicas de visão computacional e realidade aumentada utilizando tecnologias web.

Sua utilização, adaptação e modificação são permitidas para fins educacionais e de aprendizado.
