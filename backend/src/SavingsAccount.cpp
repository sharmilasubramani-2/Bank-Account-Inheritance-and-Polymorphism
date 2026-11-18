// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#include "../include/SavingsAccount.h"
#include <stdexcept>
#include <sstream>
#include <iomanip>

SavingsAccount::SavingsAccount(std::string accNum, std::string name, double initialBalance,
                               double rate, double minBal)
    : BankAccount(accNum, name, initialBalance),
      interestRate(rate),
      minimumBalance(minBal),
      freeWithdrawalsPerMonth(3),
      withdrawalsThisMonth(0),
      excessWithdrawalFee(50.0) {
    if (initialBalance < minimumBalance) {
        throw std::invalid_argument("Savings Account requires minimum initial balance of Rs. 1000.00.");
    }
}

void SavingsAccount::withdraw(double amount, const std::string& txId) {
    if (status != "ACTIVE") {
        throw std::runtime_error("Account is not active.");
    }
    if (amount <= 0.0) {
        throw std::invalid_argument("Withdrawal amount must be greater than zero.");
    }

    double fee = (withdrawalsThisMonth >= freeWithdrawalsPerMonth) ? excessWithdrawalFee : 0.0;
    double totalDeduction = amount + fee;

    if (balance - totalDeduction < minimumBalance) {
        std::ostringstream err;
        err << std::fixed << std::setprecision(2);
        err << "Withdrawal rejected: Minimum balance of Rs. " << minimumBalance
            << " must be maintained (Required: Rs. " << totalDeduction << ").";
        throw std::runtime_error(err.str());
    }

    balance -= totalDeduction;
    withdrawalsThisMonth++;

    std::ostringstream desc;
    desc << "Savings withdrawal executed";
    if (fee > 0.0) {
        desc << " (includes Rs. 50.00 excess withdrawal fee)";
    }

    Transaction tx(txId, accountNumber, "WITHDRAWAL", amount, getCurrentTimestamp(), "SUCCESS", desc.str());
    transactionHistory.push_back(tx);

    if (fee > 0.0) {
        Transaction feeTx(txId + "-FEE", accountNumber, "FEE", fee, getCurrentTimestamp(),
                          "SUCCESS", "Excess monthly withdrawal charge (>3 withdrawals)");
        transactionHistory.push_back(feeTx);
    }
}

double SavingsAccount::calculateInterest() const {
    return (balance * (interestRate / 100.0)) / 12.0;
}

double SavingsAccount::applyInterest(const std::string& txId) {
    if (status != "ACTIVE") return 0.0;
    double interest = calculateInterest();
    if (interest > 0.0) {
        balance += interest;
        std::ostringstream desc;
        desc << std::fixed << std::setprecision(2);
        desc << "Monthly Savings interest credited at " << interestRate << "% p.a.";
        Transaction tx(txId, accountNumber, "INTEREST", interest, getCurrentTimestamp(), "SUCCESS", desc.str());
        transactionHistory.push_back(tx);
    }
    return interest;
}

double SavingsAccount::applyMonthlyFees(const std::string& txId) {
    withdrawalsThisMonth = 0;
    if (balance < minimumBalance && status == "ACTIVE") {
        double penalty = 100.0;
        balance -= penalty;
        Transaction tx(txId, accountNumber, "FEE", penalty, getCurrentTimestamp(),
                       "SUCCESS", "Minimum balance non-maintenance fee");
        transactionHistory.push_back(tx);
        return penalty;
    }
    return 0.0;
}

std::string SavingsAccount::getAccountType() const { return "Savings Account"; }

std::string SavingsAccount::getRulesSummary() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "Interest: " << interestRate << "% p.a. | Min Balance: Rs. " << minimumBalance
        << " | Free Withdrawals: " << withdrawalsThisMonth << "/" << freeWithdrawalsPerMonth << " used";
    return oss.str();
}

std::string SavingsAccount::toJson() const {
    std::string baseJson = BankAccount::toJson();
    baseJson.pop_back();
    std::ostringstream extra;
    extra << std::fixed << std::setprecision(2);
    extra << ",\"interestRate\":" << interestRate
          << ",\"minimumBalance\":" << minimumBalance
          << ",\"withdrawalsUsed\":" << withdrawalsThisMonth
          << ",\"freeWithdrawals\":" << freeWithdrawalsPerMonth << "}";
    return baseJson + extra.str();
}

std::string SavingsAccount::serialize() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "ACC|SAVINGS|" << accountNumber << "|" << holderName << "|" << balance << "|"
        << status << "|" << interestRate << "|" << minimumBalance << "|" << withdrawalsThisMonth;
    return oss.str();
}

void SavingsAccount::setWithdrawalsThisMonth(int count) {
    withdrawalsThisMonth = count;
}
