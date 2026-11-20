import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { SpeechProvider } from './context/SpeechContext';
import { AssistantProvider } from './context/AssistantContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <SpeechProvider>
          <AssistantProvider>
            <App />
          </AssistantProvider>
        </SpeechProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>
);
