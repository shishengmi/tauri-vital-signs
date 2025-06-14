import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Shield, Cpu } from 'lucide-react'
import PatientInfo from './Configs/patientInfo'
import SerialConfig from './Configs/serial'
import AISettings from './Configs/aiSettings'

export default function Config() {
  return (
    <div className="h-full flex flex-col">
      {/* 页面标题 */}
      <div className="border-b border-border p-6">
        <h1 className="text-3xl font-bold">设置界面</h1>
      </div>

      {/* 设置内容 */}
      <div className="flex-1 p-6">
        <Tabs defaultValue="patient" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="patient" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>病人信息</span>
            </TabsTrigger>
            <TabsTrigger value="serial" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>通信设置</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center space-x-2">
              <Cpu className="w-4 h-4" />
              <span>AI设置</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-6">
            <TabsContent value="patient" className="h-full">
              <div className="bg-card rounded-lg border p-6 h-full">
                <PatientInfo />
              </div>
            </TabsContent>
            <TabsContent value="serial" className="h-full">
              <div className="bg-card rounded-lg border p-6 h-full">
                <SerialConfig />
              </div>
            </TabsContent>
            <TabsContent value="ai" className="h-full">
              <div className="bg-card rounded-lg border p-6 h-full">
                <AISettings />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}