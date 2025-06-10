import { Routes, Route } from 'react-router-dom'
// import { SimpleNavMenu } from './components/SimpleNavMenu'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Testpage from './pages/test'
import Config from './pages/Config'
import { AppSidebar } from './components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

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
            <Route path="/test" element={<Testpage />} />
          </Routes>
        </div>
      </SidebarProvider>
    </div>
  )
}
