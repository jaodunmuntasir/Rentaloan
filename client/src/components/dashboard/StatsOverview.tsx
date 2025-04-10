import React from 'react';
import StatCard from './StatCard';
import {
  Building,
  Wallet,
  PiggyBank,
  Coins
} from 'lucide-react';

interface StatsOverviewProps {
  stats: {
    totalRentals: number;
    activeRentals: number;
    totalLoans: number;
    activeLoans: number;
    totalAmount: number;
  };
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Rental Agreements"
        value={stats.totalRentals}
        icon={Building}
        description="All rental contracts you're involved in"
      />
      
      <StatCard
        title="Active Rental Agreements"
        value={stats.activeRentals}
        icon={Building}
        description="Currently active rental contracts"
        variant="success"
      />
      
      <StatCard
        title="Total Loan Agreements"
        value={stats.totalLoans}
        icon={PiggyBank}
        description="All loan contracts you're involved in"
      />
      
      <StatCard
        title="Active Loan Agreements"
        value={stats.activeLoans}
        icon={Coins}
        description="Currently active loan contracts"
        variant="success"
      />
    </div>
  );
};

export default StatsOverview; 