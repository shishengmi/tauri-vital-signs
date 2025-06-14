import React, { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 定义LTTB数据点接口
interface LttbDataPoint {
  x: number;
  y: number;
}

// 组件属性接口
interface ECGCanvasProps {
  className?: string;
  refreshInterval?: number;
  pointSpace?: number;
  refreshBlockWidth?: number;
  minValue?: number;
  maxValue?: number;
}

/**
 * ECG心电图画布组件
 * 参考ECG.vue实现，使用双画布分层设计
 */
const ECG_Canvas: React.FC<ECGCanvasProps> = ({
  className = '',
  refreshInterval = 50,
  pointSpace = 2,
  refreshBlockWidth = 20,
  minValue = 110000,
  maxValue = 160000
}) => {
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const ekgCanvasRef = useRef<HTMLCanvasElement>(null);
  const sweepCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heartRate, setHeartRate] = useState(70);
  
  // ECG数据队列
  const ecgDataQueue = useRef<number[]>([]);
  const offsetRef = useRef(2);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sweepPositionRef = useRef(0);

  // 设置画布尺寸
  const setCanvasSize = useCallback(() => {
    if (!canvasRootRef.current) return;
    const { width, height } = canvasRootRef.current.getBoundingClientRect();
    setCanvasWidth(Math.floor(width));
    setCanvasHeight(Math.floor(height));
  }, []);

  // 绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#0a4a2a';
    ctx.lineWidth = 1;
    const cellWidth = 40;
    const cellHeight = 20;
    const width = canvasWidth;
    const height = canvasHeight;
    const cols = Math.floor(width / cellWidth);
    const rows = Math.floor(height / cellHeight);

    // 绘制垂直线
    for (let col = 0; col <= cols; col++) {
      let x = col * cellWidth;
      if (col === cols) {
        x -= cellWidth * 0.3;
      }
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 绘制水平线
    for (let row = 0; row <= rows; row++) {
      let y = row * cellHeight;
      if (row === rows) {
        y -= cellHeight * 0.3;
      }
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.stroke();
  }, [canvasWidth, canvasHeight]);

  // 绘制扫描线
  const drawSweepLine = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sweepPositionRef.current, 0);
    ctx.lineTo(sweepPositionRef.current, canvasHeight);
    ctx.stroke();
    
    // 更新扫描线位置
    sweepPositionRef.current += 2;
    if (sweepPositionRef.current > canvasWidth) {
      sweepPositionRef.current = 0;
    }
  }, [canvasWidth, canvasHeight]);

  // 绘制ECG数据点
  const drawEKGPoint = useCallback((ctx: CanvasRenderingContext2D, num: number) => {
    const canvasRange = canvasHeight;
    const maxOffset = canvasWidth / pointSpace;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;

    // 限制数值范围
    if (num > maxValue) num = maxValue;
    if (num < minValue) num = minValue;

    // 将num值从[minValue, maxValue]范围映射到[canvasHeight, 0]范围
    const scaledNum = ((num - minValue) / (maxValue - minValue)) * canvasRange;
    // Y坐标调整，使数值小的在画布下方，数值大的在画布上方
    const yPos = canvasHeight - scaledNum;

    // 清除即将更新的区域
    ctx.clearRect(offsetRef.current * pointSpace, 0, refreshBlockWidth, canvasHeight);
    offsetRef.current += 4;
    ctx.lineTo(offsetRef.current * pointSpace, yPos);
    ctx.stroke();

    // 重置偏移量
    if (offsetRef.current > maxOffset) {
      offsetRef.current = 2;
      ctx.beginPath();
    }
  }, [canvasHeight, canvasWidth, pointSpace, refreshBlockWidth, minValue, maxValue]);

  // 获取ECG数据
  const fetchECGData = useCallback(async () => {
    try {
      const data = await invoke<LttbDataPoint[]>('get_lttb_compressed_data');
      if (data && data.length > 0) {
        // 将LTTB数据转换为原始ECG数值
        const rawValues = data.map(point => {
          // 将归一化的y值(-1到1)转换回原始范围
          return minValue + (point.y + 1) * (maxValue - minValue) / 2;
        });
        ecgDataQueue.current.push(...rawValues);
        setError(null);
        
        // 模拟心率计算
        setHeartRate(Math.floor(Math.random() * 20) + 60);
      }
    } catch (err) {
      console.error('获取ECG数据失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    }
  }, [minValue, maxValue]);

  // 处理窗口大小变化
  const handleResize = useCallback(() => {
    setCanvasSize();
    const gridCtx = gridCanvasRef.current?.getContext('2d');
    const ekgCtx = ekgCanvasRef.current?.getContext('2d');
    
    setTimeout(() => {
      if (!gridCtx || !ekgCtx) return;
      gridCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      ekgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawGrid(gridCtx);
    }, 0);
  }, [setCanvasSize, canvasWidth, canvasHeight, drawGrid]);

  // 开始/停止监测
  const toggleMonitoring = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  // 清空数据
  const clearData = useCallback(() => {
    ecgDataQueue.current = [];
    offsetRef.current = 2;
    const ekgCtx = ekgCanvasRef.current?.getContext('2d');
    if (ekgCtx) {
      ekgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight]);

  // 初始化画布
  useEffect(() => {
    setCanvasSize();
    const gridCtx = gridCanvasRef.current?.getContext('2d');
    const ekgCtx = ekgCanvasRef.current?.getContext('2d');

    setTimeout(() => {
      if (!gridCtx || !ekgCtx) return;
      drawGrid(gridCtx);
    }, 0);

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [drawGrid, handleResize]);

  // 数据获取定时器
  useEffect(() => {
    if (!isRunning) return;

    const fetchInterval = setInterval(fetchECGData, 1000); // 每秒获取一次新数据
    return () => clearInterval(fetchInterval);
  }, [isRunning, fetchECGData]);

  // ECG绘制定时器
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const ekgCtx = ekgCanvasRef.current?.getContext('2d');
    const sweepCtx = sweepCanvasRef.current?.getContext('2d');
    if (!ekgCtx || !sweepCtx) return;

    intervalRef.current = setInterval(() => {
      if (ecgDataQueue.current.length > 0) {
        const num = ecgDataQueue.current.shift() as number;
        drawEKGPoint(ekgCtx, num);
      }
      // 绘制扫描线
      drawSweepLine(sweepCtx);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, refreshInterval, drawEKGPoint, drawSweepLine]);

  return (
    <div className={`w-full h-full bg-gray-900 text-green-400 font-mono ${className}`}>
      <div className="flex h-full">
        {/* 左侧参数面板 */}
        <div className="w-48 bg-gray-800 border-r border-gray-600 p-4 flex flex-col justify-between">
          {/* 上部参数 */}
          <div className="space-y-4">
            <div className="text-orange-400">
              <div className="text-sm">体征参数</div>
              <div className="text-xs mt-1">数据源: 0</div>
              <div className="text-xs">区间值: 0.1</div>
            </div>
            
            <div className="text-green-400">
              <div className="text-sm">FPS: 165</div>
              <div className="text-xs mt-1">速度时间: 0.3ms</div>
            </div>
            
            <div className="text-green-400">
              <div className="text-sm">测试速度: 100 px/s</div>
              <div className="text-xs mt-1">时间周期: 10 s</div>
            </div>
          </div>
          
          {/* 控制按钮 */}
          <div className="space-y-2">
            <button
              onClick={toggleMonitoring}
              className={`w-full px-3 py-2 text-sm rounded ${
                isRunning 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunning ? '停止' : '开始'}
            </button>
            
            <button
              onClick={clearData}
              className="w-full px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              清空
            </button>
          </div>
        </div>

        {/* 主显示区域 */}
        <div className="flex-1 flex flex-col">
          {/* ECG画布容器 */}
          <div 
            ref={canvasRootRef}
            className="flex-1 relative bg-black border border-gray-600"
          >
            {/* 网格画布 */}
            <canvas
              ref={gridCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute left-0 top-0"
            />
            
            {/* ECG数据画布 */}
            <canvas
              ref={ekgCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute left-0 top-0"
            />
            
            {/* 扫描线画布 */}
            <canvas
              ref={sweepCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute left-0 top-0"
            />
            
            {/* 错误提示 */}
            {error && (
              <div className="absolute top-4 left-4 bg-red-900 border border-red-700 rounded px-3 py-2">
                <p className="text-red-300 text-sm">错误: {error}</p>
              </div>
            )}
          </div>

          {/* 底部状态栏 */}
          <div className="h-16 bg-gray-800 border-t border-gray-600 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <span className={`text-lg font-bold ${
                isRunning ? 'text-green-400' : 'text-red-400'
              }`}>
                {isRunning ? '已连接' : '未连接'}
              </span>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">
                {heartRate} bpm
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ECG_Canvas;