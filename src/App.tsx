import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Config from './pages/Config'
import AI from './pages/AI'
import { SimpleSidebar } from './components/SimpleSidebar'
import { StatusBar } from './components/StatusBar'
import PatientInfo from './pages/Configs/patientInfo'
import SerialConfig from './pages/Configs/serial'

export default function App() {
  return (
    <div className='h-full flex'>
      <SimpleSidebar />
      <div className="flex-1 h-full ml-12 pb-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/config" element={<Config />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/test/patientInfo" element={<PatientInfo />} />
          <Route path="/configs/serial" element={<SerialConfig />} />
        </Routes>
      </div>
      <StatusBar />
    </div>
  )
}
