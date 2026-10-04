import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import "@mantine/core/styles.css";
// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { CLICK_LOG_ENABLED } from './dev/clickLogConfig'

if (import.meta.env.DEV && CLICK_LOG_ENABLED) {
  import('./dev/clickRecorder').then((m) => m.startClickRecorder())
}

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}


// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

