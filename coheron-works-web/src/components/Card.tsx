import React from 'react';
import { clsx } from 'clsx';
import './Card.css';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
    return (
        <div className={clsx('card', hover && 'card-hover', className)}>
            {children}
        </div>
    );
};
