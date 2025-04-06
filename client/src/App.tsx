import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import { ContractProvider } from './contexts/ContractContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RentalCreate from './pages/rental/Create';
import RentalList from './pages/rental/List';
import RentalDetail from './pages/rental/Detail';
import ProfilePage from './pages/Profile';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import RequestDetail from './pages/loan/RequestDetail';
import Loan from './pages/loan';
import RequestList from './pages/loan/RequestList';
import RequestCreate from './pages/loan/RequestCreate';
import AgreementList from './pages/loan/AgreementList';
import AgreementDetail from './pages/loan/AgreementDetail';
import MyRequestsPage from './pages/loan/MyRequests';

// Inline PrivateRoute component
const PrivateRoute: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

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
                  <Route path=":address/loan/request/create" element={<RequestCreate />} />
                  <Route path=":address/loan/request/:id" element={<RequestDetail />} />
                </Route>
                
                {/* Loan routes */}
                <Route path="loan" element={<Loan />}>
                  <Route index element={<Navigate to="/loan/agreements" replace />} />
                  <Route path="agreements" element={<AgreementList />} />
                  <Route path="agreement/:address" element={<AgreementDetail />} />
                  <Route path="requests" element={<RequestList />} />
                  <Route path="myrequests" element={<MyRequestsPage />} />
                  <Route path="request/create" element={<RequestCreate />} />
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
