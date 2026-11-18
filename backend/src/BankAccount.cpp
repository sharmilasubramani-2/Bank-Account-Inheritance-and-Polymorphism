// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#include "../include/BankAccount.h"
#include <stdexcept>
#include <ctime>
#include <sstream>
#include <iomanip>

BankAccount::BankAccount(std::string accNum, std::string name, double initialBalance)
    : accountNumber(accNum), holderName(name), balance(initialBalance), status("ACTIVE") {
    if (holderName.empty()) {
        throw std::invalid_argument("Account holder name cannot be empty.");
    }
    if (initialBalance < 0.0) {
        throw std::invalid_argument("Initial deposit cannot be negative.");
    }
}

std::string BankAccount::getCurrentTimestamp() const {
    std::time_t now = std::time(nullptr);
    std::tm* ltm = std::localtime(&now);
    std::ostringstream oss;
    oss << std::put_time(ltm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

std::string BankAccount::getAccountNumber() const { return accountNumber; }
std::string BankAccount::getHolderName() const { return holderName; }
double BankAccount::getBalance() const { return balance; }
std::string BankAccount::getStatus() const { return status; }
const std::vector<Transaction>& BankAccount::getTransactionHistory() const { return transactionHistory; }

void BankAccount::addExistingTransaction(const Transaction& tx) {
    transactionHistory.push_back(tx);
}

void BankAccount::setStatus(const std::string& newStatus) {
    status = newStatus;
}

void BankAccount::deposit(double amount, const std::string& txId) {
    if (status != "ACTIVE") {
        throw std::runtime_error("Cannot deposit into a closed or inactive account.");
    }
    if (amount <= 0.0) {
        throw std::invalid_argument("Deposit amount must be greater than zero.");
    }
    balance += amount;
    Transaction tx(txId, accountNumber, "DEPOSIT", amount, getCurrentTimestamp(),
                   "SUCCESS", "Cash/Online deposit credited");
    transactionHistory.push_back(tx);
}

std::string BankAccount::toJson() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "{"
        << "\"accountNumber\":\"" << accountNumber << "\","
        << "\"holderName\":\"" << holderName << "\","
        << "\"accountType\":\"" << getAccountType() << "\","
        << "\"balance\":" << balance << ","
        << "\"status\":\"" << status << "\","
        << "\"projectedInterest\":" << calculateInterest() << ","
        << "\"rulesSummary\":\"" << getRulesSummary() << "\","
        << "\"transactions\":[";
    for (size_t i = 0; i < transactionHistory.size(); ++i) {
        oss << transactionHistory[i].toJson();
        if (i + 1 < transactionHistory.size()) oss << ",";
    }
    oss << "]}";
    return oss.str();
}
