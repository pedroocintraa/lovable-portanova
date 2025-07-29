import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Importar utilitário de limpeza em desenvolvimento
if (import.meta.env.DEV) {
  import("./utils/clearTestData");
}

createRoot(document.getElementById("root")!).render(<App />);
