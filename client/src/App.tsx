import { useState } from 'react'

interface Category {
  id: number
  name: string
}

function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'online' | 'offline'>('idle')
  const [categories, setCategories] = useState<Category[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const checkSystem = async () => {
    setStatus('loading')
    setErrorMsg(null)
    setCategories([])

    try {
      const [healthRes, categoriesRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/categories'),
      ])

      if (!healthRes.ok || !categoriesRes.ok) {
        throw new Error('Unable to connect to TokTickIT API')
      }

      const healthData = await healthRes.json()
      const categoriesData: Category[] = await categoriesRes.json()

      if (healthData.status === 'ok' && Array.isArray(categoriesData)) {
        setCategories(categoriesData)
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
              {status === 'loading' ? 'loading...' : 'Check System'}
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
            <div>
              <div className="alert alert-success mt-3" role="alert">
                <h4 className="alert-heading h5 mb-0">System Status: Online</h4>
              </div>

              {categories.length > 0 && (
                <div className="mt-4">
                  <h5 className="h6 fw-bold mb-3 text-secondary">Supported Request Categories:</h5>
                  <ol className="list-group list-group-numbered">
                    {categories.map((cat) => (
                      <li key={cat.id} className="list-group-item">
                        {cat.name}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
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
