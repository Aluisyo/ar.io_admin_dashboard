import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  message?: string
  showMessage?: boolean
}

export function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  message = 'Loading...',
  showMessage = true
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }
  
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <Loader2 className={`animate-spin text-white ${sizeClasses[size]}`} />
      {showMessage && (
        <span className="ml-2 text-gray-400">{message}</span>
      )}
    </div>
  )
}
