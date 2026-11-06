# Exercício 2: 3D UI

José Pedro Rodrigues Gomes - 2025171142

Unidade curricular: Ambientes de Realidade Virtual Interativos

Galeria de museu em A-Frame. Num quiosque o utilizador escolhe uma obra de arte famosa (imagem ou vídeo) e vê-a numa moldura grande na parede do fundo. As paredes laterais têm outros quadros famosos pendurados.

## Como ver

Na pasta do projeto:

```bash
python3 serve.py
```

Abrir <http://localhost:8000>. Usar o `serve.py` e não o `python3 -m http.server`: este não suporta pedidos `Range`, e sem eles o navegador não deixa saltar no vídeo (barra de progresso). Com o Live Server do VS Code também funciona.

A galeria funciona sem internet: a biblioteca, as imagens, os vídeos, os sons e a fonte do texto estão no projeto. Só os modelos 3D dos comandos e das mãos, que o A-Frame mostra em VR, são descarregados de `cdn.aframe.io`; sem rede, em VR não se vêem os modelos, mas o raio e os cliques continuam a funcionar.

### No Meta Quest

O WebXR exige HTTPS (ou `localhost`). Com o computador e o Quest na mesma rede Wi-Fi:

```bash
python3 serve.py --https
```

O script mostra um endereço `https://<IP>:8443`. Abri-lo no Meta Quest Browser e, no aviso de certificado, escolher "Avançado" e continuar (o certificado é criado localmente só para testes, com validade de 30 dias). Carregar no botão do óculos, em baixo à direita.

Alternativa por USB: `adb reverse tcp:8000 tcp:8000` e abrir `http://localhost:8000` no Quest.

Outra opção é publicar no GitHub Pages (*Settings > Pages*, ramo `main`, pasta raiz). O endereço é HTTPS e os vídeos têm suporte a `Range`, por isso abre diretamente no Quest sem aviso de certificado.

Para o hand tracking, ativar em *Definições > Movimento e controlos > Rastreio de mãos* e pousar os comandos.

## Como usar

| Entrada | Apontar | Clicar |
| --- | --- | --- |
| Rato | cursor | clique |
| Comandos VR | raio laser | gatilho |
| Mãos (hand tracking) | raio da mão | pinch (indicador e polegar) |

Ao abrir aparece um ecrã inicial ("Visit the Museum of Artworks") com um botão ENTER; carregar nele (com o rato, o gatilho ou o pinch) para entrar na galeria. Depois escolher uma obra na lista do quiosque. Os vídeos têm Play/Pause, Sound (som ligado ou desligado) e uma barra de progresso clicável.

## Pistas de interação

| Estado do botão | Aspeto |
| --- | --- |
| Repouso | cinzento escuro |
| Hover | azul acinzentado, sobe para a frente, cresce um pouco e ganha contorno branco |
| Premido | dourado vivo e afunda |
| Selecionado | dourado escuro com barra amarela à esquerda |
| Desativado | quase preto (controlos de vídeo sem vídeo) |

Também há som (tique ao focar, toque ao premir e largar, e um acorde ao escolher uma obra), vibração nos comandos VR e um raio que fica laranja enquanto se prime.

## Estrutura

- `index.html`: a cena inteira, de forma declarativa (sala, quadros, quiosque, luzes, comandos e mãos), com `<a-assets>` e mixins (`gold`, `lip`, `button`, ...) para o que se repete. As molduras são feitas de caixas empilhadas (perfil em relevo) e o quiosque tem placa traseira, corpo, friso dourado e pedestal. Cada obra do quiosque tem a sua moldura própria (`.work`), já com o tamanho certo, e só uma está visível de cada vez. Os sons (`sound`) e o fade do ecrã (`animation`) são componentes do próprio A-Frame.
- `script.js`: só o comportamento, em componentes pequenos:
  - `ui-button`: estados visuais dos botões (hover, premido, selecionado, desativado);
  - `enter-museum`: o botão ENTER do ecrã inicial esconde o ecrã inicial, mostra a galeria e passa a dar os cliques aos botões da galeria;
  - `media-item` e `video-control`: ligam os botões ao visualizador;
  - `viewer`: mostra a moldura da obra escolhida, esconde as outras e controla o vídeo;
  - `xr-pointer`: aponta e clica com comandos e mãos (o rato usa o `cursor` do A-Frame);
  - `start-pitch`: inclina a câmara para baixo ao abrir, no ecrã normal.
- `serve.py`: servidor local com suporte a `Range`, em HTTP ou HTTPS.
- `assets/`: `art` (quadros, versões pequenas e miniaturas), `video`, `textures` e `sounds`.

### Acrescentar uma obra ao quiosque

1. Copiar a imagem para `assets/art/` e declará-la em `<a-assets>`, por exemplo `<img id="obra" src="assets/art/obra.jpg" />`, com uma miniatura 256×144 (`thumb-obra`).
2. Copiar um dos blocos `.work` (a moldura da obra), mudando o `id`, o tamanho (largura e altura em metros, na proporção da imagem), o `src` do `.screen` e o texto da placa.
3. Copiar um dos botões do quiosque, mudando `media-item="target: #work-obra; title: ..."`, a miniatura, o texto e a posição.

Para um vídeo, declarar `<video id="..." src="..." loop playsinline></video>`, usá-lo como `src` do `.screen` e juntar `video: #id` ao `media-item`.

## Conteúdo e créditos

Todas as obras são de domínio público (Wikimedia Commons), reduzidas para cerca de 1920 px nas obras do quiosque e 768 px nas paredes.

| Obra | Autor | Ficheiro | Uso |
| --- | --- | --- | --- |
| [Mona Lisa](https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg) | Leonardo da Vinci | `mona_lisa.jpg`, `small/mona_lisa.jpg` | quiosque e parede |
| [O Nascimento de Vénus](https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg) | Sandro Botticelli | `birth_of_venus.jpg`, `small/birth_of_venus.jpg` | quiosque e parede |
| [O Grito](https://commons.wikimedia.org/wiki/File:The_Scream.jpg) | Edvard Munch | `the_scream.jpg`, `small/the_scream.jpg` | quiosque e parede |
| [A Última Ceia](https://commons.wikimedia.org/wiki/File:Leonardo_da_Vinci_(1452-1519)_-_The_Last_Supper_(1495-1498).jpg) | Leonardo da Vinci | `small/last_supper.jpg`, `video/last_supper.mp4` | vídeo e parede |
| [A Noite Estrelada](https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg) | Vincent van Gogh | `small/starry_night.jpg`, `video/starry_night.mp4` | vídeo e parede |
| [Rapariga com Brinco de Pérola](https://commons.wikimedia.org/wiki/File:Meisje_met_de_parel.jpg) | Johannes Vermeer | `small/pearl_earring.jpg` | parede |
| [A Grande Onda](https://commons.wikimedia.org/wiki/File:Tsunami_by_hokusai_19th_century.jpg) | Katsushika Hokusai | `small/great_wave.jpg` | parede |
| [Caminhante sobre o Mar de Névoa](https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg) | Caspar David Friedrich | `small/wanderer.jpg` | parede |

A fonte do texto (`assets/fonts`) é a Roboto (Google, licença Apache 2.0), na versão MSDF distribuída com o A-Frame.

Os ficheiros que não são quadros foram gerados para este trabalho:

- **Vídeos** (`assets/video`): MP4 de 14 s com zoom e deslocamento lentos sobre os quadros, com um som ambiente grave, feitos com um programa em Swift (AVFoundation).
- **Texturas** (`assets/textures`): parquet, gesso, mancha suave de luz/sombra, reflexo e o céu do ecrã inicial, gerados em Python.
- **Sons** (`assets/sounds`): os quatro sons de interação, sintetizados em Python.

## Estado dos testes

- **Navegador de desktop (Chrome):** hover, clique, seleção de imagens e vídeos, Play/Pause, som e seek. Os controlos de vídeo só reagem quando há um vídeo escolhido.
- **Quest 2 emulado:** testado com o emulador de WebXR da Meta (IWER, usado só para teste e não incluído no projeto). Em sessão VR, os dois comandos ligam, o raio aponta e o gatilho carrega em ENTER, escolhe as obras e usa o Play/Pause, o som e a barra de progresso; no modo de mãos, o pinch faz o mesmo.
- **Não testado num Quest 2 real:** o desempenho (fluidez) e a vibração dos comandos, que um emulador não permite verificar.
