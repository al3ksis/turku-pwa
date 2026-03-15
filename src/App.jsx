import BusWidget from './components/BusWidget'
import WeatherWidget from './components/WeatherWidget'
import TPSWidget from './components/TPSWidget'
import NewsWidget from './components/NewsWidget'
import './App.css'

export default function App() {
  return (
    <main>
      <header>
        <h1>Turku</h1>
      </header>

      <WeatherWidget />
      <BusWidget />
      <TPSWidget />
      <NewsWidget />
    </main>
  )
}
