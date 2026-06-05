import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Outlet, useOutlet } from 'react-router-dom';

function TestApp() {
  const outlet = useOutlet();
  console.log("useOutlet returned:", JSON.stringify(outlet, null, 2));
  return outlet;
}

// Just a static analysis, we can't easily run this without transpiling.
