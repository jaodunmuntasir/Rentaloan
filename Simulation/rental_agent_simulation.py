import mesa
from mesa import Agent, Model
from mesa.time import RandomActivation
from mesa.datacollection import DataCollector
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

class LandlordAgent(mesa.Agent):
    """Agent representing a landlord in the rental market."""
    
    def __init__(self, unique_id, model, risk_tolerance, property_value):
        super().__init__(unique_id, model)
        self.type = "Landlord"
        self.risk_tolerance = risk_tolerance  # 0.1-0.9, higher means more willing to accept risk
        self.property_value = property_value
        self.rental_agreements = []
        self.total_income = 0
        self.total_losses = 0
    
    def step(self):
        # Decide whether to create a new rental agreement if not at capacity
        if len(self.rental_agreements) < 5:  # Assume landlord has max 5 properties
            self.consider_new_agreement()
    
    def consider_new_agreement(self):
        # Find renters who don't have agreements yet
        available_renters = [agent for agent in self.model.schedule.agents 
                           if agent.type == "Renter" and agent.rental_agreement is None]
        
        if not available_renters:
            return
        
        # Select a renter based on financial stability
        available_renters.sort(key=lambda r: r.financial_stability, reverse=True)
        
        # Only proceed with renters above landlord's risk threshold
        qualified_renters = [r for r in available_renters 
                             if r.financial_stability / 10 >= (1 - self.risk_tolerance)]
        
        if qualified_renters:
            # Create agreement with the most financially stable renter
            selected_renter = qualified_renters[0]
            
            # Set agreement terms
            monthly_rent = self.property_value * 0.005  # 0.5% of property value
            security_deposit = monthly_rent * 3  # 3 months rent for deposit
            
            # Create new agreement
            agreement_id = f"A{len(self.model.all_agreements) + 1}"
            agreement = {
                "id": agreement_id,
                "landlord": self,
                "renter": selected_renter,
                "monthly_rent": monthly_rent,
                "security_deposit": security_deposit,
                "current_deposit": security_deposit,
                "status": "INITIALIZED",
                "months_active": 0,
                "collateralized_amount": 0,
                "grace_period": security_deposit / monthly_rent,
                "months_in_default": 0
            }
            
            self.rental_agreements.append(agreement)
            selected_renter.rental_agreement = agreement
            self.model.all_agreements.append(agreement)
            
            # Activate agreement (renter pays deposit)
            if selected_renter.pay_security_deposit():
                agreement["status"] = "ACTIVE"


class RenterAgent(mesa.Agent):
    """Agent representing a renter in the rental market."""
    
    def __init__(self, unique_id, model, income, savings_rate, financial_stability):
        super().__init__(unique_id, model)
        self.type = "Renter"
        self.income = income  # Monthly income
        self.savings_rate = savings_rate  # 0.05-0.3, percentage of income saved
        self.financial_stability = financial_stability  # 1-10 score, higher is more stable
        self.funds = income * 6 * savings_rate  # Initial funds: 6 months of savings
        self.rental_agreement = None
        self.loan_agreement = None
        self.months_with_liquidity_need = 0
        self.total_loan_costs = 0
    
    def step(self):
        if self.rental_agreement and self.rental_agreement["status"] == "ACTIVE":
            # Monthly update of finances
            self.funds += self.income * self.savings_rate
            
            # Decide whether to pay rent directly or seek a loan
            self.make_rent_payment()
            
            # Check if needs a loan for other expenses
            self.check_liquidity_needs()
    
    def pay_security_deposit(self):
        """Pay the security deposit to activate the rental agreement."""
        if self.rental_agreement and self.rental_agreement["status"] == "INITIALIZED":
            deposit_amount = self.rental_agreement["security_deposit"]
            
            if self.funds >= deposit_amount:
                self.funds -= deposit_amount
                self.rental_agreement["current_deposit"] = deposit_amount
                return True
            else:
                return False
        return False
    
    def make_rent_payment(self):
        """Make the monthly rent payment."""
        if not self.rental_agreement or self.rental_agreement["status"] != "ACTIVE":
            return
        
        rent_amount = self.rental_agreement["monthly_rent"]
        
        # Decision logic: use loan if funds are low
        if self.funds < rent_amount * 2:  # If less than 2 months of rent in savings
            self.request_rent_loan()
        else:
            # Pay rent directly
            self.funds -= rent_amount
            self.rental_agreement["landlord"].total_income += rent_amount
            self.rental_agreement["months_active"] += 1
            
            # Reset any default counter
            self.rental_agreement["months_in_default"] = 0
    
    def request_rent_loan(self):
        """Request a loan to cover rent payment."""
        if self.loan_agreement is not None:
            return  # Already has a loan
        
        # Check if collateral is available
        if not self.rental_agreement:
            return
        
        rent = self.rental_agreement["monthly_rent"]
        security_deposit = self.rental_agreement["current_deposit"]
        
        # Calculate available collateral using the economic model formula
        available_collateral = max(0, security_deposit - (rent * 2))
        
        if available_collateral >= rent:
            # Find available lenders
            lenders = [agent for agent in self.model.schedule.agents 
                       if agent.type == "Lender" and agent.available_funds >= rent]
            
            if lenders:
                # Sort lenders by interest rate (ascending)
                lenders.sort(key=lambda l: l.interest_rate)
                selected_lender = lenders[0]
                
                # Create loan agreement
                loan_id = f"L{len(self.model.all_loans) + 1}"
                loan = {
                    "id": loan_id,
                    "borrower": self,
                    "lender": selected_lender,
                    "rental_agreement": self.rental_agreement,
                    "loan_amount": rent,
                    "collateral_amount": rent,
                    "interest_rate": selected_lender.interest_rate,
                    "duration": 6,  # 6 months loan
                    "status": "INITIALIZED",
                    "months_paid": 0,
                    "monthly_payment": rent * (1 + selected_lender.interest_rate/100) / 6
                }
                
                self.loan_agreement = loan
                selected_lender.loans.append(loan)
                self.model.all_loans.append(loan)
                
                # Fund the loan
                if selected_lender.fund_loan(loan):
                    # Withdraw collateral
                    self.rental_agreement["current_deposit"] -= rent
                    self.rental_agreement["collateralized_amount"] += rent
                    
                    # Update grace period
                    self.rental_agreement["grace_period"] = self.rental_agreement["current_deposit"] / self.rental_agreement["monthly_rent"]
                    
                    # Pay the rent
                    self.rental_agreement["landlord"].total_income += rent
                    self.rental_agreement["months_active"] += 1
                    loan["status"] = "ACTIVE"
                    
                    # Reset any default counter
                    self.rental_agreement["months_in_default"] = 0
    
    def make_loan_payment(self):
        """Make loan payment if has an active loan."""
        if self.loan_agreement and self.loan_agreement["status"] == "ACTIVE":
            payment = self.loan_agreement["monthly_payment"]
            
            if self.funds >= payment:
                self.funds -= payment
                self.loan_agreement["lender"].total_income += payment
                self.loan_agreement["months_paid"] += 1
                self.total_loan_costs += payment
                
                # Check if loan is fully repaid
                if self.loan_agreement["months_paid"] >= self.loan_agreement["duration"]:
                    # Return collateral to rental agreement
                    self.rental_agreement["current_deposit"] += self.loan_agreement["collateral_amount"]
                    self.rental_agreement["collateralized_amount"] -= self.loan_agreement["collateral_amount"]
                    
                    # Update grace period
                    self.rental_agreement["grace_period"] = self.rental_agreement["current_deposit"] / self.rental_agreement["monthly_rent"]
                    
                    # Close loan
                    self.loan_agreement["status"] = "COMPLETED"
                    self.loan_agreement = None
            else:
                # Default on loan
                self.loan_agreement["status"] = "DEFAULTED"
                
                # Lender gets the collateral
                lender = self.loan_agreement["lender"]
                lender.available_funds += self.loan_agreement["collateral_amount"]
                lender.defaults_recovered += self.loan_agreement["collateral_amount"]
                
                # Remove collateralized amount from rental agreement
                self.rental_agreement["collateralized_amount"] -= self.loan_agreement["collateral_amount"]
                
                self.loan_agreement = None
    
    def check_liquidity_needs(self):
        """Simulate other expenses that might require liquidity."""
        if random.random() < 0.1:  # 10% chance of needing extra liquidity each month
            self.months_with_liquidity_need += 1


class LenderAgent(mesa.Agent):
    """Agent representing a lender in the system."""
    
    def __init__(self, unique_id, model, available_funds, interest_rate, risk_appetite):
        super().__init__(unique_id, model)
        self.type = "Lender"
        self.available_funds = available_funds
        self.interest_rate = interest_rate  # Annual interest rate
        self.risk_appetite = risk_appetite  # 0.1-0.9, higher is more willing to take risk
        self.loans = []
        self.total_income = 0
        self.defaults_recovered = 0
    
    def step(self):
        # Make payments on active loans
        for borrower in [loan["borrower"] for loan in self.loans if loan["status"] == "ACTIVE"]:
            borrower.make_loan_payment()
    
    def fund_loan(self, loan):
        """Fund a loan if has sufficient funds."""
        if self.available_funds >= loan["loan_amount"]:
            self.available_funds -= loan["loan_amount"]
            return True
        return False
    
class RentalLoanModel(mesa.Model):
    """Model for the rental loan system."""
    
    def __init__(self, 
                 num_landlords=10, 
                 num_renters=50, 
                 num_lenders=5, 
                 max_steps=120):  # 10 years simulation
        
        super().__init__()
        self.num_landlords = num_landlords
        self.num_renters = num_renters
        self.num_lenders = num_lenders
        self.max_steps = max_steps
        self.schedule = mesa.time.RandomActivation(self)
        self.all_agreements = []
        self.all_loans = []
        
        # Create landlords
        for i in range(self.num_landlords):
            risk_tolerance = np.random.uniform(0.3, 0.8)
            property_value = np.random.uniform(100, 500)
            landlord = LandlordAgent(f"Landlord_{i}", self, risk_tolerance, property_value)
            self.schedule.add(landlord)
        
        # Create renters
        for i in range(self.num_renters):
            income = np.random.uniform(2, 10)
            savings_rate = np.random.uniform(0.05, 0.3)
            financial_stability = np.random.randint(1, 11)
            renter = RenterAgent(f"Renter_{i}", self, income, savings_rate, financial_stability)
            self.schedule.add(renter)
        
        # Create lenders
        for i in range(self.num_lenders):
            available_funds = np.random.uniform(500, 2000)
            interest_rate = np.random.uniform(5, 25)
            risk_appetite = np.random.uniform(0.2, 0.9)
            lender = LenderAgent(f"Lender_{i}", self, available_funds, interest_rate, risk_appetite)
            self.schedule.add(lender)
        
        # Define datacollector
        self.datacollector = mesa.DataCollector(
            model_reporters={
                "Active_Rentals": lambda m: len([a for a in m.all_agreements if a["status"] == "ACTIVE"]),
                "Active_Loans": lambda m: len([l for l in m.all_loans if l["status"] == "ACTIVE"]),
                "Completed_Loans": lambda m: len([l for l in m.all_loans if l["status"] == "COMPLETED"]),
                "Defaulted_Loans": lambda m: len([l for l in m.all_loans if l["status"] == "DEFAULTED"]),
                "Total_Collateralized": lambda m: sum(a["collateralized_amount"] for a in m.all_agreements),
                "Avg_Landlord_Income": lambda m: self.avg_income_by_type("Landlord"),
                "Avg_Lender_Income": lambda m: self.avg_income_by_type("Lender"),
                "Loan_Default_Rate": lambda m: self.calculate_default_rate(),
                "Capital_Efficiency": lambda m: self.calculate_capital_efficiency(),
            },
            agent_reporters={
                "Type": "type",
                "Funds": lambda a: getattr(a, "funds", None),
                "Income": lambda a: getattr(a, "income", None),
                "Financial_Stability": lambda a: getattr(a, "financial_stability", None),
                "Rental_Agreement": lambda a: getattr(a, "rental_agreement", None) is not None,
                "Loan_Agreement": lambda a: getattr(a, "loan_agreement", None) is not None,
                "Loan_Costs": lambda a: getattr(a, "total_loan_costs", 0),
                "Liquidity_Needs": lambda a: getattr(a, "months_with_liquidity_need", 0),
            }
        )
        
        # Collect data at initialization
        self.datacollector.collect(self)
    
    def step(self):
        """Advance the model by one step."""
        self.schedule.step()
        self.datacollector.collect(self)
        
        if self.schedule.steps >= self.max_steps:
            self.running = False
    
    def avg_income_by_type(self, agent_type):
        agents = [agent for agent in self.schedule.agents if agent.type == agent_type]
        if not agents:
            return 0
        return sum(agent.total_income for agent in agents) / len(agents)
    
    def calculate_default_rate(self):
        completed_loans = len([l for l in self.all_loans if l["status"] == "COMPLETED"])
        defaulted_loans = len([l for l in self.all_loans if l["status"] == "DEFAULTED"])
        total_loans = completed_loans + defaulted_loans
        if total_loans == 0:
            return 0
        return defaulted_loans / total_loans
    
    def calculate_capital_efficiency(self):
        total_deposits = sum(a["security_deposit"] for a in self.all_agreements)
        total_collateralized = sum(a["collateralized_amount"] for a in self.all_agreements)
        if total_deposits == 0:
            return 0
        return total_collateralized / total_deposits
    
def run_agent_simulation(steps=120):
    """Run the simulation and return results."""
    model = RentalLoanModel(max_steps=steps)
    
    for i in range(steps):
        model.step()
    
    # Collect the model data
    model_data = model.datacollector.get_model_vars_dataframe()
    agent_data = model.datacollector.get_agent_vars_dataframe()
    
    return model, model_data, agent_data

def visualize_simulation_results(model_data):
    """Create visualizations from simulation results."""
    # Set up the figure
    plt.figure(figsize=(20, 15))
    
    # Plot 1: Activity metrics
    plt.subplot(2, 2, 1)
    model_data[['Active_Rentals', 'Active_Loans']].plot(ax=plt.gca())
    plt.title('System Activity Over Time')
    plt.xlabel('Month')
    plt.ylabel('Count')
    plt.grid(True)
    
    # Plot 2: Loan outcomes
    plt.subplot(2, 2, 2)
    model_data[['Completed_Loans', 'Defaulted_Loans']].plot(ax=plt.gca())
    plt.title('Loan Outcomes Over Time')
    plt.xlabel('Month')
    plt.ylabel('Count')
    plt.grid(True)
    
    # Plot 3: Financial metrics
    plt.subplot(2, 2, 3)
    model_data[['Avg_Landlord_Income', 'Avg_Lender_Income']].plot(ax=plt.gca())
    plt.title('Average Income By Agent Type')
    plt.xlabel('Month')
    plt.ylabel('Income')
    plt.grid(True)
    
    # Plot 4: System efficiency metrics
    plt.subplot(2, 2, 4)
    ax1 = plt.gca()
    ax2 = ax1.twinx()
    
    model_data['Capital_Efficiency'].plot(ax=ax1, color='blue', label='Capital Efficiency')
    model_data['Loan_Default_Rate'].plot(ax=ax2, color='red', label='Default Rate')
    
    ax1.set_xlabel('Month')
    ax1.set_ylabel('Capital Efficiency', color='blue')
    ax2.set_ylabel('Default Rate', color='red')
    
    plt.title('System Efficiency Metrics')
    plt.grid(True)
    
    # Add a common legend
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper center')
    
    plt.tight_layout()
    plt.savefig('agent_simulation_results.png', dpi=300)
    plt.show()

# Run the simulation
if __name__ == "__main__":
    model, model_data, agent_data = run_agent_simulation(steps=120)
    visualize_simulation_results(model_data)
    
    # Additional analysis
    print("Final System Metrics:")
    print(f"Capital Efficiency: {model_data['Capital_Efficiency'].iloc[-1]:.2f}")
    print(f"Loan Default Rate: {model_data['Loan_Default_Rate'].iloc[-1]:.2f}")
    print(f"Total Active Rentals: {model_data['Active_Rentals'].iloc[-1]}")
    print(f"Total Active Loans: {model_data['Active_Loans'].iloc[-1]}")
    print(f"Total Completed Loans: {model_data['Completed_Loans'].iloc[-1]}")
    print(f"Total Defaulted Loans: {model_data['Defaulted_Loans'].iloc[-1]}")