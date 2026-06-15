import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DEV_PRO_KEY = 'dialed_dev_pro_override'

interface DevProContextType {
  devProOverride: boolean
  setDevProOverride: (val: boolean) => void
}

const DevProContext = createContext<DevProContextType>({ devProOverride: false, setDevProOverride: () => {} })

export function DevProProvider({ children }: { children: ReactNode }) {
  const [devProOverride, setDevProOverrideState] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(DEV_PRO_KEY).then(v => {
      if (v === '1') setDevProOverrideState(true)
    }).catch(() => {})
  }, [])

  function setDevProOverride(val: boolean) {
    setDevProOverrideState(val)
    AsyncStorage.setItem(DEV_PRO_KEY, val ? '1' : '0').catch(() => {})
  }

  return (
    <DevProContext.Provider value={{ devProOverride, setDevProOverride }}>
      {children}
    </DevProContext.Provider>
  )
}

export function useDevPro() {
  return useContext(DevProContext)
}
