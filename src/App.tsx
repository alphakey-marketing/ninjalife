import { GameProvider, useGame } from './gameStore';
import { HubScreen } from './components/HubScreen';
import { QuestScreen } from './components/QuestScreen';
import { CombatScreen } from './components/CombatScreen';
import { SpinScreen } from './components/SpinScreen';
import { StatusScreen } from './components/StatusScreen';
import { ClinicScreen } from './components/ClinicScreen';
import { ShopScreen } from './components/ShopScreen';
import { GearScreen } from './components/GearScreen';
import { IntroScreen } from './components/IntroScreen';
import './App.css';

function GameContent() {
  const { state } = useGame();
  const currentNotification = state.notifications[0];

  return (
    <>
      {currentNotification && (
        <div className="notification">{currentNotification}</div>
      )}
      {state.screen === 'INTRO' && <IntroScreen />}
      {state.screen === 'HUB' && <HubScreen />}
      {state.screen === 'QUEST' && <QuestScreen />}
      {state.screen === 'COMBAT' && <CombatScreen />}
      {state.screen === 'SPIN' && <SpinScreen />}
      {state.screen === 'STATUS' && <StatusScreen />}
      {state.screen === 'CLINIC' && <ClinicScreen />}
      {state.screen === 'SHOP' && <ShopScreen />}
      {state.screen === 'GEAR' && <GearScreen />}
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
