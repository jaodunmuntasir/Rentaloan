import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import { ContractProvider } from './contexts/ContractContext';

// Pages - to be created later
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RentalCreate from './pages/rental/Create';
import RentalList from './pages/rental/List';
import RentalDetail from './pages/rental/Detail';
import LoanRequestCreate from './pages/loan/RequestCreate';
import LoanRequestList from './pages/loan/RequestList';
import LoanRequestDetail from './pages/loan/RequestDetail';
import LoanAgreementList from './pages/loan/AgreementList';
import LoanAgreementDetail from './pages/loan/AgreementDetail';
import ProfilePage from './pages/Profile';
import NotFound from './pages/NotFound';

// Components
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <WalletProvider>
          <ContractProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Private routes */}
              <Route path="/" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<ProfilePage />} />
                
                {/* Rental routes */}
                <Route path="rental">
                  <Route index element={<RentalList />} />
                  <Route path="create" element={<RentalCreate />} />
                  <Route path=":address" element={<RentalDetail />} />
                </Route>
                
                {/* Loan routes */}
                <Route path="loan">
                  <Route index element={<Navigate to="/loan/requests" replace />} />
                  
                  {/* Loan Requests */}
                  <Route path="requests">
                    <Route index element={<LoanRequestList />} />
                    <Route path="create" element={<LoanRequestCreate />} />
                    <Route path=":id" element={<LoanRequestDetail />} />
                  </Route>
                  
                  {/* Loan Agreements */}
                  <Route path="agreements">
                    <Route index element={<LoanAgreementList />} />
                    <Route path=":address" element={<LoanAgreementDetail />} />
                  </Route>
                </Route>
              </Route>
              
              {/* 404 Not found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ContractProvider>
        </WalletProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
