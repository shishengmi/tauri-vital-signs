import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface SerialPort {
  name: string;
  description: string;
}

interface SerialStatus {
  type: 'Connected' | 'Disconnected' | 'Error';
  data?: string;
}

interface ReceivedData {
  timestamp: string;
  data: string;
}

export default function SerialDebug() {
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<string>('115200');
  const [status, setStatus] = useState<SerialStatus>({ type: 'Disconnected' });
  const [testing, setTesting] = useState(false);
  const [sendText, setSendText] = useState('');
  const [receivedData, setReceivedData] = useState<ReceivedData[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [displayFormat, setDisplayFormat] = useState<'text' | 'hex'>('text');
  const receiveAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 获取可用串口列表
    const fetchPorts = async () => {
      try {
        const availablePorts: [string, string][] = await invoke('get_available_ports');
        setPorts(availablePorts.map(([name, description]) => ({ name, description })));
      } catch (error) {
        console.error('获取串口列表失败:', error);
      }
    };

    fetchPorts();

    // 定期检查串口状态
    const checkStatus = async () => {
      try {
        const serialStatus: SerialStatus = await invoke('get_serial_status');
        setStatus(serialStatus);
      } catch (error) {
        console.error('获取串口状态失败:', error);
      }
    };

    const statusInterval = setInterval(checkStatus, 1000);
    return () => clearInterval(statusInterval);
  }, []);

  // 模拟接收数据
  useEffect(() => {
    if (status.type === 'Connected') {
      const dataInterval = setInterval(() => {
        // 获取最新数据
        invoke<any[]>('get_latest_data', { count: 1 }).then((data) => {
          if (data && data.length > 0) {
            const now = new Date();
            const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
            
            // 将数据转换为字符串
            const dataStr = JSON.stringify(data[0]);
            
            setReceivedData(prev => {
              // 保持最多显示100条数据
              const newData = [...prev, { timestamp, data: dataStr }];
              if (newData.length > 100) {
                return newData.slice(-100);
              }
              return newData;
            });
          }
        }).catch(err => {
          console.error('获取数据失败:', err);
        });
      }, 500); // 每500ms获取一次数据
      
      return () => clearInterval(dataInterval);
    }
  }, [status]);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && receiveAreaRef.current) {
      receiveAreaRef.current.scrollTop = receiveAreaRef.current.scrollHeight;
    }
  }, [receivedData, autoScroll]);

  const handleTestConnection = async () => {
    if (!selectedPort) return;
    
    setTesting(true);
    try {
      await invoke('test_serial_connection', {
        portName: selectedPort,
        baudRate: parseInt(baudRate),
      });
      toast.success("串口连接测试成功！");
    } catch (error) {
      console.error('测试串口连接失败:', error);
      toast.error(`串口连接测试失败: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    try {
      await invoke('connect_serial', {
        portName: selectedPort,
        baudRate: parseInt(baudRate),
      });
    } catch (error) {
      console.error('连接串口失败:', error);
      toast.error(`连接串口失败: ${error}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await invoke('disconnect_serial');
      // 清空接收区
      setReceivedData([]);
    } catch (error) {
      console.error('断开串口失败:', error);
      toast.error(`断开串口失败: ${error}`);
    }
  };

  const handleSend = async () => {
    if (!sendText.trim() || status.type !== 'Connected') return;
    
    try {
      // 调用后端发送数据API
      await invoke('send_serial_data', { data: sendText });
      
      // 记录到接收区
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      
      setReceivedData(prev => {
        const newData = [...prev, { timestamp, data: `[发送] ${sendText}` }];
        if (newData.length > 100) {
          return newData.slice(-100);
        }
        return newData;
      });
      
      // 清空发送区
      setSendText('');
      toast.success("数据发送成功");
    } catch (error) {
      console.error('发送数据失败:', error);
      toast.error(`发送数据失败: ${error}`);
    }
  };

  const handleClearReceive = () => {
    setReceivedData([]);
    toast("已清空接收区");
  };

  // 将数据转换为十六进制显示
  const dataToHex = (data: string) => {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const hex = data.charCodeAt(i).toString(16).padStart(2, '0');
      result += hex + ' ';
    }
    return result.toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">串口调试助手</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左侧：串口配置 */}
        <Card>
          <CardHeader>
            <CardTitle>串口配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">串口选择</label>
              <Select value={selectedPort} onValueChange={setSelectedPort}>
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
              <Select value={baudRate} onValueChange={setBaudRate}>
                <SelectTrigger>
                  <SelectValue placeholder="选择波特率" />
                </SelectTrigger>
                <SelectContent>
                  {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map((rate) => (
                    <SelectItem key={rate} value={rate.toString()}>
                      {rate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                disabled={!selectedPort || testing || status.type === 'Connected'}
                size="sm"
              >
                {testing ? '测试中...' : '测试连接'}
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!selectedPort || status.type === 'Connected'}
                size="sm"
              >
                连接
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={status.type !== 'Connected'}
                variant="destructive"
                size="sm"
              >
                断开连接
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 右侧：发送区域 */}
        <Card>
          <CardHeader>
            <CardTitle>发送数据</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={sendText} 
              onChange={(e) => setSendText(e.target.value)}
              placeholder="输入要发送的数据..."
              rows={5}
              disabled={status.type !== 'Connected'}
            />
            <div className="flex justify-between">
              <div className="space-x-2">
                <Button 
                  onClick={handleSend} 
                  disabled={!sendText.trim() || status.type !== 'Connected'}
                >
                  发送
                </Button>
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSendText('')}
                  disabled={!sendText.trim()}
                >
                  清空
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部：接收区域 */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>接收数据</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="autoScroll" 
                  checked={autoScroll} 
                  onChange={(e) => setAutoScroll(e.target.checked)} 
                />
                <label htmlFor="autoScroll" className="text-sm">自动滚动</label>
              </div>
              <Tabs value={displayFormat} onValueChange={(v) => setDisplayFormat(v as 'text' | 'hex')}>
                <TabsList>
                  <TabsTrigger value="text">文本</TabsTrigger>
                  <TabsTrigger value="hex">十六进制</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" onClick={handleClearReceive} size="sm">
                清空
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={receiveAreaRef}
              className="h-[300px] overflow-y-auto border rounded p-2 font-mono text-sm"
            >
              {receivedData.map((item, index) => (
                <div key={index} className="border-b border-gray-100 py-1">
                  <span className="text-gray-500 mr-2">[{item.timestamp}]</span>
                  <span>
                    {displayFormat === 'hex' ? dataToHex(item.data) : item.data}
                  </span>
                </div>
              ))}
              {receivedData.length === 0 && (
                <div className="text-gray-400 text-center mt-4">暂无数据</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}