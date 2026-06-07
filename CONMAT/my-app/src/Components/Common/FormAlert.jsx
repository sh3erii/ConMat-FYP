import React from 'react';
import './FormAlert.css';

export default function FormAlert({ type = 'info', children }) {
  if (!children) return null;
  return <div className={`form-alert form-alert--${type}`}>{children}</div>;
}
