import { Clock, Wifi, Battery, Activity } from "lucide-react"
import { useState, useEffect } from "react"

export function StatusBar() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-6 bg-slate-800 text-slate-200 text-xs flex items-center justify-between px-3 z-40">
      {/* 左侧信息 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3" />
          <span>生命体征监测系统</span>
        </div>
        <div className="flex items-center space-x-1">
          <Wifi className="w-3 h-3" />
          <span>已连接</span>
        </div>
      </div>

      {/* 右侧信息 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Battery className="w-3 h-3" />
          <span>100%</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  )
}