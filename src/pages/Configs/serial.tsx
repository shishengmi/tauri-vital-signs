import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SerialPort {
  name: string;
  description: string;
}

interface SerialStatus {
  type: 'Connected' | 'Disconnected' | 'Error';
  data?: string;
}

export default function SerialConfig() {
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<string>('115200');
  const [status, setStatus] = useState<SerialStatus>({ type: 'Disconnected' });
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [dataSourceType, setDataSourceType] = useState<string>('real');

  const appendLog = (msg: string) => {
    setLogs((prev) => [
      ...prev.slice(-200), // 最多保留200条，避免无限增长
      `[${new Date().toLocaleTimeString()}] ${msg}`
    ]);
  };

  useEffect(() => {
    const fetchPorts = async () => {
      appendLog('请求串口列表...');
      try {
        const availablePorts: [string, string][] = await invoke('get_available_ports');
        setPorts(availablePorts.map(([name, description]) => ({ name, description })));
        appendLog(`获取到 ${availablePorts.length} 个串口`);
      } catch (error) {
        appendLog('获取串口列表失败: ' + error);
        console.error('获取串口列表失败:', error);
      }
    };

    fetchPorts();

    const checkStatus = async () => {
      try {
        const serialStatus: SerialStatus = await invoke('get_serial_status');
        setStatus(serialStatus);
      } catch (error) {
        appendLog('获取串口状态失败: ' + error);
        console.error('获取串口状态失败:', error);
      }
    };

    // 获取当前数据源类型
    const fetchDataSourceType = async () => {
      try {
        const sourceType: string = await invoke('get_data_source_type');
        setDataSourceType(sourceType);
        appendLog(`当前数据源类型: ${sourceType === 'real' ? '真实串口' : '测试模拟'}`);
      } catch (error) {
        appendLog('获取数据源类型失败: ' + error);
        console.error('获取数据源类型失败:', error);
      }
    };

    fetchDataSourceType();
    const statusInterval = setInterval(checkStatus, 100);
    return () => clearInterval(statusInterval);
    // eslint-disable-next-line
  }, []);

  const handleTestConnection = async () => {
    if (!selectedPort) return;
    setTesting(true);
    appendLog(`准备测试串口连接: ${selectedPort} @ ${baudRate}`);
    try {
      await invoke('test_serial_connection', {
        portName: selectedPort,
        baudRate: parseInt(baudRate),
      });
      appendLog('串口连接测试成功！');
      alert('串口连接测试成功！');
    } catch (error) {
      appendLog('测试串口连接失败: ' + error);
      console.error('测试串口连接失败:', error);
      alert(`串口连接测试失败: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (dataSourceType === 'real' && !selectedPort) {
      appendLog('真实模式下需要选择串口才能连接');
      return;
    }
    appendLog(`尝试连接${dataSourceType === 'real' ? `串口: ${selectedPort} @ ${baudRate}` : '测试数据生成器'}`);
    try {
      await invoke('connect_serial', {
        portName: selectedPort,
        baudRate: parseInt(baudRate),
      });
      appendLog(`连接命令已发送`);
    } catch (error) {
      appendLog('连接失败: ' + error);
      console.error('连接失败:', error);
    }
  };

  const handleDisconnect = async () => {
    appendLog('尝试断开串口...');
    try {
      await invoke('disconnect_serial');
      appendLog('断开命令已发送');
    } catch (error) {
      appendLog('断开串口失败: ' + error);
      console.error('断开串口失败:', error);
    }
  };

  const handleDataSourceTypeChange = async (value: string) => {
    appendLog(`切换数据源类型: ${value === 'real' ? '真实串口' : '测试模拟'}`);
    try {
      await invoke('set_data_source_type', { sourceType: value });
      setDataSourceType(value);
    } catch (error) {
      appendLog('设置数据源类型失败: ' + error);
      console.error('设置数据源类型失败:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">串口设置</h2>
      
      <div className="space-y-4">
        {/* 数据源类型选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">数据源类型</label>
          <RadioGroup 
            value={dataSourceType} 
            onValueChange={handleDataSourceTypeChange}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="real" id="real" />
              <Label htmlFor="real">真实串口数据</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="test" id="test" />
              <Label htmlFor="test">测试模拟数据</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">串口选择</label>
          <Select value={selectedPort} onValueChange={(value) => {
            setSelectedPort(value);
            appendLog(`选择串口: ${value}`);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="选择串口" />
            </SelectTrigger>
            <SelectContent>
              {ports.map((port) => (
                <SelectItem key={port.name} value={port.name}>
                  {port.name} - {port.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">波特率</label>
          <Input
            type="number"
            value={baudRate}
            onChange={(e) => {
              setBaudRate(e.target.value);
              appendLog(`修改波特率: ${e.target.value}`);
            }}
            placeholder="输入波特率"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">连接状态</label>
          <div className="text-sm">
            {status.type === 'Connected' && (
              <span className="text-green-500">已连接到 {status.data}</span>
            )}
            {status.type === 'Disconnected' && (
              <span className="text-gray-500">未连接</span>
            )}
            {status.type === 'Error' && (
              <span className="text-red-500">错误: {status.data}</span>
            )}
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={handleTestConnection}
            disabled={!selectedPort || testing || status.type === 'Connected' || dataSourceType !== 'real'}
          >
            {testing ? '测试中...' : '测试连接'}
          </Button>
          <Button
            onClick={handleConnect}
            disabled={(dataSourceType === 'real' && !selectedPort) || status.type === 'Connected'}
          >
            连接
          </Button>
          <Button
            onClick={handleDisconnect}
            disabled={status.type !== 'Connected'}
            variant="destructive"
          >
            断开连接
          </Button>
        </div>

        {/* 日志输出面板 */}
        <div className="bg-black/80 rounded-xl p-4 mt-4 text-xs text-gray-100 max-h-52 overflow-auto font-mono">
          <div>调试输出：</div>
          {logs.length === 0 ? (
            <div className="text-gray-400">无</div>
          ) : (
            logs.map((msg, idx) => (
              <div key={idx}>{msg}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}