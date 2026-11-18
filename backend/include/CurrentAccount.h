// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#ifndef CURRENTACCOUNT_H
#define CURRENTACCOUNT_H

#include "BankAccount.h"

class CurrentAccount : public BankAccount {
private:
    double overdraftLimit;
    double monthlyServiceFee;
    double transactionFee;

public:
    CurrentAccount(std::string accNum, std::string name, double initialBalance,
                   double overdraft = 25000.0, double monthlyFee = 250.0);

    void withdraw(double amount, const std::string& txId) override;
    double calculateInterest() const override;
    double applyInterest(const std::string& txId) override;
    double applyMonthlyFees(const std::string& txId) override;
    std::string getAccountType() const override;
    std::string getRulesSummary() const override;
    std::string toJson() const override;
    std::string serialize() const override;
};

#endif
