// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#ifndef BANKACCOUNT_H
#define BANKACCOUNT_H

#include <string>
#include <vector>
#include "Transaction.h"

class BankAccount {
protected:
    std::string accountNumber;
    std::string holderName;
    double balance;
    std::string status;
    std::vector<Transaction> transactionHistory;

    std::string getCurrentTimestamp() const;

public:
    BankAccount(std::string accNum, std::string name, double initialBalance);
    virtual ~BankAccount() = default;

    std::string getAccountNumber() const;
    std::string getHolderName() const;
    double getBalance() const;
    std::string getStatus() const;
    const std::vector<Transaction>& getTransactionHistory() const;

    void addExistingTransaction(const Transaction& tx);
    void setStatus(const std::string& newStatus);

    virtual void deposit(double amount, const std::string& txId);
    virtual void withdraw(double amount, const std::string& txId) = 0;
    virtual double calculateInterest() const = 0;
    virtual double applyInterest(const std::string& txId) = 0;
    virtual double applyMonthlyFees(const std::string& txId) = 0;
    virtual std::string getAccountType() const = 0;
    virtual std::string getRulesSummary() const = 0;
    virtual std::string toJson() const;
    virtual std::string serialize() const = 0;
};

#endif
