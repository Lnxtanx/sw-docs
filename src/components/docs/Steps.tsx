/**
 * Steps Component
 * Sequential numbered instructions
 */

import React from 'react';
import './Steps.css';

export interface StepItem {
  title?: string;
  content: React.ReactNode;
}

interface StepsProps {
  items: StepItem[];
}

export function Steps({ items }: StepsProps) {
  return (
    <ol className="steps-list">
      {items.map((item, index) => (
        <li key={index} className="steps-item">
          <div className="steps-marker">{index + 1}</div>
          <div className="steps-content">
            {item.title && <div className="steps-title">{item.title}</div>}
            <div className="steps-body">{item.content}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
