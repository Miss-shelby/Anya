import { Navigate, Route, Routes } from 'react-router-dom';
import { MobileFrame } from './components/layout/MobileFrame';
import { GlobalVoiceCompanion } from './components/voice/GlobalVoiceCompanion';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SetupPermissionsScreen } from './screens/SetupPermissionsScreen';
import { HomeAssistantScreen } from './screens/HomeAssistantScreen';
import { VoiceConversationScreen } from './screens/VoiceConversationScreen';
import { NairaDetectionScreen } from './screens/NairaDetectionScreen';
import { ObjectRecognitionScreen } from './screens/ObjectRecognitionScreen';
import { TextReadingScreen } from './screens/TextReadingScreen';
import { CommunicationScreen } from './screens/CommunicationScreen';
import { BankingDemoScreen } from './screens/BankingDemoScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  return (
    <MobileFrame>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/setup" element={<SetupPermissionsScreen />} />
        <Route path="/home" element={<HomeAssistantScreen />} />
        <Route path="/conversation" element={<VoiceConversationScreen />} />
        <Route path="/naira" element={<NairaDetectionScreen />} />
        <Route path="/objects" element={<ObjectRecognitionScreen />} />
        <Route path="/read" element={<TextReadingScreen />} />
        <Route path="/communicate" element={<CommunicationScreen />} />
        <Route path="/banking" element={<BankingDemoScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalVoiceCompanion />
    </MobileFrame>
  );
}
