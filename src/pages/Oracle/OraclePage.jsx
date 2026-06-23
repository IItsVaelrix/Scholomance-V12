import React from 'react';
import { ChatbotUI } from '../../components/ChatbotUI.jsx';
import './OraclePage.css';

export default function OraclePage() {
  return (
    <div className="oracle-page">
      <div className="oracle-page__content">
        <h1 className="oracle-page__title">Lyrical Analysis</h1>
        <p className="oracle-page__subtitle">Consult the Oracle to weave intention into your prose.</p>
        <ChatbotUI title="Oracle Lyrical Analyst" />
      </div>
    </div>
  );
}
