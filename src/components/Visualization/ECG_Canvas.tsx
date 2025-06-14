import React, { useRef, useEffect, useState } from 'react';
import { useVitalSigns } from '@/hooks/useVitalSigns';

interface ECGCanvasProps {
  width?: number;
  height?: number;
  timeScale?: number; // 时间刻度，毫秒/像素
  amplitudeScale?: number; // 振幅缩放因子
}

const ECG_Canvas: React.FC<ECGCanvasProps> = ({ 
  width = 800, 
  height = 300, 
  timeScale = 10,
  amplitudeScale = 1.0 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { data, isLoading, error } = useVitalSigns(100); // 100ms刷新间隔
  
  // ECG数据缓存
  const [ecgDataBuffer, setEcgDataBuffer] = useState<Array<{value: number, timestamp: number}>>([]);
  const [ecgRange, setEcgRange] = useState({ min: -1000, max: 1000 });
  
  // 画布配置
  const bgColor = "#030712";
  const lineColor = "#00ff00";
  const gridColor = "#333333";
  const alertColor = "#ff4444";
  
  useEffect(() => {
    if (data && data.timestamp) {
      // 添加新的ECG数据点到缓存
      const newDataPoint = {
        value: (data as any).ecg_raw || 0, // 从后端获取原始ECG值
        timestamp: parseInt(data.timestamp)
      };
      
      setEcgDataBuffer(prev => {
        const updated = [...prev, newDataPoint];
        // 只保留最近5秒的数据 (假设250Hz采样率)
        const maxPoints = Math.floor(5000 / timeScale);
        return updated.slice(-maxPoints);
      });
    }
  }, [data, timeScale]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;
    
    // 清空画布
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // 绘制网格
    drawGrid(ctx, width, height);
    
    // 绘制ECG波形
    if (ecgDataBuffer.length > 1) {
      drawECGWaveform(ctx, width, height);
    }
    
    // 绘制状态信息
    drawStatusInfo(ctx, width, height);
    
  }, [ecgDataBuffer, width, height, ecgRange]);
  
  // 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    // 水平网格线 (电压刻度)
    const voltageStep = h / 10;
    for (let y = 0; y <= h; y += voltageStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // 垂直网格线 (时间刻度)
    const timeStep = w / 20;
    for (let x = 0; x <= w; x += timeStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    
    // 中心线加粗
    ctx.strokeStyle = "#555555";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  };
  
  // 绘制ECG波形
  const drawECGWaveform = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (ecgDataBuffer.length < 2) return;
    
    // 动态计算最大最小值用于归一化
    const values = ecgDataBuffer.map(point => point.value);
    const currentMin = Math.min(...values);
    const currentMax = Math.max(...values);
    
    // 更新范围（平滑过渡）
    setEcgRange(prev => ({
      min: prev.min * 0.9 + currentMin * 0.1,
      max: prev.max * 0.9 + currentMax * 0.1
    }));
    
    const range = ecgRange.max - ecgRange.min;
    if (range === 0) return;
    
    // 绘制波形
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const pixelsPerPoint = w / Math.max(ecgDataBuffer.length - 1, 1);
    
    ecgDataBuffer.forEach((point, index) => {
      // 归一化Y坐标 (翻转Y轴，上方为正)
      const normalizedValue = (point.value - ecgRange.min) / range;
      const y = h - (normalizedValue * h * 0.8 + h * 0.1); // 留10%边距
      const x = index * pixelsPerPoint;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // 绘制R波峰标记
    drawRPeakMarkers(ctx, w, h);
  };
  
  // 绘制R波峰标记
  const drawRPeakMarkers = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (ecgDataBuffer.length < 3) return;
    
    const range = ecgRange.max - ecgRange.min;
    if (range === 0) return;
    
    const pixelsPerPoint = w / Math.max(ecgDataBuffer.length - 1, 1);
    const threshold = ecgRange.min + range * 0.6; // 60%阈值检测R波
    
    // 简单的R波检测
    for (let i = 1; i < ecgDataBuffer.length - 1; i++) {
      const prev = ecgDataBuffer[i - 1].value;
      const curr = ecgDataBuffer[i].value;
      const next = ecgDataBuffer[i + 1].value;
      
      // 检测波峰
      if (curr > prev && curr > next && curr > threshold) {
        const normalizedValue = (curr - ecgRange.min) / range;
        const y = h - (normalizedValue * h * 0.8 + h * 0.1);
        const x = i * pixelsPerPoint;
        
        // 绘制R波标记
        ctx.fillStyle = alertColor;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 绘制垂直线
        ctx.strokeStyle = alertColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
  };
  
  // 绘制状态信息
  const drawStatusInfo = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    
    // 显示当前范围
    ctx.fillText(`范围: ${ecgRange.min.toFixed(0)} - ${ecgRange.max.toFixed(0)}`, 10, 20);
    
    // 显示心率信息
    if (data) {
      ctx.fillText(`心率: ${data.heart_rate.toFixed(1)} bpm`, 10, 40);
      ctx.fillText(`RR间隔: ${data.rr_interval.toFixed(3)} s`, 10, 60);
    }
    
    // 显示数据点数量
    ctx.fillText(`数据点: ${ecgDataBuffer.length}`, 10, 80);
    
    // 连接状态
    if (error) {
      ctx.fillStyle = alertColor;
      ctx.fillText(`错误: ${error}`, 10, h - 20);
    } else if (isLoading) {
      ctx.fillStyle = "#ffaa00";
      ctx.fillText("加载中...", 10, h - 20);
    } else {
      ctx.fillStyle = lineColor;
      ctx.fillText("已连接", 10, h - 20);
    }
  };
  
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg p-4">
      <div className="mb-2">
        <h3 className="text-white text-lg font-semibold">实时心电图 (ECG)</h3>
        <p className="text-gray-400 text-sm">
          采样率: ~{Math.round(1000/timeScale)}Hz | 缓存: {ecgDataBuffer.length}点
        </p>
      </div>
      <div className="border border-gray-600 rounded">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          style={{ backgroundColor: bgColor }}
        />
      </div>
      
      {/* 控制面板 */}
      <div className="mt-2 flex gap-4 text-sm text-gray-300">
        <div>振幅缩放: {amplitudeScale.toFixed(1)}x</div>
        <div>时间刻度: {timeScale}ms/px</div>
        {data && (
          <div className="text-green-400">
            最新ECG值: {(data as any).ecg_raw || 'N/A'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ECG_Canvas;
