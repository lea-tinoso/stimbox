import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Desktop from './pages/Desktop.tsx'
import { CatalogProvider } from './state/catalog.tsx'
import { DesktopProvider } from './state/desktop.tsx'
import { PlayerProvider } from './state/player.tsx'
import { PlaylistsProvider } from './state/playlists.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogProvider>
      <PlayerProvider>
        <PlaylistsProvider>
          <DesktopProvider>
            <Desktop />
          </DesktopProvider>
        </PlaylistsProvider>
      </PlayerProvider>
    </CatalogProvider>
  </StrictMode>,
)
