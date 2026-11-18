// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#ifndef BANKMANAGER_H
#define BANKMANAGER_H

#include <memory>
#include <vector>
#include <unordered_map>
#include <string>
#include "BankAccount.h"
#include "Transaction.h"

struct OperatorUser {
    std::string username;
    std::string password;
    std::string fullName;
    std::string role;
};

class BankManager {
private:
    std::unordered_map<std::string, std::unique_ptr<BankAccount>> accounts;
    std::unordered_map<std::string, OperatorUser> operators;
    std::vector<Transaction> allTransactions;
    int accountSequence;
    int transactionSequence;
    std::string storagePath;

    std::string generateAccountNumber(const std::string& type);
    std::string generateTransactionId();
    std::string currentTimestamp() const;
    void saveToDisk() const;
    void loadFromDisk();

public:
    BankManager(const std::string& dbPath = "database/bank_data.db");

    BankAccount* createAccount(const std::string& type, const std::string& holderName,
                               double initialDeposit, double param1 = 0.0, int param2 = 12);

    BankAccount* findAccount(const std::string& accNum) const;
        Transaction deleteAccount(const std::string& accNum, const std::string& officerId, const std::string& authPin);
    bool authenticateOperator(const std::string& username, const std::string& password, OperatorUser& outUser) const;
    Transaction registerOperator(const std::string& newUsername, const std::string& newPassword,
                                 const std::string& fullName, const std::string& role, const std::string& officerPin);
    std::string getAllOperatorsJson() const;
    BankAccount* signupCustomer(const std::string& fullName, const std::string& username,
                                const std::string& password, const std::string& accType, double initialDeposit);
    Transaction processDeposit(const std::string& accNum, double amount);
    Transaction processWithdrawal(const std::string& accNum, double amount);
    Transaction processInterest(const std::string& accNum);
    Transaction processMonthlyFee(const std::string& accNum);

    std::string getAllAccountsJson() const;
    std::string getAccountDetailsJson(const std::string& accNum) const;
    std::string getAllTransactionsJson() const;
    std::string getDashboardStatsJson() const;
};

#endif


