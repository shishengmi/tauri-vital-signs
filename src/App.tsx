import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Config from './pages/Config'
import { SimpleSidebar } from './components/SimpleSidebar'
import { StatusBar } from './components/StatusBar'
import { FloatingSettingsWindow } from './components/FloatingSettingsWindow'
import { useFloatingSettings } from './hooks/useFloatingSettings'
import PatientInfo from './pages/Configs/patientInfo'
import SerialConfig from './pages/Configs/serial'
import SerialDebug from './pages/Configs/serial-debug'

export default function App() {
  const { isSettingsOpen, openSettings, closeSettings } = useFloatingSettings()

  return (
    <div className='h-full flex' >
      <SimpleSidebar onSettingsClick={openSettings} />
      <div className="flex-1 h-full ml-12 pb-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/config" element={<Config />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/test/patientInfo" element={<PatientInfo />} />
          <Route path="/configs/serial" element={<SerialConfig />} />
          <Route path="/configs/serial-debug" element={<SerialDebug />} />
        </Routes>
      </div>
      <StatusBar />
      <FloatingSettingsWindow 
        isOpen={isSettingsOpen} 
        onClose={closeSettings} 
      />
    </div>
  )
}
