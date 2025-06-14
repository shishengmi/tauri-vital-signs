import React, { useRef, useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useVitalSigns } from '@/hooks/useVitalSigns';

interface LttbDataPoint {
  x: number;
  y: number;
}

interface ECGCanvasProps {
  width?: number;
  height?: number;
  scrollSpeed?: number;
  timeWindow?: number;
}

const ECG_Canvas: React.FC<ECGCanvasProps> = ({
  width = 800,
  height = 300,
  scrollSpeed = 100,
  timeWindow = 10
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const scrollOffsetRef = useRef<number>(0);

  // 调试相关状态
  const debugInfoRef = useRef({
    frameCount: 0,
    lastFpsUpdate: 0,
    fps: 0,
    dataFetchCount: 0,
    lastDataFetch: 0,
    renderTime: 0,
    dataProcessingTime: 0
  });

  // 数据状态
  const [ecgData, setEcgData] = useState<LttbDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dataStats, setDataStats] = useState({ points: 0, compressionRatio: 0 });

  // 获取实时数据状态
  const { data: vitalSigns, isLoading, error } = useVitalSigns(50);

  // 画布样式配置 - 移到组件外部避免重新创建
  const configRef = useRef({
    bgColor: '#0a0a0a',
    gridColor: '#1a4a1a',
    waveColor: '#00ff41',
    alertColor: '#ff4444',
    textColor: '#ffffff',
    gridMajorColor: '#2a5a2a',
    sweepLineColor: '#ffff00'
  });

  // 获取LTTB压缩数据 - 稳定化函数引用
  const fetchLttbData = useCallback(async () => {
    const startTime = performance.now();
    try {
      const compressedData: LttbDataPoint[] = await invoke('get_lttb_compressed_data');
      const fetchTime = performance.now() - startTime;

      debugInfoRef.current.dataFetchCount++;
      debugInfoRef.current.lastDataFetch = Date.now();
      debugInfoRef.current.dataProcessingTime = fetchTime;

      if (compressedData.length > 0) {
        setEcgData(compressedData);
        setIsConnected(true);

        const newStats = {
          points: compressedData.length,
          compressionRatio: compressedData.length > 0 ? 1000 / compressedData.length : 0
        };
        setDataStats(newStats);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      setIsConnected(false);
    }
  }, []);

  // 绘制函数 - 使用useCallback稳定引用
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const config = configRef.current;
    ctx.strokeStyle = config.gridMajorColor;
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.strokeStyle = config.gridColor;
    ctx.lineWidth = 0.5;
    for (let y = 0; y <= h; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.strokeStyle = config.gridMajorColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, []);

  const drawECGWave = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, data: LttbDataPoint[]) => {
    if (data.length < 2) {
      return;
    }

    const drawStartTime = performance.now();
    const config = configRef.current;
    const pixelsPerSecond = scrollSpeed;
    const centerY = h / 2;
    const amplitudeScale = h * 0.3;

    ctx.strokeStyle = config.waveColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let pathStarted = false;
    let visiblePoints = 0;

    if (data.length === 0) return;

    const dataStartTime = Math.min(...data.map(p => p.x));
    const dataEndTime = Math.max(...data.map(p => p.x));
    const dataTimeSpan = dataEndTime - dataStartTime;
    const useRelativeTime = dataTimeSpan < timeWindow * 1000;

    for (let i = 0; i < data.length - 1; i++) {
      const point = data[i];
      const nextPoint = data[i + 1];
      let x1, x2;
      if (useRelativeTime) {
        const relativePos1 = (point.x - dataStartTime) / dataTimeSpan;
        const relativePos2 = (nextPoint.x - dataStartTime) / dataTimeSpan;
        x1 = relativePos1 * w;
        x2 = relativePos2 * w;
      } else {
        const currentTime = Date.now();
        const timeWindowMs = timeWindow * 1000;
        const startTime = currentTime - timeWindowMs;
        if (point.x < startTime) continue;
        const relativeTime = (point.x - startTime) / 1000;
        const nextRelativeTime = (nextPoint.x - startTime) / 1000;
        x1 = relativeTime * pixelsPerSecond;
        x2 = nextRelativeTime * pixelsPerSecond;
      }
      const y1 = centerY - (point.y * amplitudeScale);
      const y2 = centerY - (nextPoint.y * amplitudeScale);
      if ((x1 >= -50 && x1 <= w + 50) || (x2 >= -50 && x2 <= w + 50)) {
        if (!pathStarted) {
          ctx.moveTo(x1, y1);
          pathStarted = true;
        }
        ctx.lineTo(x2, y2);
        visiblePoints++;
      }
    }
    ctx.stroke();

    const drawTime = performance.now() - drawStartTime;
    debugInfoRef.current.renderTime = drawTime;
  }, [scrollSpeed, timeWindow]);

  const drawSweepLine = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, scrollOffset: number) => {
    const config = configRef.current;
    const sweepX = (scrollOffset % w);
    ctx.strokeStyle = config.sweepLineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sweepX, 0);
    ctx.lineTo(sweepX, h);
    ctx.stroke();
    const clearWidth = 20;
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(sweepX + 2, 0, clearWidth, h);
  }, []);

  const drawStatusInfo = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number,
    connectionStatus: boolean, stats: typeof dataStats, vitals: typeof vitalSigns,
    _loadingStatus: boolean, errorMsg: string | null) => {
    const config = configRef.current;
    ctx.fillStyle = config.textColor;
    ctx.font = '12px Arial';
    const statusText = connectionStatus ? '已连接' : '未连接';
    const statusColor = connectionStatus ? config.waveColor : config.alertColor;
    ctx.fillStyle = statusColor;
    ctx.fillText(`状态: ${statusText}`, 10, 20);
    ctx.fillStyle = config.textColor;
    ctx.fillText(`数据点: ${stats.points}`, 10, 40);
    ctx.fillText(`压缩比: ${stats.compressionRatio.toFixed(1)}:1`, 10, 60);
    if (vitals) {
      ctx.fillText(`心率: ${vitals.heart_rate.toFixed(1)} bpm`, 10, 80);
      ctx.fillText(`RR间隔: ${vitals.rr_interval.toFixed(3)} s`, 10, 100);
    }
    ctx.fillText(`FPS: ${debugInfoRef.current.fps}`, 10, 120);
    ctx.fillText(`渲染时间: ${debugInfoRef.current.renderTime.toFixed(1)}ms`, 10, 140);
    ctx.fillText(`滚动速度: ${scrollSpeed} px/s`, 10, h - 60);
    ctx.fillText(`时间窗口: ${timeWindow} s`, 10, h - 40);
    if (errorMsg) {
      ctx.fillStyle = config.alertColor;
      ctx.fillText(`错误: ${errorMsg}`, w - 200, h - 20);
    }
  }, [scrollSpeed, timeWindow]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLttbData();
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, [fetchLttbData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const animate = (currentTime: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      debugInfoRef.current.frameCount++;
      if (currentTime - debugInfoRef.current.lastFpsUpdate >= 1000) {
        debugInfoRef.current.fps = Math.round(debugInfoRef.current.frameCount * 1000 / (currentTime - debugInfoRef.current.lastFpsUpdate));
        debugInfoRef.current.frameCount = 0;
        debugInfoRef.current.lastFpsUpdate = currentTime;
      }
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      scrollOffsetRef.current += (scrollSpeed * deltaTime) / 1000;
      const renderStartTime = performance.now();
      ctx.fillStyle = configRef.current.bgColor;
      ctx.fillRect(0, 0, width, height);
      drawGrid(ctx, width, height);
      drawECGWave(ctx, width, height, ecgData);
      drawSweepLine(ctx, width, height, scrollOffsetRef.current);
      drawStatusInfo(ctx, width, height, isConnected, dataStats, vitalSigns, isLoading, error);
      debugInfoRef.current.renderTime = performance.now() - renderStartTime;
      animationRef.current = requestAnimationFrame(animate);
    };
    lastTimeRef.current = performance.now();
    debugInfoRef.current.lastFpsUpdate = performance.now();
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, scrollSpeed, drawGrid, drawECGWave, drawSweepLine, drawStatusInfo]);

  useEffect(() => {
    // 数据变化监听，不再打印日志
  }, [vitalSigns]);

  useEffect(() => {
    // 连接状态变化监听，不再打印日志
  }, [isConnected, ecgData.length, dataStats.compressionRatio]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg p-2">
      <div className="border border-gray-600 rounded overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ backgroundColor: configRef.current.bgColor }}
        />
      </div>
      <div className="mt-1 flex justify-between items-center text-xs text-gray-400">
        <div className={`${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          {isConnected ? '已连接' : '未连接'}
        </div>
        {vitalSigns && (
          <div className="text-green-400">
            {vitalSigns.heart_rate.toFixed(0)} bpm
          </div>
        )}
      </div>
    </div>
  );
};

export default ECG_Canvas;
