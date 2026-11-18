// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#include "../include/FixedDepositAccount.h"
#include <stdexcept>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <cmath>

FixedDepositAccount::FixedDepositAccount(std::string accNum, std::string name, double principal,
                                         int months, double rate)
    : BankAccount(accNum, name, principal),
      principalAmount(principal),
      durationMonths(months),
      interestRate(rate),
      prematurePenaltyRate(1.5),
      isMatured(false) {
    if (principal < 5000.0) {
        throw std::invalid_argument("Fixed Deposit requires a minimum principal of Rs. 5000.00.");
    }
    if (months < 3) {
        throw std::invalid_argument("Fixed Deposit minimum lock-in duration is 3 months.");
    }
    maturityDate = computeMaturityDate(months);
}

std::string FixedDepositAccount::computeMaturityDate(int months) const {
    std::time_t now = std::time(nullptr);
    std::tm* ltm = std::localtime(&now);
    ltm->tm_mon += months;
    std::mktime(ltm);
    std::ostringstream oss;
    oss << std::put_time(ltm, "%Y-%m-%d");
    return oss.str();
}

void FixedDepositAccount::deposit(double amount, const std::string& txId) {
    (void)amount;
    (void)txId;
    throw std::runtime_error("Additional deposits are restricted on an active Fixed Deposit Account.");
}

void FixedDepositAccount::withdraw(double amount, const std::string& txId) {
    if (status != "ACTIVE") {
        throw std::runtime_error("Fixed Deposit account is already closed.");
    }
    if (amount <= 0.0) {
        throw std::invalid_argument("Withdrawal amount must be positive.");
    }
    if (std::fabs(amount - balance) > 0.01) {
        throw std::runtime_error("Partial withdrawals are prohibited on Fixed Deposits. Withdraw full balance to liquidate.");
    }

    double penalty = isMatured ? 0.0 : (balance * (prematurePenaltyRate / 100.0));
    double payout = balance - penalty;

    if (penalty > 0.0) {
        Transaction penTx(txId + "-PEN", accountNumber, "FEE", penalty, getCurrentTimestamp(),
                          "SUCCESS", "Premature FD closure penalty (1.5% simulation rule)");
        transactionHistory.push_back(penTx);
    }

    Transaction tx(txId, accountNumber, "WITHDRAWAL", payout, getCurrentTimestamp(),
                   "SUCCESS", isMatured ? "FD Maturity Payout" : "Premature FD Liquidation Payout");
    transactionHistory.push_back(tx);

    balance = 0.0;
    status = "CLOSED";
}

double FixedDepositAccount::calculateInterest() const {
    double years = static_cast<double>(durationMonths) / 12.0;
    return principalAmount * (interestRate / 100.0) * years;
}

double FixedDepositAccount::calculateMaturityAmount() const {
    return principalAmount + calculateInterest();
}

double FixedDepositAccount::applyInterest(const std::string& txId) {
    if (status != "ACTIVE") return 0.0;
    double accrued = calculateInterest();
    balance = principalAmount + accrued;
    isMatured = true;
    std::ostringstream desc;
    desc << std::fixed << std::setprecision(2);
    desc << "FD Maturity Interest credited (" << durationMonths << " mos @ " << interestRate << "% p.a.)";
    Transaction tx(txId, accountNumber, "INTEREST", accrued, getCurrentTimestamp(), "SUCCESS", desc.str());
    transactionHistory.push_back(tx);
    return accrued;
}

double FixedDepositAccount::applyMonthlyFees(const std::string& txId) {
    (void)txId;
    return 0.0;
}

std::string FixedDepositAccount::getAccountType() const { return "Fixed Deposit"; }

std::string FixedDepositAccount::getRulesSummary() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "Rate: " << interestRate << "% p.a. | Tenure: " << durationMonths
        << " mos | Maturity: " << maturityDate << " | Premature Penalty: " << prematurePenaltyRate << "%";
    return oss.str();
}

std::string FixedDepositAccount::toJson() const {
    std::string baseJson = BankAccount::toJson();
    baseJson.pop_back();
    std::ostringstream extra;
    extra << std::fixed << std::setprecision(2);
    extra << ",\"principalAmount\":" << principalAmount
          << ",\"durationMonths\":" << durationMonths
          << ",\"interestRate\":" << interestRate
          << ",\"maturityDate\":\"" << maturityDate << "\""
          << ",\"maturityAmount\":" << calculateMaturityAmount()
          << ",\"isMatured\":" << (isMatured ? "true" : "false") << "}";
    return baseJson + extra.str();
}

std::string FixedDepositAccount::serialize() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "ACC|FD|" << accountNumber << "|" << holderName << "|" << balance << "|"
        << status << "|" << principalAmount << "|" << durationMonths << "|"
        << interestRate << "|" << maturityDate << "|" << (isMatured ? 1 : 0);
    return oss.str();
}

void FixedDepositAccount::setStoredMetadata(const std::string& matDate, bool maturedFlag) {
    maturityDate = matDate;
    isMatured = maturedFlag;
}
