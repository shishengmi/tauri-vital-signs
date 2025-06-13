import React, { useState, useEffect, useRef } from 'react'
import { X, Settings, User, Shield, Terminal, Minimize2, Maximize2, Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PatientInfo from '@/pages/Configs/patientInfo'
import SerialConfig from '@/pages/Configs/serial'
import SerialDebug from '@/pages/Configs/serial-debug'

interface FloatingSettingsWindowProps {
  isOpen: boolean
  onClose: () => void
}

export function FloatingSettingsWindow({ isOpen, onClose }: FloatingSettingsWindowProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const windowRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleApply = () => {
    // 应用设置逻辑
    setHasUnsavedChanges(false)
    console.log('应用设置')
  }

  const handleOk = () => {
    // 确定并关闭
    handleApply()
    onClose()
  }

  const handleCancel = () => {
    // 取消更改并关闭
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要取消吗？')
      if (!confirmed) return
    }
    onClose()
  }

  const handleReset = () => {
    // 重置到默认值
    const confirmed = window.confirm('确定要重置所有设置到默认值吗？')
    if (confirmed) {
      setHasUnsavedChanges(true)
      console.log('重置设置')
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div
        ref={windowRef}
        className="absolute pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          width: isMinimized ? '280px' : '650px',
          height: isMinimized ? '50px' : '550px'
        }}
      >
        <Card className="w-full h-full shadow-2xl border-2 border-border bg-background flex flex-col">
          {/* 标题栏 */}
          <CardHeader 
            className="flex flex-row items-center justify-between p-3 cursor-move bg-muted/50 border-b flex-shrink-0"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="font-semibold text-sm">设置</span>
              {hasUnsavedChanges && !isMinimized && (
                <span className="text-xs text-orange-500">• 有未保存的更改</span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleCancel}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>

          {/* 最小化状态显示 */}
          {isMinimized && (
            <div className="flex-1 flex items-center justify-center px-4">
              <span className="text-sm text-muted-foreground">设置窗口已最小化</span>
            </div>
          )}

          {/* 内容区域 */}
          {!isMinimized && (
            <>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <Tabs defaultValue="patient" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 m-3 mb-0 flex-shrink-0">
                    <TabsTrigger value="patient" className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span className="text-xs">病人信息</span>
                    </TabsTrigger>
                    <TabsTrigger value="serial" className="flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span className="text-xs">通信设置</span>
                    </TabsTrigger>
                    <TabsTrigger value="debug" className="flex items-center space-x-1">
                      <Terminal className="w-3 h-3" />
                      <span className="text-xs">串口调试</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="flex-1 overflow-auto px-3">
                    <TabsContent value="patient" className="mt-2 h-full">
                      <PatientInfo />
                    </TabsContent>
                    <TabsContent value="serial" className="mt-2 h-full">
                      <SerialConfig />
                    </TabsContent>
                    <TabsContent value="debug" className="mt-2 h-full">
                      <SerialDebug />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>

              {/* 底部按钮栏 */}
              <CardFooter className="flex justify-between items-center p-3 border-t bg-muted/20 flex-shrink-0">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>重置</span>
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    取消
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApply}
                    disabled={!hasUnsavedChanges}
                  >
                    应用
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOk}
                    className="flex items-center space-x-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>确定</span>
                  </Button>
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}