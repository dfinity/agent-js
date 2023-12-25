import React from 'react';
import { cn } from '../utils';

interface ButtonProps {
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, type = 'button', className = '' }) => (
  <button
    type={type}
    className={cn('py-1 px-2 w-full rounded cursor-pointer text-lg font-mono', className)}
    onClick={onClick}
  >
    {children}
  </button>
);

export default Button;
