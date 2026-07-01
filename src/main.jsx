import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initTheme } from './core/theme'
import { MOYASAR_STORAGE, storePlanDays, storePaymentReturn } from './core/moyasarPayment'

initTheme()

;(function handleMoyasarReturn() {
  try {
    const params = new URLSearchParams(window.location.search)
    const paymentId = params.get('id')
    if (!paymentId) return

    const plan = params.get('pfcc_plan')
    if (plan) storePlanDays(plan)

    storePaymentReturn(paymentId)
    sessionStorage.setItem(MOYASAR_STORAGE.openPackages, '1')
    window.history.replaceState({}, '', window.location.pathname)
  } catch {
    /* ignore */
  }
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
