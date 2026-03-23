import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RadioPlayer from './components/RadioPlayer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import AboutPage from './pages/AboutPage';
import InscrevaPage from './pages/InscrevaPage';
import ContactPage from './pages/ContactPage';
import ModelPage from './pages/ModelPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ModelForm from './pages/admin/ModelForm';
import AdminSync from './pages/admin/AdminSync';

import AdminRadioPage from './pages/admin/AdminRadioPage';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/women" element={<CategoryPage category="women" />} />
          <Route path="/men" element={<CategoryPage category="men" />} />
          <Route path="/new-faces" element={<CategoryPage category="new-faces" />} />
          <Route path="/creators" element={<CategoryPage category="creators" />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/inscreva-se" element={<InscrevaPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
          />
          <Route
            path="/admin/models/new"
            element={<ProtectedRoute><ModelForm /></ProtectedRoute>}
          />
          <Route
            path="/admin/models/:id/edit"
            element={<ProtectedRoute><ModelForm /></ProtectedRoute>}
          />
          <Route
            path="/admin/sync"
            element={<ProtectedRoute><AdminSync /></ProtectedRoute>}
          />
          <Route
            path="/admin/radio"
            element={<ProtectedRoute><AdminRadioPage /></ProtectedRoute>}
          />

          <Route path="/:slug" element={<ModelPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
        <RadioPlayer />
      </BrowserRouter>
    </LanguageProvider>
  );
}
