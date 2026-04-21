import { useState } from 'react'
import BottomNav from './components/BottomNav'
import PageHome from './components/PageHome'
import PageBus from './components/PageBus'
import PageNews from './components/PageNews'
import PageTPS from './components/PageTPS'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('turku-app.active-tab') || 'home'
  )

  function handleTabChange(tab) {
    setActiveTab(tab)
    localStorage.setItem('turku-app.active-tab', tab)
  }

  return (
    <>
      <main className="app-page">
        {activeTab === 'home' && <PageHome onNavigate={handleTabChange} />}
        {activeTab === 'bus' && <PageBus />}
        {activeTab === 'news' && <PageNews />}
        {activeTab === 'tps' && <PageTPS />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  )
}
