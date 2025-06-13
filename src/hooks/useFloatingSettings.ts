import { useState } from 'react'

export function useFloatingSettings() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const openSettings = () => setIsSettingsOpen(true)
  const closeSettings = () => setIsSettingsOpen(false)
  const toggleSettings = () => setIsSettingsOpen(!isSettingsOpen)

  return {
    isSettingsOpen,
    openSettings,
    closeSettings,
    toggleSettings
  }
}