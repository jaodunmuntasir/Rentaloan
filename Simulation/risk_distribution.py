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

def analyze_risk_distribution():
    """Analyze how risk is distributed among landlords, renters, and lenders."""
    
    # Create directory for results if it doesn't exist
    os.makedirs('risk_analysis_results', exist_ok=True)
    
    print("Running risk tracking simulation...")
    # Create a modified model that tracks risks
    class RiskTrackingModel(RentalLoanModel):
        def __init__(self, num_landlords=10, num_renters=50, num_lenders=5, max_steps=120):
            super().__init__(num_landlords, num_renters, num_lenders, max_steps)
            
            # Add risk tracking
            self.landlord_risks = []
            self.renter_risks = []
            self.lender_risks = []
            
            # Add risk data collector
            self.risk_collector = mesa.DataCollector(
                model_reporters={
                    "Avg_Landlord_Risk": lambda m: m.calculate_avg_risk("Landlord"),
                    "Avg_Renter_Risk": lambda m: m.calculate_avg_risk("Renter"),
                    "Avg_Lender_Risk": lambda m: m.calculate_avg_risk("Lender"),
                    "Total_Landlord_Risk": lambda m: m.calculate_total_risk("Landlord"),
                    "Total_Renter_Risk": lambda m: m.calculate_total_risk("Renter"),
                    "Total_Lender_Risk": lambda m: m.calculate_total_risk("Lender"),
                }
            )
            
            # Initialize risk collector
            self.risk_collector.collect(self)
        
        def step(self):
            super().step()
            
            # Clear previous risks
            self.landlord_risks = []
            self.renter_risks = []
            self.lender_risks = []
            
            # Calculate current risks for all agents
            for agreement in self.all_agreements:
                if agreement["status"] == "ACTIVE":
                    landlord = agreement["landlord"]
                    renter = agreement["renter"]
                    
                    # Landlord risk: Exposure if renter defaults (damage or unpaid rent)
                    # Risk is the difference between potential damage/unpaid rent and current deposit
                    potential_damage = agreement["monthly_rent"] * 3  # Assume potential damage equivalent to 3 months rent
                    landlord_exposure = max(0, potential_damage - agreement["current_deposit"])
                    
                    self.landlord_risks.append({
                        'agent_id': landlord.unique_id,
                        'risk_type': 'property_damage',
                        'risk_exposure': landlord_exposure,
                        'risk_factor': landlord_exposure / potential_damage if potential_damage > 0 else 0
                    })
                    
                    # Renter risk: Potential loss of security deposit
                    renter_exposure = agreement["current_deposit"]
                    
                    self.renter_risks.append({
                        'agent_id': renter.unique_id,
                        'risk_type': 'deposit_loss',
                        'risk_exposure': renter_exposure,
                        'risk_factor': renter_exposure / (renter.income * 3) if renter.income > 0 else 0  # Risk relative to 3 months income
                    })
            
            # Lender risks from active loans
            for loan in self.all_loans:
                if loan["status"] == "ACTIVE":
                    lender = loan["lender"]
                    
                    # Lender risk: Loan amount minus collateral (if collateral < loan)
                    # In our implementation, collateral equals loan amount, so risk should be minimal
                    lender_exposure = max(0, loan["loan_amount"] - loan["collateral_amount"])
                    
                    self.lender_risks.append({
                        'agent_id': lender.unique_id,
                        'risk_type': 'default_risk',
                        'risk_exposure': lender_exposure,
                        'risk_factor': lender_exposure / loan["loan_amount"] if loan["loan_amount"] > 0 else 0
                    })
            
            # Collect risk data
            self.risk_collector.collect(self)
        
        def calculate_avg_risk(self, agent_type):
            """Calculate average risk exposure for a type of agent."""
            if agent_type == "Landlord" and self.landlord_risks:
                return np.mean([r['risk_exposure'] for r in self.landlord_risks])
            elif agent_type == "Renter" and self.renter_risks:
                return np.mean([r['risk_exposure'] for r in self.renter_risks])
            elif agent_type == "Lender" and self.lender_risks:
                return np.mean([r['risk_exposure'] for r in self.lender_risks])
            return 0
        
        def calculate_total_risk(self, agent_type):
            """Calculate total risk exposure for a type of agent."""
            if agent_type == "Landlord" and self.landlord_risks:
                return sum([r['risk_exposure'] for r in self.landlord_risks])
            elif agent_type == "Renter" and self.renter_risks:
                return sum([r['risk_exposure'] for r in self.renter_risks])
            elif agent_type == "Lender" and self.lender_risks:
                return sum([r['risk_exposure'] for r in self.lender_risks])
            return 0
    
    # Run simulation with risk tracking
    model = RiskTrackingModel()
    for i in range(120):
        model.step()
    
    # Collect risk data
    risk_data = model.risk_collector.get_model_vars_dataframe()
    
    # Consolidate individual risk records
    all_risks = []
    
    # Convert risk lists to DataFrames
    for step in range(len(risk_data)):
        # Add step information
        for risk_list, agent_type in [
            (model.landlord_risks, "Landlord"), 
            (model.renter_risks, "Renter"), 
            (model.lender_risks, "Lender")
        ]:
            for risk in risk_list:
                risk_record = risk.copy()
                risk_record['step'] = step
                risk_record['agent_type'] = agent_type
                all_risks.append(risk_record)
    
    # Convert to DataFrame if there are risks to analyze
    if all_risks:
        all_risks_df = pd.DataFrame(all_risks)
    else:
        # Create an empty DataFrame with the expected columns
        all_risks_df = pd.DataFrame(columns=[
            'agent_id', 'risk_type', 'risk_exposure', 'risk_factor', 'step', 'agent_type'
        ])
    
    # Create visualizations
    print("Creating risk analysis visualizations...")
    visualize_risk_distribution(risk_data, all_risks_df)
    
    # Save results to CSV
    risk_data.to_csv('risk_analysis_results/risk_metrics.csv')
    all_risks_df.to_csv('risk_analysis_results/detailed_risks.csv', index=False)
    
    return risk_data, all_risks_df

def visualize_risk_distribution(risk_data, all_risks_df):
    """Create visualizations for risk distribution analysis."""
    
    # Figure 1: Risk exposure over time
    plt.figure(figsize=(15, 10))
    
    # Plot 1: Average risk exposure by agent type over time
    plt.subplot(2, 2, 1)
    risk_data[['Avg_Landlord_Risk', 'Avg_Renter_Risk', 'Avg_Lender_Risk']].plot()
    plt.title('Average Risk Exposure by Agent Type')
    plt.xlabel('Time Step')
    plt.ylabel('Risk Exposure')
    plt.grid(True)
    plt.legend()
    
    # Plot 2: Total risk exposure by agent type over time
    plt.subplot(2, 2, 2)
    risk_data[['Total_Landlord_Risk', 'Total_Renter_Risk', 'Total_Lender_Risk']].plot()
    plt.title('Total Risk Exposure by Agent Type')
    plt.xlabel('Time Step')
    plt.ylabel('Risk Exposure')
    plt.grid(True)
    plt.legend()
    
    # Plot 3: Risk exposure distribution by agent type (if data exists)
    plt.subplot(2, 2, 3)
    if not all_risks_df.empty and 'risk_exposure' in all_risks_df.columns:
        sns.boxplot(x='agent_type', y='risk_exposure', data=all_risks_df)
        plt.title('Risk Exposure Distribution by Agent Type')
        plt.xlabel('Agent Type')
        plt.ylabel('Risk Exposure')
    else:
        plt.text(0.5, 0.5, 'No risk exposure data available', 
                 horizontalalignment='center', verticalalignment='center')
        plt.title('Risk Exposure Distribution (No Data)')
    
    # Plot 4: Risk factor distribution by agent type (if data exists)
    plt.subplot(2, 2, 4)
    if not all_risks_df.empty and 'risk_factor' in all_risks_df.columns:
        sns.boxplot(x='agent_type', y='risk_factor', data=all_risks_df)
        plt.title('Risk Factor Distribution by Agent Type')
        plt.xlabel('Agent Type')
        plt.ylabel('Risk Factor')
    else:
        plt.text(0.5, 0.5, 'No risk factor data available', 
                 horizontalalignment='center', verticalalignment='center')
        plt.title('Risk Factor Distribution (No Data)')
    
    plt.tight_layout()
    plt.savefig('risk_analysis_results/risk_distributions.png', dpi=300)
    plt.close()
    
    # Figure 2: Risk distribution pie charts
    plt.figure(figsize=(15, 10))
    
    # Calculate the average risk for the last half of the simulation (steady state)
    last_half = len(risk_data) // 2
    avg_risks = {
        'Landlord': risk_data['Avg_Landlord_Risk'].iloc[-last_half:].mean(),
        'Renter': risk_data['Avg_Renter_Risk'].iloc[-last_half:].mean(),
        'Lender': risk_data['Avg_Lender_Risk'].iloc[-last_half:].mean()
    }
    
    total_risks = {
        'Landlord': risk_data['Total_Landlord_Risk'].iloc[-last_half:].mean(),
        'Renter': risk_data['Total_Renter_Risk'].iloc[-last_half:].mean(),
        'Lender': risk_data['Total_Lender_Risk'].iloc[-last_half:].mean()
    }
    
    # Plot 1: Average risk distribution
    plt.subplot(1, 2, 1)
    plt.pie(
        avg_risks.values(), 
        labels=avg_risks.keys(), 
        autopct='%1.1f%%',
        shadow=True, 
        startangle=90
    )
    plt.axis('equal')
    plt.title('Average Risk Distribution by Agent Type')
    
    # Plot 2: Total risk distribution
    plt.subplot(1, 2, 2)
    plt.pie(
        total_risks.values(), 
        labels=total_risks.keys(), 
        autopct='%1.1f%%',
        shadow=True, 
        startangle=90
    )
    plt.axis('equal')
    plt.title('Total Risk Distribution by Agent Type')
    
    plt.tight_layout()
    plt.savefig('risk_analysis_results/risk_distribution_pie.png', dpi=300)
    plt.close()
    
    # Figure 3: Risk evolution over time
    plt.figure(figsize=(15, 12))
    
    # Prepare percentage data for area chart
    if not risk_data.empty:
        # Create a percentage stack
        risk_data['Total_Risk'] = (
            risk_data['Total_Landlord_Risk'] + 
            risk_data['Total_Renter_Risk'] + 
            risk_data['Total_Lender_Risk']
        )
        
        # Avoid division by zero
        risk_data['Total_Risk'] = risk_data['Total_Risk'].replace(0, np.nan)
        
        risk_data['Landlord_Pct'] = risk_data['Total_Landlord_Risk'] / risk_data['Total_Risk']
        risk_data['Renter_Pct'] = risk_data['Total_Renter_Risk'] / risk_data['Total_Risk']
        risk_data['Lender_Pct'] = risk_data['Total_Lender_Risk'] / risk_data['Total_Risk']
        
        # Fill NaN values with 0
        risk_data = risk_data.fillna(0)
        
        # Plot stacked area chart
        plt.subplot(2, 1, 1)
        plt.stackplot(
            risk_data.index, 
            risk_data['Landlord_Pct'], 
            risk_data['Renter_Pct'], 
            risk_data['Lender_Pct'],
            labels=['Landlord', 'Renter', 'Lender'],
            colors=['#ff9999','#66b3ff','#99ff99']
        )
        plt.title('Risk Distribution Percentage Over Time')
        plt.xlabel('Time Step')
        plt.ylabel('Percentage of Total Risk')
        plt.ylim(0, 1)
        plt.legend(loc='upper left')
        plt.grid(True)
        
        # Plot absolute risk values
        plt.subplot(2, 1, 2)
        plt.stackplot(
            risk_data.index, 
            risk_data['Total_Landlord_Risk'], 
            risk_data['Total_Renter_Risk'], 
            risk_data['Total_Lender_Risk'],
            labels=['Landlord', 'Renter', 'Lender'],
            colors=['#ff9999','#66b3ff','#99ff99']
        )
        plt.title('Absolute Risk Distribution Over Time')
        plt.xlabel('Time Step')
        plt.ylabel('Risk Exposure')
        plt.legend(loc='upper left')
        plt.grid(True)
    else:
        plt.text(0.5, 0.5, 'No risk data available', 
                 horizontalalignment='center', verticalalignment='center')
        plt.title('Risk Evolution (No Data)')
    
    plt.tight_layout()
    plt.savefig('risk_analysis_results/risk_evolution.png', dpi=300)
    plt.close()
    
    # Figure 4: Risk-reward analysis
    plt.figure(figsize=(15, 10))
    
    # Define reward metrics for each agent type
    # For landlords: Total income
    # For renters: Liquidity accessed through loans
    # For lenders: Total income
    
    # Calculate average risk and reward for last half of simulation
    if not risk_data.empty and len(risk_data) > 0:
        avg_landlord_risk = risk_data['Avg_Landlord_Risk'].iloc[-last_half:].mean()
        avg_renter_risk = risk_data['Avg_Renter_Risk'].iloc[-last_half:].mean()
        avg_lender_risk = risk_data['Avg_Lender_Risk'].iloc[-last_half:].mean()
        
        # These values would come from your model data, using placeholder values here
        avg_landlord_reward = 10  # Average income
        avg_renter_reward = 5     # Average liquidity accessed
        avg_lender_reward = 2     # Average income
        
        # Plot risk-reward scatter
        plt.scatter(
            [avg_landlord_risk, avg_renter_risk, avg_lender_risk],
            [avg_landlord_reward, avg_renter_reward, avg_lender_reward],
            s=200, alpha=0.7
        )
        
        # Add labels for each point
        plt.annotate('Landlord', (avg_landlord_risk, avg_landlord_reward), 
                     textcoords="offset points", xytext=(0,10), ha='center')
        plt.annotate('Renter', (avg_renter_risk, avg_renter_reward), 
                     textcoords="offset points", xytext=(0,10), ha='center')
        plt.annotate('Lender', (avg_lender_risk, avg_lender_reward), 
                     textcoords="offset points", xytext=(0,10), ha='center')
        
        plt.title('Risk-Reward Analysis by Agent Type')
        plt.xlabel('Average Risk Exposure')
        plt.ylabel('Average Reward')
        plt.grid(True)
    else:
        plt.text(0.5, 0.5, 'No risk-reward data available', 
                 horizontalalignment='center', verticalalignment='center')
        plt.title('Risk-Reward Analysis (No Data)')
    
    plt.tight_layout()
    plt.savefig('risk_analysis_results/risk_reward_analysis.png', dpi=300)
    plt.close()

if __name__ == "__main__":
    # Run the risk distribution analysis
    risk_data, detailed_risks = analyze_risk_distribution()
    print("Risk distribution analysis complete. Results saved to 'risk_analysis_results' directory.")