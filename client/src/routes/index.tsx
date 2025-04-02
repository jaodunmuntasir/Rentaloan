import { Navigate } from 'react-router-dom';
import Loan from '../pages/loan/index';
import AgreementList from '../pages/loan/AgreementList';
import AgreementDetail from '../pages/loan/AgreementDetail';
import RequestList from '../pages/loan/RequestList';
import RequestCreate from '../pages/loan/RequestCreate';
import RequestDetail from '../pages/loan/RequestDetail';

const loanRoutes = [
  {
    path: '/loan',
    element: <Loan />,
    children: [
      {
        index: true,
        element: <Navigate to="agreements" />
      },
      {
        path: 'agreements',
        element: <AgreementList />,
      },
      {
        path: 'agreement/:address',
        element: <AgreementDetail />,
      },
      {
        path: 'requests',
        element: <RequestList />,
      },
      {
        path: 'request/create',
        element: <RequestCreate />,
      },
      {
        path: 'request/:address',
        element: <RequestDetail />,
      },
    ],
  },
];

export default loanRoutes; 