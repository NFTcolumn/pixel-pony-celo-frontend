import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Game from './pages/Game'
import Referrals from './pages/Referrals'
import Story from './pages/Story'
import Buy from './pages/Buy'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Whitepaper from './pages/Whitepaper'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="game" element={<Game />} />
        <Route path="referrals" element={<Referrals />} />
        <Route path="story" element={<Story />} />
        <Route path="buy" element={<Buy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="whitepaper" element={<Whitepaper />} />
      </Route>
    </Routes>
  )
}

export default App
