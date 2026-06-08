import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from '@/components/Layout'
import DashboardPage from '@/pages/DashboardPage'
import DTRPage from '@/pages/DTRPage'
import StudentsPage from '@/pages/StudentsPage'
import QRPage from '@/pages/QRPage'
import ScanPage from '@/pages/ScanPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '13px',
            borderRadius: '10px',
            border: '1px solid #e7e5e4',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
        }}
      />

      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dtr" element={<DTRPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/qr" element={<QRPage />} />
          <Route path="/scan" element={<ScanPage />} />
        </Routes>
      </Layout>

    </BrowserRouter>
  )
}