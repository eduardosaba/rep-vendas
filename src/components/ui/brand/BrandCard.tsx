import React from 'react'
import { Card } from '../card'

interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const BrandCard: React.FC<BrandCardProps> = ({ children, ...props }) => {
  return <Card {...props}>{children}</Card>
}

export default BrandCard
