import { Routes, Route } from 'react-router-dom'
// import { SimpleNavMenu } from './components/SimpleNavMenu'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Config from './pages/Config'
import { AppSidebar } from './components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import PatientInfo from './pages/Configs/patientInfo'
import SerialConfig from './pages/Configs/serial'
import SerialDebug from './pages/Configs/serial-debug'

export default function App() {
  return (
    <div className='h-full flex flex-col' >
      <SidebarProvider>
        <AppSidebar />
        <SidebarTrigger />
        <div className="flex-1 h-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/config" element={<Config />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/test/patientInfo" element={<PatientInfo />} />
            <Route path="/configs/serial" element={<SerialConfig />} />
            <Route path="/configs/serial-debug" element={<SerialDebug />} />
          </Routes>
        </div>
      </SidebarProvider>
    </div>
  )
}
