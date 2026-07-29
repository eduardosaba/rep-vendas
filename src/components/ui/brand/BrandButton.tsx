import React from 'react'
import { Button } from '../button'

interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const BrandButton: React.FC<BrandButtonProps> = ({ children, ...props }) => {
  return <Button {...props}>{children}</Button>
}

export default BrandButton
