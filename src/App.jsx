import { useState } from 'react'
import BottomNav from './components/BottomNav'
import PageHome from './components/PageHome'
import PageBus from './components/PageBus'
import PageNews from './components/PageNews'
import PageOttelut from './components/PageOttelut'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('turku-app.active-tab') || 'home'
  )
  const [busEditingInitial, setBusEditingInitial] = useState(false)

  function handleTabChange(tab) {
    setActiveTab(tab)
    localStorage.setItem('turku-app.active-tab', tab)
  }

  function goToBusEdit() {
    handleTabChange('bus')
    setBusEditingInitial(true)
  }

  return (
    <>
      <main className="app-page">
        {activeTab === 'home' && <PageHome onNavigate={handleTabChange} onGotoBusEdit={goToBusEdit} />}
        {activeTab === 'bus' && <PageBus initialEditing={busEditingInitial} onConsumeInitial={() => setBusEditingInitial(false)} />}
        {activeTab === 'news' && <PageNews />}
        {activeTab === 'tps' && <PageOttelut />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  )
}
