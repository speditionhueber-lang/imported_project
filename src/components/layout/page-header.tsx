
'use client'
import React from 'react'

interface PageHeaderProps {
    title: string;
    description: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
    return (
        <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
};

export default PageHeader;
