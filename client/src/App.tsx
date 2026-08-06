import { useState } from 'react'

interface HealthResponse {
  status: string
  service: string
}

function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'online' | 'offline'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const checkSystem = async () => {
    setStatus('loading')
    setErrorMsg(null)
    try {
      const response = await fetch('/api/health')
      if (!response.ok) {
        throw new Error('Unable to connect to TokTickIT API')
      }
      const data: HealthResponse = await response.json()
      if (data.status === 'ok') {
        setStatus('online')
      } else {
        setStatus('offline')
        setErrorMsg('Unable to connect to TokTickIT API')
      }
    } catch {
      setStatus('offline')
      setErrorMsg('Unable to connect to TokTickIT API')
    }
  }

  return (
    <div className="container py-5">
      <div className="card shadow-sm mx-auto" style={{ maxWidth: '600px' }}>
        <div className="card-body p-4">
          <h1 className="h3 mb-4 text-center text-primary">TokTickIT IT Service Desk</h1>
          
          <div className="d-grid mb-4">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={checkSystem}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Loading...' : 'Check System'}
            </button>
          </div>

          {status === 'loading' && (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">loading...</p>
            </div>
          )}

          {status === 'online' && (
            <div className="alert alert-success mt-3" role="alert">
              <h4 className="alert-heading h5 mb-0">System Status: Online</h4>
            </div>
          )}

          {status === 'offline' && (
            <div className="alert alert-danger mt-3" role="alert">
              <h4 className="alert-heading h5 mb-2">System Status: Offline</h4>
              <p className="mb-0">{errorMsg || 'Unable to connect to TokTickIT API'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
