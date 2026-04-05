import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DocsLayout } from './components/layout/DocsLayout.js';
import { DocPage } from './pages/DocPage.js';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DocsLayout />}>
          <Route path="*" element={<DocPage />} />
          {/* Redirect root to introduction */}
          <Route index element={<Navigate to="/introduction" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
