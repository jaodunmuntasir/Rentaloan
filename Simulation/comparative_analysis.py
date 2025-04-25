import mesa
from mesa import Agent, Model
from mesa.time import RandomActivation
from mesa.datacollection import DataCollector
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import random
import os

# Import your model classes from your main simulation file
# You'll need to adjust this import to match your file structure
from rental_agent_simulation import LandlordAgent, RenterAgent, LenderAgent, RentalLoanModel, run_agent_simulation

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

def run_comparative_analysis():
    """Compare traditional rental model with the proposed blockchain-based model."""
    
    # Create directory for results if it doesn't exist
    os.makedirs('comparative_results', exist_ok=True)
    
    print("Running traditional model simulation (no loans)...")
    # Implement traditional model (no loans allowed)
    class TraditionalModel(RentalLoanModel):
        def __init__(self, num_landlords=10, num_renters=50, num_lenders=0, max_steps=120):
            # No lenders in traditional model
            super().__init__(num_landlords, num_renters, num_lenders, max_steps)
        
        def step(self):
            """Override to prevent loan requests."""
            self.schedule.step()
            # No loan functionality in traditional model
            for agent in self.schedule.agents:
                if hasattr(agent, 'type') and agent.type == "Renter":
                    # Disable loan functionality
                    agent.request_rent_loan = lambda: None
            
            self.datacollector.collect(self)
            
            if self.schedule.steps >= self.max_steps:
                self.running = False
    
    # Run traditional model
    traditional_model = TraditionalModel()
    for i in range(120):
        traditional_model.step()
    traditional_data = traditional_model.datacollector.get_model_vars_dataframe()
    
    print("Running proposed model simulation (with loans)...")
    # Run proposed model (with loans)
    proposed_model, proposed_data, _ = run_agent_simulation(steps=120)
    
    # Create comparative metrics
    print("Generating comparative metrics...")
    comparative_metrics = {
        'Active Rentals': {
            'Traditional': traditional_data['Active_Rentals'].mean(),
            'Proposed': proposed_data['Active_Rentals'].mean()
        },
        'Loan Availability': {
            'Traditional': 0,  # No loans in traditional model
            'Proposed': proposed_data['Active_Loans'].mean()
        },
        'Capital Efficiency': {
            'Traditional': 0,  # No collateralization in traditional model
            'Proposed': proposed_data['Capital_Efficiency'].mean()
        },
        'Landlord Income': {
            'Traditional': traditional_data['Avg_Landlord_Income'].iloc[-1],
            'Proposed': proposed_data['Avg_Landlord_Income'].iloc[-1]
        }
    }
    
    # Create standardized scenarios for cost comparison
    print("Generating standardized scenarios...")
    scenarios = []
    
    # Generate representative scenarios
    for income_level in ['Low', 'Medium', 'High']:
        for deposit_multiple in [2, 3, 4]:
            # Set income values based on level
            if income_level == 'Low':
                monthly_income = 2.5  # ETH
            elif income_level == 'Medium':
                monthly_income = 5.0  # ETH
            else:  # High
                monthly_income = 10.0  # ETH
                
            monthly_rent = monthly_income * 0.3  # Rent as 30% of income
            security_deposit = monthly_rent * deposit_multiple
            
            # Traditional model costs
            traditional_cost = {
                'income_level': income_level,
                'deposit_multiple': deposit_multiple,
                'model_type': 'Traditional',
                'upfront_cost': security_deposit + monthly_rent,
                'locked_capital': security_deposit,
                'locked_percentage': 100,  # 100% of deposit is locked
                'capital_efficiency': 0,  # No collateralization in traditional model
                'financial_flexibility': 0  # No loan option
            }
            scenarios.append(traditional_cost)
            
            # Proposed model costs
            available_collateral = max(0, security_deposit - (monthly_rent * 2))
            proposed_cost = {
                'income_level': income_level,
                'deposit_multiple': deposit_multiple,
                'model_type': 'Proposed',
                'upfront_cost': security_deposit + monthly_rent,
                'locked_capital': security_deposit - available_collateral,
                'locked_percentage': (security_deposit - available_collateral) / security_deposit * 100 if security_deposit > 0 else 0,
                'capital_efficiency': available_collateral / security_deposit if security_deposit > 0 else 0,
                'financial_flexibility': 1 if available_collateral > 0 else 0
            }
            scenarios.append(proposed_cost)
    
    # Convert to DataFrame
    scenarios_df = pd.DataFrame(scenarios)
    comparative_metrics_df = pd.DataFrame(comparative_metrics)
    
    # Create visualizations
    print("Creating visualizations...")
    visualize_comparative_results(scenarios_df, comparative_metrics_df, traditional_data, proposed_data)
    
    # Save results to CSV
    scenarios_df.to_csv('comparative_results/comparative_scenarios.csv', index=False)
    comparative_metrics_df.to_csv('comparative_results/comparative_metrics.csv')
    
    return scenarios_df, comparative_metrics_df

def visualize_comparative_results(scenarios_df, metrics_df, traditional_data, proposed_data):
    """Create visualizations for comparative analysis."""
    
    # Figure 1: Cost structure comparison
    plt.figure(figsize=(15, 10))
    
    # Plot 1: Upfront costs by income level and deposit multiple
    plt.subplot(2, 2, 1)
    sns.barplot(x='income_level', y='upfront_cost', hue='model_type', data=scenarios_df)
    plt.title('Upfront Costs by Income Level')
    plt.xlabel('Income Level')
    plt.ylabel('Upfront Cost (ETH)')
    plt.legend(title='Model Type')
    
    # Plot 2: Locked capital by income level
    plt.subplot(2, 2, 2)
    sns.barplot(x='income_level', y='locked_capital', hue='model_type', data=scenarios_df)
    plt.title('Locked Capital by Income Level')
    plt.xlabel('Income Level')
    plt.ylabel('Locked Capital (ETH)')
    plt.legend(title='Model Type')
    
    # Plot 3: Locked percentage by deposit multiple
    plt.subplot(2, 2, 3)
    sns.barplot(x='deposit_multiple', y='locked_percentage', hue='model_type', data=scenarios_df)
    plt.title('Locked Percentage by Deposit Multiple')
    plt.xlabel('Deposit Multiple (months of rent)')
    plt.ylabel('Locked Percentage of Deposit')
    plt.legend(title='Model Type')
    
    # Plot 4: Capital efficiency by deposit multiple
    plt.subplot(2, 2, 4)
    sns.barplot(x='deposit_multiple', y='capital_efficiency', hue='model_type', data=scenarios_df)
    plt.title('Capital Efficiency by Deposit Multiple')
    plt.xlabel('Deposit Multiple (months of rent)')
    plt.ylabel('Capital Efficiency')
    plt.legend(title='Model Type')
    
    plt.tight_layout()
    plt.savefig('comparative_results/cost_structure_comparison.png', dpi=300)
    plt.close()
    
    # Figure 2: System metrics comparison
    plt.figure(figsize=(15, 12))
    
    # Reshape metrics_df for easier plotting
    metrics_df_melted = pd.melt(metrics_df.reset_index(), id_vars='index', 
                                var_name='Model Type', value_name='Value')
    metrics_df_melted = metrics_df_melted.rename(columns={'index': 'Metric'})
    
    # Plot 1: System metrics bar chart
    plt.subplot(2, 2, 1)
    sns.barplot(x='Metric', y='Value', hue='Model Type', data=metrics_df_melted)
    plt.title('System Metrics Comparison')
    plt.xlabel('Metric')
    plt.ylabel('Value')
    plt.xticks(rotation=45)
    plt.legend(title='Model Type')
    
    # Plot 2: Active rentals over time
    plt.subplot(2, 2, 2)
    traditional_data['Active_Rentals'].plot(label='Traditional Model')
    proposed_data['Active_Rentals'].plot(label='Proposed Model')
    plt.title('Active Rentals Over Time')
    plt.xlabel('Time Step')
    plt.ylabel('Number of Active Rentals')
    plt.legend()
    plt.grid(True)
    
    # Plot 3: Liquidity creation (loans and collateralization)
    plt.subplot(2, 2, 3)
    proposed_data['Active_Loans'].plot(label='Active Loans')
    proposed_data['Total_Collateralized'].plot(label='Total Collateralized')
    plt.title('Liquidity Creation Over Time')
    plt.xlabel('Time Step')
    plt.ylabel('Value')
    plt.legend()
    plt.grid(True)
    
    # Plot 4: Income comparison
    plt.subplot(2, 2, 4)
    traditional_data['Avg_Landlord_Income'].plot(label='Traditional Landlord Income')
    proposed_data['Avg_Landlord_Income'].plot(label='Proposed Landlord Income')
    proposed_data['Avg_Lender_Income'].plot(label='Proposed Lender Income')
    plt.title('Income Comparison Over Time')
    plt.xlabel('Time Step')
    plt.ylabel('Income')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('comparative_results/system_metrics_comparison.png', dpi=300)
    plt.close()
    
    # Figure 3: Financial impact analysis
    plt.figure(figsize=(15, 10))
    
    # Calculate financial impact metrics
    financial_impact = []
    
    for income_level in scenarios_df['income_level'].unique():
        for deposit_multiple in scenarios_df['deposit_multiple'].unique():
            trad = scenarios_df[(scenarios_df['income_level'] == income_level) & 
                                (scenarios_df['deposit_multiple'] == deposit_multiple) &
                                (scenarios_df['model_type'] == 'Traditional')]
            
            prop = scenarios_df[(scenarios_df['income_level'] == income_level) & 
                                (scenarios_df['deposit_multiple'] == deposit_multiple) &
                                (scenarios_df['model_type'] == 'Proposed')]
            
            if not trad.empty and not prop.empty:
                # Calculate impact
                capital_freed = trad['locked_capital'].values[0] - prop['locked_capital'].values[0]
                percentage_freed = capital_freed / trad['locked_capital'].values[0] * 100 if trad['locked_capital'].values[0] > 0 else 0
                
                financial_impact.append({
                    'income_level': income_level,
                    'deposit_multiple': deposit_multiple,
                    'capital_freed': capital_freed,
                    'percentage_freed': percentage_freed
                })
    
    financial_impact_df = pd.DataFrame(financial_impact)
    
    # Plot 1: Capital freed by income level
    plt.subplot(2, 2, 1)
    sns.barplot(x='income_level', y='capital_freed', data=financial_impact_df)
    plt.title('Capital Freed by Income Level')
    plt.xlabel('Income Level')
    plt.ylabel('Capital Freed (ETH)')
    
    # Plot 2: Percentage freed by income level
    plt.subplot(2, 2, 2)
    sns.barplot(x='income_level', y='percentage_freed', data=financial_impact_df)
    plt.title('Percentage of Capital Freed by Income Level')
    plt.xlabel('Income Level')
    plt.ylabel('Percentage Freed')
    
    # Plot 3: Capital freed by deposit multiple
    plt.subplot(2, 2, 3)
    sns.barplot(x='deposit_multiple', y='capital_freed', data=financial_impact_df)
    plt.title('Capital Freed by Deposit Multiple')
    plt.xlabel('Deposit Multiple (months of rent)')
    plt.ylabel('Capital Freed (ETH)')
    
    # Plot 4: Percentage freed by deposit multiple
    plt.subplot(2, 2, 4)
    sns.barplot(x='deposit_multiple', y='percentage_freed', data=financial_impact_df)
    plt.title('Percentage of Capital Freed by Deposit Multiple')
    plt.xlabel('Deposit Multiple (months of rent)')
    plt.ylabel('Percentage Freed')
    
    plt.tight_layout()
    plt.savefig('comparative_results/financial_impact_analysis.png', dpi=300)
    plt.close()
    
    # Figure 4: Heat map of model advantages
    # Create a heat map showing the advantage of the proposed model across different scenarios
    pivot_data = pd.pivot_table(
        financial_impact_df, 
        values='percentage_freed', 
        index='income_level', 
        columns='deposit_multiple'
    )
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(pivot_data, annot=True, cmap="YlGnBu", fmt=".1f", cbar_kws={'label': 'Percentage of Capital Freed'})
    plt.title('Advantage of Proposed Model: Percentage of Capital Freed')
    plt.xlabel('Deposit Multiple (months of rent)')
    plt.ylabel('Income Level')
    plt.tight_layout()
    plt.savefig('comparative_results/model_advantage_heatmap.png', dpi=300)
    plt.close()

if __name__ == "__main__":
    # Run the comparative analysis
    scenarios, metrics = run_comparative_analysis()
    print("Comparative analysis complete. Results saved to 'comparative_results' directory.")