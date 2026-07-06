'use client'
import { useState, useEffect } from 'react'

type DonateModalProps = {
  isOpen: boolean
  onClose: () => void
}

type Coin = {
  name: string
  symbol: string
  network?: string
  address: string
  color: string
  bgGlow: string
  borderColor: string
  icon: React.ReactNode
}

export function DonateModal({ isOpen, onClose }: DonateModalProps) {
  const [copiedCoin, setCopiedCoin] = useState<string | null>(null)

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const coins: Coin[] = [
    {
      name: 'Toncoin',
      symbol: 'TON',
      address: 'UQD5eaRPtnuhyp5a_QFziGovp0EKXRzj56b-VPuA3rFbeLZU',
      color: 'text-blue-400',
      bgGlow: 'hover:bg-blue-500/5 hover:shadow-blue-500/10',
      borderColor: 'hover:border-blue-500/40',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.12.44-.32 1.4-.6 2.88-.28 1.48-.48 2.68-.6 3.6-.12.92-.2 1.48-.24 1.68-.08.32-.24.56-.48.72-.24.16-.56.24-.96.24-.36 0-.68-.08-.96-.24-.28-.16-.48-.4-.6-.72l-.72-2.28-2.04 1.32c-.32.2-.64.3-.96.3-.32 0-.6-.08-.84-.24-.24-.16-.36-.4-.36-.72 0-.28.08-.68.24-1.2l.96-3.24-2.16-1.44c-.28-.2-.44-.48-.48-.84-.04-.36.08-.68.36-.96.28-.28.6-.4.96-.36.36.04.88.24 1.56.6l3.36 2.16.84-2.88c.08-.32.24-.56.48-.72.24-.16.56-.24.96-.24.36 0 .68.08.96.24.28.16.48.4.6.72l.96 3.24 1.8-1.2c.28-.2.56-.3.84-.3.28 0 .52.08.72.24.2.16.32.4.32.72 0 .16-.04.44-.12.84z" />
        </svg>
      )
    },
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      address: '14B4CXBPpfX9j1UW3V4mMGa577fCxiCVo7',
      color: 'text-amber-500',
      bgGlow: 'hover:bg-amber-500/5 hover:shadow-amber-500/10',
      borderColor: 'hover:border-amber-500/40',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.6 14.2c-.5-2.5-2.1-4-4.5-4.7 1.8-.8 2.9-2.3 2.5-4.9-.5-3.3-3.2-4.5-7.5-5.1V-.4h-3v3.8h-2.5V-.4h-3v3.8H3v3.2h2.2c1.2 0 1.6.6 1.6 1.4v10.9c0 .7-.4 1.3-1.6 1.3H3v3.2h3.1v3.9h3v-3.9h2.5v3.9h3v-3.8c4.9-.4 8.5-1.5 9-4.8.4-2.4-.7-4.1-2.6-5.1 2.2-.6 3.6-2.1 3.6-4.2zm-12-5.1h3.3c2 0 3.2.7 3.2 2.2 0 1.6-1.2 2.3-3.2 2.3H11.6V9.1zm3.8 9.2h-3.8v-4.7h3.8c2.2 0 3.5.8 3.5 2.3 0 1.5-1.3 2.4-3.5 2.4z" />
        </svg>
      )
    },
    {
      name: 'Litecoin',
      symbol: 'LTC',
      address: 'LaEz7K4JBSkJYr4Wx8zgt3wGRSDNf51VN3',
      color: 'text-slate-400',
      bgGlow: 'hover:bg-slate-500/5 hover:shadow-slate-500/10',
      borderColor: 'hover:border-slate-500/40',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.3 14.1H8.7l.9-3.2h3.4l.4-1.4H10l.9-3.2h3.4l.4-1.4H10l.4-1.4h5.3l-2.4 8.2h-3.4l-.4 1.4h5.8l-.9 3.2z" />
        </svg>
      )
    },
    {
      name: 'Tether',
      symbol: 'USDT',
      network: 'BSC (BEP20)',
      address: '0xddb4c3e62494d03ca925793524683dc9390b13d3',
      color: 'text-emerald-400',
      bgGlow: 'hover:bg-emerald-500/5 hover:shadow-emerald-500/10',
      borderColor: 'hover:border-emerald-500/40',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.6 7.6v1.4h2.4v1.8h-2.4v3.7c0 .8.4 1.1 1.2 1.1.4 0 .7-.1.9-.2l.3 1.8c-.5.2-1.2.3-2 .3-2.1 0-3-.9-3-2.9v-3.8H9v-1.8h2v-1.4H8.6V7.8h6.8v1.8h-1.8z" />
        </svg>
      )
    }
  ]

  const handleCopy = (address: string, symbol: string) => {
    navigator.clipboard.writeText(address)
    setCopiedCoin(symbol)
    setTimeout(() => setCopiedCoin(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-scaleUp z-10 text-left overflow-hidden">
        {/* Glow Effects inside Modal */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800/40 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white text-lg shadow-lg shadow-red-500/20">
            💝
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-extrabold text-white tracking-tight">Поддержать разработчика</h3>
            <p className="text-xs text-slate-400 mt-0.5">Пожертвование на развитие сервиса</p>
          </div>
        </div>

        <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-6">
          Ваша поддержка помогает развивать проект, покрывать серверные расходы и оплачивать запросы к API Google Gemini. Спасибо, что пользуетесь Summarizer!
        </p>

        {/* Coins List */}
        <div className="space-y-3.5">
          {coins.map((coin) => (
            <div
              key={coin.symbol}
              className={`p-4 rounded-2xl border border-slate-800/50 bg-slate-950/30 flex items-center justify-between gap-4 transition-all duration-300 ${coin.bgGlow} ${coin.borderColor}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-center ${coin.color} flex-shrink-0 shadow-inner`}>
                  {coin.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">{coin.name}</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-800/80 text-slate-300 tracking-wider">
                      {coin.symbol}
                    </span>
                    {coin.network && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        {coin.network}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-[200px] sm:max-w-[280px]">
                    {coin.address}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleCopy(coin.address, coin.symbol)}
                className={`h-9 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 ${
                  copiedCoin === coin.symbol
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400 shadow-lg shadow-green-500/5'
                    : 'bg-slate-800/50 border border-slate-700/40 text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
              >
                {copiedCoin === coin.symbol ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Копировать</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
