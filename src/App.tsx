import { GameProvider, useGame } from './gameStore';
import { HubScreen } from './components/HubScreen';
import { QuestScreen } from './components/QuestScreen';
import { CombatScreen } from './components/CombatScreen';
import { SpinScreen } from './components/SpinScreen';
import { StatusScreen } from './components/StatusScreen';
import './App.css';

function GameContent() {
  const { state } = useGame();

  return (
    <>
      {state.notification && (
        <div className="notification">{state.notification}</div>
      )}
      {state.screen === 'HUB' && <HubScreen />}
      {state.screen === 'QUEST' && <QuestScreen />}
      {state.screen === 'COMBAT' && <CombatScreen />}
      {state.screen === 'SPIN' && <SpinScreen />}
      {state.screen === 'STATUS' && <StatusScreen />}
    </>
  );
}

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;
