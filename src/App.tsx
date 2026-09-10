import { useState } from 'react'
import PasswordGate, { UNLOCK_KEY } from './components/PasswordGate'
import Ide from './components/Ide'

function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(UNLOCK_KEY) === '1',
  )

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />
  }

  return <Ide />
}

export default App
