import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Desktop from './pages/Desktop.tsx'
import { DesktopProvider } from './state/desktop.tsx'
import { PlayerProvider } from './state/player.tsx'
import { PlaylistsProvider } from './state/playlists.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlayerProvider>
      <PlaylistsProvider>
        <DesktopProvider>
          <Desktop />
        </DesktopProvider>
      </PlaylistsProvider>
    </PlayerProvider>
  </StrictMode>,
)
