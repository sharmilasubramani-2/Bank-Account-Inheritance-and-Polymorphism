// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#ifndef FIXEDDEPOSITACCOUNT_H
#define FIXEDDEPOSITACCOUNT_H

#include "BankAccount.h"

class FixedDepositAccount : public BankAccount {
private:
    double principalAmount;
    int durationMonths;
    double interestRate;
    std::string maturityDate;
    double prematurePenaltyRate;
    bool isMatured;

    std::string computeMaturityDate(int months) const;

public:
    FixedDepositAccount(std::string accNum, std::string name, double principal,
                        int months = 12, double rate = 7.25);

    void deposit(double amount, const std::string& txId) override;
    void withdraw(double amount, const std::string& txId) override;
    double calculateInterest() const override;
    double calculateMaturityAmount() const;
    double applyInterest(const std::string& txId) override;
    double applyMonthlyFees(const std::string& txId) override;
    std::string getAccountType() const override;
    std::string getRulesSummary() const override;
    std::string toJson() const override;
    std::string serialize() const override;

    void setStoredMetadata(const std::string& matDate, bool maturedFlag);
};

#endif
