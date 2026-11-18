// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#ifndef TRANSACTION_H
#define TRANSACTION_H

#include <string>

class Transaction {
private:
    std::string transactionId;
    std::string accountNumber;
    std::string type;
    double amount;
    std::string timestamp;
    std::string status;
    std::string description;

public:
    Transaction(std::string txId, std::string accNum, std::string txType,
                double amt, std::string timeStr, std::string txStatus, std::string desc);

    std::string getTransactionId() const;
    std::string getAccountNumber() const;
    std::string getType() const;
    double getAmount() const;
    std::string getTimestamp() const;
    std::string getStatus() const;
    std::string getDescription() const;

    std::string toJson() const;
    std::string serialize() const;
    static Transaction deserialize(const std::string& line);
};

#endif
