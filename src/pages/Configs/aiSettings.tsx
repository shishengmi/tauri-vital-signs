"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAISettings } from "@/hooks/useAISettings";
import type { AISettings as AISettingsType } from "@/hooks/useAISettings";

/* ------------------------------------------------------------ */
/* Provider 类型                                                 */
/* ------------------------------------------------------------ */
type ProviderType = "openai" | "ollama" | "lmstudio";

/* ------------------------------------------------------------ */
/* 组件                                                         */
/* ------------------------------------------------------------ */
const AISettings = () => {
  const {
    settings,
    updateSettings,
    testConnection,
    isLoading,
    refreshModels,
    inited,
  } = useAISettings();

  /* 单个 Provider 的测试状态 */
  const [testStatus, setTestStatus] = useState<
    Record<
      ProviderType,
      { isLoading: boolean; success: boolean | null; message: string }
    >
  >({
    openai: { isLoading: false, success: null, message: "" },
    ollama: { isLoading: false, success: null, message: "" },
    lmstudio: { isLoading: false, success: null, message: "" },
  });

  /* --------------------- 通用字段更新 --------------------- */
  const handleApiKeyChange = (provider: ProviderType, value: string) => {
    updateSettings({
      ...settings,
      [provider]: { ...settings[provider], apiKey: value },
    });
  };

  const handleModelChange = (provider: ProviderType, value: string) => {
    updateSettings({
      ...settings,
      [provider]: { ...settings[provider], selectedModel: value },
    });
  };

  const handleApiUrlChange = (provider: ProviderType, value: string) => {
    updateSettings({
      ...settings,
      [provider]: { ...settings[provider], apiUrl: value },
    });
  };

  const handleProviderToggle = (
    provider: ProviderType,
    enabled: boolean,
  ) => {
    updateSettings({
      ...settings,
      activeProvider: enabled
        ? provider
        : provider === settings.activeProvider
        ? ""
        : settings.activeProvider,
    });
  };

  /* --------------------- 测试连接 ------------------------- */
  const handleTestConnection = async (provider: ProviderType) => {
    setTestStatus((prev) => ({
      ...prev,
      [provider]: {
        isLoading: true,
        success: null,
        message: "正在测试连接...",
      },
    }));
    try {
      const result = await testConnection(provider);
      setTestStatus((prev) => ({
        ...prev,
        [provider]: {
          isLoading: false,
          success: result?.success ?? false,
          message: result?.success
            ? `连接成功! ${result.message || ""}`
            : `连接失败: ${result.message || ""}`,
        },
      }));
    } catch (error: any) {
      setTestStatus((prev) => ({
        ...prev,
        [provider]: {
          isLoading: false,
          success: false,
          message: `连接失败: ${error?.message || "未知错误"}`,
        },
      }));
    }
  };

  /* --------------------- 刷新模型列表 --------------------- */
  const handleRefreshModels = async (provider: ProviderType) => {
    try {
      await refreshModels(provider);
      toast("模型列表已更新", {
        description: `${provider} 的模型列表已成功刷新`,
      });
    } catch (error: any) {
      toast("刷新失败", {
        description: `无法刷新 ${provider} 的模型列表: ${
          error?.message || "未知错误"
        }`,
      });
    }
  };

  /* --------------------- 首次加载 ------------------------- */
  if (!inited) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        加载 AI 配置中...
      </div>
    );
  }

  /* ======================================================== */
  /* 渲染                                                     */
  /* ======================================================== */
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">AI服务设置</h2>
        <p className="text-muted-foreground mb-6">
          配置AI服务提供商、API密钥和模型选择
        </p>
      </div>

      {/* ------------- Provider Tabs ------------- */}
      <Tabs
        defaultValue={settings.activeProvider || "openai"}
        className="w-full"
      >
        <TabsList className="grid w-[400px] grid-cols-3">
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="ollama">Ollama</TabsTrigger>
          <TabsTrigger value="lmstudio">LM Studio</TabsTrigger>
        </TabsList>

        {/* ---------- Provider 表单渲染 ---------- */}
        {(["openai", "ollama", "lmstudio"] as ProviderType[]).map(
          (provider) => {
            const providerSettings = settings[provider];
            return (
              <TabsContent key={provider} value={provider}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        {provider === "openai"
                          ? "OpenAI 设置"
                          : provider === "ollama"
                          ? "Ollama 设置"
                          : "LM Studio 设置"}
                      </CardTitle>

                      {/* --------- 启用开关 --------- */}
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${provider}-active`}
                          checked={settings.activeProvider === provider}
                          onCheckedChange={(checked) =>
                            handleProviderToggle(provider, checked)
                          }
                        />
                        <Label htmlFor={`${provider}-active`}>启用</Label>
                      </div>
                    </div>
                    <CardDescription>
                      {provider === "openai"
                        ? "配置OpenAI API密钥和模型"
                        : provider === "ollama"
                        ? "配置本地Ollama服务"
                        : "配置本地LM Studio服务"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* OpenAI 专属：API Key */}
                    {provider === "openai" && (
                      <div className="space-y-2">
                        <Label htmlFor="openai-api-key">API密钥</Label>
                        <Input
                          id="openai-api-key"
                          type="password"
                          value={
                            (providerSettings as AISettingsType["openai"])
                              .apiKey
                          }
                          onChange={(e) =>
                            handleApiKeyChange("openai", e.target.value)
                          }
                          placeholder="sk-..."
                        />
                      </div>
                    )}

                    {/* API URL */}
                    <div className="space-y-2">
                      <Label htmlFor={`${provider}-api-url`}>
                        API URL {provider === "openai" ? "(可选)" : ""}
                      </Label>
                      <Input
                        id={`${provider}-api-url`}
                        value={providerSettings.apiUrl}
                        onChange={(e) =>
                          handleApiUrlChange(provider, e.target.value)
                        }
                        placeholder={
                          provider === "openai"
                            ? "https://api.openai.com/v1"
                            : provider === "ollama"
                            ? "http://localhost:11434"
                            : "http://localhost:1234/v1"
                        }
                      />
                    </div>

                    {/* 模型选择 */}
                    <div className="space-y-2">
                      <Label htmlFor={`${provider}-model`}>模型</Label>
                      <Select
                        value={providerSettings.selectedModel}
                        onValueChange={(value) =>
                          handleModelChange(provider, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择模型" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerSettings.availableModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>

                  {/* Footer: 测试连接 & 刷新模型 */}
                  <CardFooter className="flex justify-between">
                    <div className="flex-1">
                      {testStatus[provider].isLoading &&
                        settings.activeProvider === provider && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {testStatus[provider].message}
                          </div>
                        )}

                      {!testStatus[provider].isLoading &&
                        testStatus[provider].success !== null &&
                        settings.activeProvider === provider && (
                          <div
                            className={`flex items-center text-sm ${
                              testStatus[provider].success
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {testStatus[provider].success ? (
                              <Check className="mr-2 h-4 w-4" />
                            ) : (
                              <X className="mr-2 h-4 w-4" />
                            )}
                            {testStatus[provider].message}
                          </div>
                        )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshModels(provider)}
                        disabled={
                          isLoading ||
                          (provider === "openai" &&
                            !settings.openai.apiKey) ||
                          (provider !== "openai" &&
                            !providerSettings.apiUrl)
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        刷新模型
                      </Button>
                      <Button
                        onClick={() => handleTestConnection(provider)}
                        disabled={
                          testStatus[provider].isLoading ||
                          (provider === "openai" &&
                            !settings.openai.apiKey) ||
                          (provider !== "openai" &&
                            !providerSettings.apiUrl)
                        }
                      >
                        测试连接
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            );
          },
        )}
      </Tabs>

      {/* ------------- 通用设置卡片：深度思考开关 ------------- */}
      <Card>
        <CardHeader>
          <CardTitle>通用设置</CardTitle>
          <CardDescription>
            控制是否显示模型的推理过程（深度思考 &lt;think&gt; 块）
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <Label htmlFor="enable-reasoning">启用深度思考显示</Label>
          <Switch
            id="enable-reasoning"
            checked={settings.enableReasoning}
            onCheckedChange={(checked) =>
              updateSettings({ ...settings, enableReasoning: checked })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AISettings;
