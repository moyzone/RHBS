"use client"

import React, { useEffect } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'danger'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'info'
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Dialog box */}
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className={cn(
            "p-3 rounded-full",
            type === 'danger' ? "bg-red-50 text-red-600 dark:bg-red-950/30" : "bg-blue-50 text-blue-600 dark:bg-blue-950/30"
          )}>
            {type === 'danger' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button 
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-sm active:scale-95",
                type === 'danger' ? "bg-red-600 hover:bg-red-700" : "bg-[var(--theme-color,#4f46e5)] hover:opacity-90"
              )}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
