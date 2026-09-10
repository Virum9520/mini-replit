import { useState } from 'react'
import PasswordGate, { UNLOCK_KEY } from './components/PasswordGate'

function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(UNLOCK_KEY) === '1',
  )

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div className="app">
      <h1 style={{ padding: 24 }}>Mini-Replit — IDE coming soon…</h1>
    </div>
  )
}

export default App
