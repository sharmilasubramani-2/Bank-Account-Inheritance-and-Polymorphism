// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#include "../include/CurrentAccount.h"
#include <stdexcept>
#include <sstream>
#include <iomanip>

CurrentAccount::CurrentAccount(std::string accNum, std::string name, double initialBalance,
                               double overdraft, double monthlyFee)
    : BankAccount(accNum, name, initialBalance),
      overdraftLimit(overdraft),
      monthlyServiceFee(monthlyFee),
      transactionFee(15.0) {}

void CurrentAccount::withdraw(double amount, const std::string& txId) {
    if (status != "ACTIVE") {
        throw std::runtime_error("Account is not active.");
    }
    if (amount <= 0.0) {
        throw std::invalid_argument("Withdrawal amount must be greater than zero.");
    }

    double totalDeduction = amount + transactionFee;
    if (balance - totalDeduction < -overdraftLimit) {
        std::ostringstream err;
        err << std::fixed << std::setprecision(2);
        err << "Withdrawal rejected: Exceeds Current Account overdraft limit of Rs. " << overdraftLimit << ".";
        throw std::runtime_error(err.str());
    }

    balance -= totalDeduction;

    Transaction tx(txId, accountNumber, "WITHDRAWAL", amount, getCurrentTimestamp(),
                   "SUCCESS", "Current account business withdrawal");
    transactionHistory.push_back(tx);

    Transaction feeTx(txId + "-FEE", accountNumber, "FEE", transactionFee, getCurrentTimestamp(),
                      "SUCCESS", "Current account per-transaction service charge");
    transactionHistory.push_back(feeTx);
}

double CurrentAccount::calculateInterest() const {
    return 0.0;
}

double CurrentAccount::applyInterest(const std::string& txId) {
    (void)txId;
    return 0.0;
}

double CurrentAccount::applyMonthlyFees(const std::string& txId) {
    if (status != "ACTIVE") return 0.0;
    balance -= monthlyServiceFee;
    Transaction tx(txId, accountNumber, "FEE", monthlyServiceFee, getCurrentTimestamp(),
                   "SUCCESS", "Monthly Current Account maintenance fee");
    transactionHistory.push_back(tx);
    return monthlyServiceFee;
}

std::string CurrentAccount::getAccountType() const { return "Current Account"; }

std::string CurrentAccount::getRulesSummary() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "Interest: 0.00% | Overdraft Limit: Rs. " << overdraftLimit
        << " | Tx Fee: Rs. " << transactionFee << " | Monthly Fee: Rs. " << monthlyServiceFee;
    return oss.str();
}

std::string CurrentAccount::toJson() const {
    std::string baseJson = BankAccount::toJson();
    baseJson.pop_back();
    std::ostringstream extra;
    extra << std::fixed << std::setprecision(2);
    extra << ",\"overdraftLimit\":" << overdraftLimit
          << ",\"monthlyServiceFee\":" << monthlyServiceFee
          << ",\"transactionFee\":" << transactionFee << "}";
    return baseJson + extra.str();
}

std::string CurrentAccount::serialize() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "ACC|CURRENT|" << accountNumber << "|" << holderName << "|" << balance << "|"
        << status << "|" << overdraftLimit << "|" << monthlyServiceFee << "|0";
    return oss.str();
}
