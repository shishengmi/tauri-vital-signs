import { Routes, Route } from 'react-router-dom'
import { SimpleNavMenu } from './components/SimpleNavMenu'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Testpage from './pages/test'

export default function App() {
  return (
    <div className='h-full flex flex-col' >
      {/* 菜单栏 */}
      <div ><SimpleNavMenu /></div>
      
      <div className="flex-1 h-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/test" element={<Testpage />} />
        </Routes>
      </div>
    </div>
  )
}
