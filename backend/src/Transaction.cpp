// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#include "../include/Transaction.h"
#include <sstream>
#include <iomanip>
#include <vector>

static std::string escapeJson(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        if (c == '"') o << "\\\"";
        else if (c == '\\') o << "\\\\";
        else if (c == '\n') o << "\\n";
        else o << c;
    }
    return o.str();
}

Transaction::Transaction(std::string txId, std::string accNum, std::string txType,
                         double amt, std::string timeStr, std::string txStatus, std::string desc)
    : transactionId(txId), accountNumber(accNum), type(txType),
      amount(amt), timestamp(timeStr), status(txStatus), description(desc) {}

std::string Transaction::getTransactionId() const { return transactionId; }
std::string Transaction::getAccountNumber() const { return accountNumber; }
std::string Transaction::getType() const { return type; }
double Transaction::getAmount() const { return amount; }
std::string Transaction::getTimestamp() const { return timestamp; }
std::string Transaction::getStatus() const { return status; }
std::string Transaction::getDescription() const { return description; }

std::string Transaction::toJson() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "{"
        << "\"transactionId\":\"" << escapeJson(transactionId) << "\","
        << "\"accountNumber\":\"" << escapeJson(accountNumber) << "\","
        << "\"type\":\"" << escapeJson(type) << "\","
        << "\"amount\":" << amount << ","
        << "\"timestamp\":\"" << escapeJson(timestamp) << "\","
        << "\"status\":\"" << escapeJson(status) << "\","
        << "\"description\":\"" << escapeJson(description) << "\""
        << "}";
    return oss.str();
}

std::string Transaction::serialize() const {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "TX|" << transactionId << "|" << accountNumber << "|" << type << "|"
        << amount << "|" << timestamp << "|" << status << "|" << description;
    return oss.str();
}

Transaction Transaction::deserialize(const std::string& line) {
    std::vector<std::string> parts;
    std::stringstream ss(line);
    std::string item;
    while (std::getline(ss, item, '|')) {
        parts.push_back(item);
    }
    if (parts.size() < 8) {
        return Transaction("TX-ERR", "UNKNOWN", "ERROR", 0.0, "", "FAILED", "Corrupted record");
    }
    return Transaction(parts[1], parts[2], parts[3], std::stod(parts[4]), parts[5], parts[6], parts[7]);
}
