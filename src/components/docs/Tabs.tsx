/**
 * Tabs Component
 * Multi-tab content display (code examples, etc)
 */

import React, { useState } from 'react';
import './Tabs.css';

export interface TabItem {
  label: string;
  value: string;
  content: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
}

export function Tabs({ items, defaultValue }: TabsProps) {
  const [activeValue, setActiveValue] = useState(
    defaultValue || (items.length > 0 ? items[0].value : '')
  );

  const activeTab = items.find((item) => item.value === activeValue);

  return (
    <div className="tabs-wrapper">
      <div className="tabs-header">
        <div className="tabs-list">
          {items.map((item) => (
            <button
              key={item.value}
              className={`tabs-trigger ${activeValue === item.value ? 'active' : ''}`}
              onClick={() => setActiveValue(item.value)}
              aria-selected={activeValue === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tabs-content">
        {activeTab && <div className="tabs-pane">{activeTab.content}</div>}
      </div>
    </div>
  );
}
