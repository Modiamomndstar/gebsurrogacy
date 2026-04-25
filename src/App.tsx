import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Home from './pages/Home'
import AdminDashboard from './pages/AdminDashboard'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import CookieConsent from './components/CookieConsent'

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <CookieConsent />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </>
  )
}

export default App
