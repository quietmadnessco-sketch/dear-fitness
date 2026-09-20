import { useState } from 'react'
import { useStore } from './lib/storage'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import RestTimer from './components/RestTimer'
import Overview from './screens/Overview'
import Workout from './screens/Workout'
import Progress from './screens/Progress'
import Analytics from './screens/Analytics'
import Body from './screens/Body'
import SkipLog from './screens/SkipLog'
import Settings from './screens/Settings'

const TITLES = {
  home: ['Overview', null],
  workout: ['Workout', "Plan and log today's session"],
  progress: ['Progress', 'Per-exercise history and PRs'],
  analytics: ['Analytics', 'Consistency, PRs and full history'],
  body: ['Body', 'Weight, measurements and trend'],
  skips: ['Skip log', 'Track why, not just that'],
  settings: ['Settings', 'Weekly goal, plateau rule and your plan'],
}

export default function App() {
  const [tab, setTab] = useState('home')
  const store = useStore()
  const [state, setState] = store
  const [rest, setRest] = useState(null)

  return (
    <div className="flex min-h-screen">
      <Sidebar active={tab} onChange={setTab} state={state} setState={setState} />
      <main className="flex-1 min-w-0">
        <Topbar title={TITLES[tab][0]} subtitle={TITLES[tab][1]} />
        {tab === 'home' && <Overview store={store} onGo={setTab} />}
        {tab === 'workout' && <Workout store={store} onRest={setRest} />}
        {tab === 'progress' && <Progress store={store} />}
        {tab === 'analytics' && <Analytics store={store} />}
        {tab === 'body' && <Body store={store} />}
        {tab === 'skips' && <SkipLog store={store} />}
        {tab === 'settings' && <Settings store={store} />}
      </main>
      {rest && <RestTimer key={rest.key} exerciseName={rest.name} seconds={rest.seconds} onDone={() => setRest(null)} />}
    </div>
  )
}
