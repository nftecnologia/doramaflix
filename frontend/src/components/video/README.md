# Netflix-Style Video Player

Um componente de video player completo estilo Netflix para o DoramaFlix, construído com React, TypeScript e react-player.

## Características

### 🎮 Controles Netflix-Style
- Botões play/pause, volume, timeline interativa
- Controles de qualidade (Auto, 1080p, 720p, 480p, 360p)
- Velocidade de reprodução (0.5x - 2x)
- Botões próximo/anterior episódio
- Fullscreen e Picture-in-Picture

### 🎯 Funcionalidades Avançadas
- **Skip Intro/Credits**: Detecção automática e botões para pular
- **Autoplay Next Episode**: Reprodução automática do próximo episódio
- **Keyboard Shortcuts**: Controle completo via teclado
- **Auto-hide Controls**: Controles se escondem automaticamente
- **Subtitles Support**: Suporte completo a legendas
- **Progress Buffer**: Indicador de buffer de carregamento
- **Error Handling**: Tratamento de erros de reprodução

### 📱 Responsivo
- Layout adaptativo para desktop e mobile
- Touch-friendly controls
- Otimização para diferentes tamanhos de tela

## Instalação

O componente utiliza as seguintes dependências já instaladas no projeto:

```json
{
  "react-player": "^2.13.0",
  "@heroicons/react": "^2.0.18"
}
```

## Uso Básico

```tsx
import { EnhancedNetflixPlayer } from '@/components/video'

function MyVideoPage() {
  return (
    <EnhancedNetflixPlayer
      url="https://example.com/video.mp4"
      title="Minha Série"
      autoplay={false}
      volume={0.8}
    />
  )
}
```

## Uso Avançado

```tsx
import { EnhancedNetflixPlayer } from '@/components/video'

function SeriesPlayer() {
  const [currentEpisode, setCurrentEpisode] = useState(0)
  
  const episodes = [
    {
      number: 1,
      title: "Pilot",
      url: "https://example.com/episode-1.mp4",
      nextEpisode: {
        url: "https://example.com/episode-2.mp4",
        title: "The Escape",
        thumbnail: "/thumbnails/episode-2.jpg"
      }
    }
  ]

  const subtitles = [
    {
      lang: 'pt-BR',
      label: 'Português (Brasil)',
      src: '/subtitles/pt-br.vtt'
    },
    {
      lang: 'en',
      label: 'English',
      src: '/subtitles/en.vtt'
    }
  ]

  return (
    <EnhancedNetflixPlayer
      url={episodes[currentEpisode].url}
      title="Mystery Drama Series"
      episode={episodes[currentEpisode]}
      subtitles={subtitles}
      onNext={() => setCurrentEpisode(prev => prev + 1)}
      onPrevious={() => setCurrentEpisode(prev => prev - 1)}
      onEnded={() => console.log('Episódio finalizado!')}
      autoplay={true}
      autoHideControls={true}
      autoHideDelay={3000}
      enableKeyboardShortcuts={true}
    />
  )
}
```

## Uso com Hook Customizado

```tsx
import { useNetflixPlayer } from '@/hooks/use-netflix-player'
import ReactPlayer from 'react-player'

function CustomPlayer({ url }: { url: string }) {
  const {
    state,
    actions,
    containerRef,
    updateProgress,
    updateDuration
  } = useNetflixPlayer({
    autoplay: false,
    volume: 0.8,
    enableKeyboardShortcuts: true
  })

  return (
    <div ref={containerRef}>
      <ReactPlayer
        url={url}
        playing={state.playing}
        volume={state.volume}
        onProgress={updateProgress}
        onDuration={updateDuration}
      />
      
      <button onClick={actions.togglePlay}>
        {state.playing ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
```

## Props

### EnhancedNetflixPlayer

| Prop | Tipo | Padrão | Descrição |
|------|------|---------|-----------|
| `url` | `string` | - | **Obrigatório.** URL do vídeo |
| `title` | `string` | - | Título do vídeo/série |
| `episode` | `EpisodeData` | - | Dados do episódio atual |
| `subtitles` | `SubtitleTrack[]` | `[]` | Array de legendas disponíveis |
| `onNext` | `() => void` | - | Callback para próximo episódio |
| `onPrevious` | `() => void` | - | Callback para episódio anterior |
| `onEnded` | `() => void` | - | Callback quando vídeo termina |
| `autoplay` | `boolean` | `false` | Reprodução automática |
| `volume` | `number` | `0.8` | Volume inicial (0-1) |
| `autoHideControls` | `boolean` | `true` | Auto-ocultar controles |
| `autoHideDelay` | `number` | `3000` | Delay para ocultar controles (ms) |
| `enableKeyboardShortcuts` | `boolean` | `true` | Habilitar atalhos do teclado |
| `width` | `string \| number` | `'100%'` | Largura do player |
| `height` | `string \| number` | `'100%'` | Altura do player |

### Tipos

```tsx
interface EpisodeData {
  number: number
  title: string
  nextEpisode?: {
    url: string
    title: string
    thumbnail: string
  }
}

interface SubtitleTrack {
  lang: string
  label: string
  src: string
}
```

## Atalhos do Teclado

| Tecla | Ação |
|-------|------|
| `Espaço` | Play/Pause |
| `←` | Retroceder 10 segundos |
| `→` | Avançar 10 segundos |
| `↑` | Aumentar volume |
| `↓` | Diminuir volume |
| `M` | Silenciar/Dessilenciar |
| `F` | Fullscreen |
| `C` | Toggle legendas |
| `Esc` | Sair do fullscreen |

## Funcionalidades Skip

### Skip Intro
- Detecta automaticamente introdução (30s - 90s)
- Mostra botão "Pular Introdução"
- Pula para 1:30 quando ativado

### Skip Credits
- Detecta créditos (últimos 2 minutos)
- Mostra botão "Próximo Episódio"
- Chama `onNext` quando ativado

### Next Episode Preview
- Aparece nos últimos 30 segundos
- Mostra preview do próximo episódio
- Permite reprodução imediata

## Estilos e Cores

O componente usa as cores oficiais do Netflix:

```tsx
const NETFLIX_COLORS = {
  primary: '#e50914',      // Netflix red
  background: '#141414',   // Netflix dark background
  text: '#ffffff',         // White text
  textSecondary: '#e5e5e5', // Light gray
  surface: '#2a2a2a',      // Dark surface
  overlay: 'rgba(0,0,0,0.8)' // Dark overlay
}
```

## Performance

- Usa `React.memo` para otimização de re-renders
- Debounce nos controles de volume e seek
- Lazy loading de componentes não essenciais
- Otimização de eventos de mouse/keyboard

## Acessibilidade

- Suporte completo a keyboard navigation
- ARIA labels em todos os controles
- Focus indicators visíveis
- Alto contraste para legibilidade

## Exemplo Completo

Veja o arquivo `video-player-example.tsx` para um exemplo completo de implementação com múltiplos episódios, controle de estado e integração completa.

## Troubleshooting

### Vídeo não carrega
- Verifique se a URL é válida e acessível
- Certifique-se que o servidor suporta CORS
- Verifique se o formato do vídeo é suportado

### Controles não aparecem
- Verifique se `autoHideControls` está configurado corretamente
- Teste mover o mouse sobre o player
- Verifique console para erros JavaScript

### Keyboard shortcuts não funcionam
- Certifique-se que `enableKeyboardShortcuts` está `true`
- Verifique se o elemento tem foco
- Teste clicando no player primeiro