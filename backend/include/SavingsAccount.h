// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#ifndef SAVINGSACCOUNT_H
#define SAVINGSACCOUNT_H

#include "BankAccount.h"

class SavingsAccount : public BankAccount {
private:
    double interestRate;
    double minimumBalance;
    int freeWithdrawalsPerMonth;
    int withdrawalsThisMonth;
    double excessWithdrawalFee;

public:
    SavingsAccount(std::string accNum, std::string name, double initialBalance,
                   double rate = 4.5, double minBal = 1000.0);

    void withdraw(double amount, const std::string& txId) override;
    double calculateInterest() const override;
    double applyInterest(const std::string& txId) override;
    double applyMonthlyFees(const std::string& txId) override;
    std::string getAccountType() const override;
    std::string getRulesSummary() const override;
    std::string toJson() const override;
    std::string serialize() const override;

    void setWithdrawalsThisMonth(int count);
};

#endif
