import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.colors import LinearSegmentedColormap
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

def calculate_available_collateral(security_deposit, monthly_rent):
    """Calculate available collateral based on the economic model."""
    return max(0, security_deposit - (monthly_rent * 2))

def calculate_grace_period(security_deposit, monthly_rent):
    """Calculate grace period based on the economic model."""
    return security_deposit / monthly_rent

def calculate_monthly_payment(loan_amount, interest_rate, duration):
    """Calculate monthly loan payment with simple interest."""
    total_repayment = loan_amount * (1 + interest_rate/100)
    return total_repayment / duration

def simulate_loan_outcome(loan_amount, collateral, interest_rate, duration, default_probability):
    """Simulate a single loan outcome."""
    monthly_payment = calculate_monthly_payment(loan_amount, interest_rate, duration)
    total_expected_repayment = monthly_payment * duration
    
    # Simulate whether the loan defaults
    if random.random() < default_probability:
        # Loan defaults, determine at which payment
        default_month = random.randint(1, duration)
        repaid_amount = monthly_payment * default_month
        
        return {
            "outcome": "DEFAULT",
            "payments_made": default_month,
            "repaid_amount": repaid_amount,
            "collateral_claimed": collateral,
            "lender_profit": repaid_amount + collateral - loan_amount,
            "borrower_cost": repaid_amount + collateral
        }
    else:
        # Loan completes successfully
        return {
            "outcome": "COMPLETED",
            "payments_made": duration,
            "repaid_amount": total_expected_repayment,
            "collateral_claimed": 0,
            "lender_profit": total_expected_repayment - loan_amount,
            "borrower_cost": total_expected_repayment
        }
    
def run_monte_carlo_simulation(num_simulations=10000):
    """Run Monte Carlo simulation with random parameters."""
    
    # Results storage
    results = []
    
    for i in range(num_simulations):
        # Generate random scenario parameters
        monthly_rent = np.random.uniform(0.5, 5)  # 0.5 to 5 ETH monthly rent
        security_deposit_multiplier = np.random.uniform(1, 6)  # 1 to 6 months of rent
        security_deposit = monthly_rent * security_deposit_multiplier
        
        # Calculate available collateral
        available_collateral = calculate_available_collateral(security_deposit, monthly_rent)
        
        # Skip scenarios where no collateral is available
        if available_collateral <= 0:
            continue
        
        # Determine loan parameters
        collateral_usage_ratio = np.random.uniform(0.2, 0.8)  # Use 20-80% of available collateral
        loan_amount = available_collateral * collateral_usage_ratio
        interest_rate = np.random.uniform(5, 25)  # 5-25% interest rate
        duration = np.random.randint(1, 13)  # 1-12 months duration
        default_probability = np.random.uniform(0.01, 0.15)  # 1-15% default probability
        
        # Simulate loan outcome
        outcome = simulate_loan_outcome(loan_amount, loan_amount, interest_rate, duration, default_probability)
        
        # Calculate additional metrics
        capital_efficiency = available_collateral / security_deposit
        remaining_protection = security_deposit - available_collateral
        protection_ratio = remaining_protection / monthly_rent  # In months of rent
        
        # Store results
        results.append({
            "monthly_rent": monthly_rent,
            "security_deposit": security_deposit,
            "security_deposit_multiplier": security_deposit_multiplier,
            "available_collateral": available_collateral,
            "loan_amount": loan_amount,
            "interest_rate": interest_rate,
            "duration": duration,
            "default_probability": default_probability,
            "outcome": outcome["outcome"],
            "payments_made": outcome["payments_made"],
            "lender_profit": outcome["lender_profit"],
            "borrower_cost": outcome["borrower_cost"],
            "capital_efficiency": capital_efficiency,
            "protection_ratio": protection_ratio
        })
    
    # Convert to DataFrame
    results_df = pd.DataFrame(results)
    
    return results_df

def visualize_monte_carlo_results(results_df):
    """Create visualizations from Monte Carlo simulation results."""
    # Set up the figure
    plt.figure(figsize=(20, 20))
    
    # Plot 1: Distribution of capital efficiency
    plt.subplot(3, 2, 1)
    sns.histplot(results_df['capital_efficiency'], kde=True, ax=plt.gca())
    plt.title('Distribution of Capital Efficiency')
    plt.xlabel('Capital Efficiency (Collateral/Deposit)')
    plt.ylabel('Frequency')
    plt.grid(True)
    
    # Plot 2: Distribution of loan outcomes
    plt.subplot(3, 2, 2)
    outcome_counts = results_df['outcome'].value_counts()
    outcome_counts.plot(kind='pie', autopct='%1.1f%%', ax=plt.gca())
    plt.title('Loan Outcomes')
    plt.ylabel('')
    
    # Plot 3: Lender profit by interest rate and default probability
    plt.subplot(3, 2, 3)
    pivot_table = results_df.pivot_table(
        values='lender_profit', 
        index=pd.cut(results_df['interest_rate'], bins=5), 
        columns=pd.cut(results_df['default_probability'], bins=5),
        aggfunc='mean'
    )
    
    sns.heatmap(pivot_table, annot=True, fmt=".2f", cmap="YlGnBu", ax=plt.gca())
    plt.title('Average Lender Profit by Interest Rate and Default Probability')
    plt.xlabel('Default Probability')
    plt.ylabel('Interest Rate')
    
    # Plot 4: Security deposit multiplier vs protection ratio
    plt.subplot(3, 2, 4)
    sns.scatterplot(
        x='security_deposit_multiplier', 
        y='protection_ratio', 
        hue='outcome', 
        data=results_df,
        ax=plt.gca()
    )
    plt.title('Security Deposit vs Protection Ratio')
    plt.xlabel('Security Deposit (months of rent)')
    plt.ylabel('Protection Ratio (months of rent)')
    plt.grid(True)
    
    # Plot 5: Loan amount distribution by outcome
    plt.subplot(3, 2, 5)
    sns.boxplot(x='outcome', y='loan_amount', data=results_df, ax=plt.gca())
    plt.title('Loan Amounts by Outcome')
    plt.xlabel('Outcome')
    plt.ylabel('Loan Amount (ETH)')
    plt.grid(True)
    
    # Plot 6: Parameter sensitivity analysis for default probability
    plt.subplot(3, 2, 6)
    # Group default probabilities into bins
    results_df['default_prob_bin'] = pd.cut(results_df['default_probability'], bins=10)
    
    # Calculate default rate for each bin
    default_rates = results_df.groupby('default_prob_bin').apply(
        lambda x: (x['outcome'] == 'DEFAULT').mean()
    ).reset_index()
    default_rates.columns = ['default_prob_bin', 'actual_default_rate']
    
    # Extract the bin midpoints for x-axis
    default_rates['bin_midpoint'] = default_rates['default_prob_bin'].apply(
        lambda x: (x.left + x.right) / 2
    )
    
    plt.plot(default_rates['bin_midpoint'], default_rates['actual_default_rate'], 'o-')
    plt.plot([0, 0.15], [0, 0.15], 'r--')  # Diagonal line for comparison
    plt.title('Simulated vs Expected Default Rates')
    plt.xlabel('Input Default Probability')
    plt.ylabel('Actual Default Rate')
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('monte_carlo_results.png', dpi=300)
    plt.show()

def create_parameter_sensitivity_analysis(results_df):
    """Create parameter sensitivity analysis visualizations."""
    # Set up the figure
    plt.figure(figsize=(20, 15))
    
    # List of parameters to analyze
    parameters = [
        'security_deposit_multiplier',
        'interest_rate',
        'duration',
        'default_probability'
    ]
    
    # Metrics to evaluate
    metrics = [
        'capital_efficiency',
        'lender_profit',
        'borrower_cost'
    ]
    
    # Create subplots
    for i, param in enumerate(parameters):
        for j, metric in enumerate(metrics):
            plt.subplot(len(parameters), len(metrics), i*len(metrics) + j + 1)
            
            # Group the parameter into bins
            results_df[f'{param}_bin'] = pd.cut(results_df[param], bins=10)
            
            # Calculate average metric for each bin
            sensitivity = results_df.groupby(f'{param}_bin')[metric].mean().reset_index()
            sensitivity['bin_midpoint'] = sensitivity[f'{param}_bin'].apply(
                lambda x: (x.left + x.right) / 2
            )
            
            plt.plot(sensitivity['bin_midpoint'], sensitivity[metric], 'o-')
            plt.title(f'{metric} vs {param}')
            plt.xlabel(param)
            plt.ylabel(metric)
            plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('parameter_sensitivity.png', dpi=300)
    plt.show()

if __name__ == "__main__":
    # Run Monte Carlo simulation
    results_df = run_monte_carlo_simulation(num_simulations=10000)
    
    # Store results to CSV for further analysis
    results_df.to_csv('monte_carlo_results.csv', index=False)
    
    # Create visualizations
    visualize_monte_carlo_results(results_df)
    create_parameter_sensitivity_analysis(results_df)
    
    # Print summary statistics
    print("Monte Carlo Simulation Summary:")
    print(f"Total simulations: {len(results_df)}")
    print(f"Completed loans: {(results_df['outcome'] == 'COMPLETED').sum()} ({(results_df['outcome'] == 'COMPLETED').mean()*100:.1f}%)")
    print(f"Defaulted loans: {(results_df['outcome'] == 'DEFAULT').sum()} ({(results_df['outcome'] == 'DEFAULT').mean()*100:.1f}%)")
    print(f"Average capital efficiency: {results_df['capital_efficiency'].mean():.2f}")
    print(f"Average lender profit: {results_df['lender_profit'].mean():.2f} ETH")
    print(f"Average borrower cost: {results_df['borrower_cost'].mean():.2f} ETH")
    
    # Calculate optimal parameter ranges
    print("\nOptimal Parameter Ranges:")
    
    # Group by interest rate bins and find ones with highest lender profit
    interest_profit = results_df.groupby(pd.cut(results_df['interest_rate'], bins=5))['lender_profit'].mean()
    optimal_interest = interest_profit.idxmax()
    print(f"Optimal interest rate range: {optimal_interest}")
    
    # Group by security deposit multiplier and find optimal capital efficiency
    deposit_efficiency = results_df.groupby(pd.cut(results_df['security_deposit_multiplier'], bins=5))['capital_efficiency'].mean()
    optimal_deposit = deposit_efficiency.idxmax()
    print(f"Optimal security deposit multiplier: {optimal_deposit}")
    
    # Group by duration and find optimal lender profit
    duration_profit = results_df.groupby('duration')['lender_profit'].mean()
    optimal_duration = duration_profit.idxmax()
    print(f"Optimal loan duration: {optimal_duration} months")