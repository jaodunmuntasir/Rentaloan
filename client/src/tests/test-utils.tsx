import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { WalletProvider } from '../contexts/WalletContext';
import { ContractProvider } from '../contexts/ContractContext';

// Custom wrapper with all necessary providers
const AllProviders: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          <ContractProvider>
            {children}
          </ContractProvider>
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Custom render that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render }; 