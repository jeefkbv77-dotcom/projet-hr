// components/Notification.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/useStore'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const Notification = () => {
  const { notification, masquerNotification } = useNotificationStore()

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <AlertCircle className="w-6 h-6 text-red-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20',
    error: 'bg-red-50 dark:bg-red-900/20',
    info: 'bg-blue-50 dark:bg-blue-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
  }

  const borderColors = {
    success: 'border-green-200 dark:border-green-800',
    error: 'border-red-200 dark:border-red-800',
    info: 'border-blue-200 dark:border-blue-800',
    warning: 'border-yellow-200 dark:border-yellow-800',
  }

  const getMessage = (msg: any): string => {
    if (!msg) return 'Une erreur est survenue'
    if (typeof msg === 'string') return msg
    if (typeof msg === 'object') {
      if (msg.msg) return msg.msg
      if (msg.message) return msg.message
      if (msg.detail) {
        if (typeof msg.detail === 'string') return msg.detail
        if (Array.isArray(msg.detail)) {
          return msg.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ')
        }
      }
      return JSON.stringify(msg)
    }
    return String(msg)
  }

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]
            ${bgColors[notification.type]} ${borderColors[notification.type]}
            border rounded-xl px-6 py-4 shadow-xl backdrop-blur-md max-w-md w-full`}
        >
          <div className="flex items-center gap-3">
            {icons[notification.type]}
            <p className="text-gray-800 dark:text-gray-200 font-medium flex-1">
              {getMessage(notification.message)}
            </p>
            <button
              onClick={masquerNotification}
              className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Notification