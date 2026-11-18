// Aarav Nair / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#include "../include/BankManager.h"
#include "../include/SavingsAccount.h"
#include "../include/CurrentAccount.h"
#include "../include/FixedDepositAccount.h"
#include <fstream>
#include <sstream>
#include <iomanip>
#include <stdexcept>
#include <ctime>

BankManager::BankManager(const std::string& dbPath)
    : accountSequence(1001), transactionSequence(5001), storagePath(dbPath) {
            loadFromDisk();
    operators["officer"] = {"officer", "ADMIN2026", "Superior Officer (SUP-01)", "SUPERIOR_OFFICER"};
    operators["teller"] = {"teller", "BANK2026", "Operations Teller (TLR-04)", "BANK_TELLER"};
    operators["sharmila"] = {"sharmila", "CUST2026", "Sharmila", "CUSTOMER"};
    operators.erase("aarav");
    if (accounts.empty()) {
        createAccount("SAVINGS", "Aarav Nair", 15000.0);
        createAccount("CURRENT", "Apex Tech Solutions", 45000.0);
        createAccount("FD", "Aarav Nair", 50000.0, 0.0, 12);
    }
}

std::string BankManager::generateAccountNumber(const std::string& type) {
    std::string prefix = "ACC";
    if (type == "SAVINGS") prefix = "SAV";
    else if (type == "CURRENT") prefix = "CUR";
    else if (type == "FD") prefix = "FDX";
    return prefix + "-" + std::to_string(accountSequence++);
}

std::string BankManager::generateTransactionId() {
    return "TXN-" + std::to_string(transactionSequence++);
}

std::string BankManager::currentTimestamp() const {
    std::time_t now = std::time(nullptr);
    std::tm* ltm = std::localtime(&now);
    std::ostringstream oss;
    oss << std::put_time(ltm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

BankAccount* BankManager::createAccount(const std::string& type, const std::string& holderName,
                                        double initialDeposit, double param1, int param2) {
    std::string accNum = generateAccountNumber(type);
    std::unique_ptr<BankAccount> newAcc;

    if (type == "SAVINGS") {
        double minBal = (param1 > 0.0) ? param1 : 1000.0;
        newAcc = std::make_unique<SavingsAccount>(accNum, holderName, initialDeposit, 4.5, minBal);
    } else if (type == "CURRENT") {
        double overdraft = (param1 > 0.0) ? param1 : 25000.0;
        newAcc = std::make_unique<CurrentAccount>(accNum, holderName, initialDeposit, overdraft, 250.0);
    } else if (type == "FD") {
        int months = (param2 >= 3) ? param2 : 12;
        newAcc = std::make_unique<FixedDepositAccount>(accNum, holderName, initialDeposit, months, 7.25);
    } else {
        throw std::invalid_argument("Unsupported account type specified.");
    }

    Transaction initTx(generateTransactionId(), accNum, "OPENING_DEPOSIT", initialDeposit,
                       currentTimestamp(), "SUCCESS", "Initial account opening deposit");
    newAcc->addExistingTransaction(initTx);
    allTransactions.push_back(initTx);

    BankAccount* rawPtr = newAcc.get();
    accounts[accNum] = std::move(newAcc);
    saveToDisk();
    return rawPtr;
}

BankAccount* BankManager::findAccount(const std::string& accNum) const {
    auto it = accounts.find(accNum);
    if (it == accounts.end()) {
        throw std::runtime_error("Account not found: " + accNum);
    }
    return it->second.get();
}

Transaction BankManager::deleteAccount(const std::string& accNum, const std::string& officerId, const std::string& authPin) {
    auto it = accounts.find(accNum);
    if (it == accounts.end()) {
        throw std::runtime_error("Account not found: " + accNum);
    }
    if (officerId.empty() || authPin != "ADMIN2026") {
        Transaction rejected(generateTransactionId(), accNum, "ACCOUNT_DELETE_ATTEMPT", 0.0,
                             currentTimestamp(), "REJECTED",
                             "Unauthorized deletion blocked: Invalid Superior Officer credentials (" + (officerId.empty() ? "UNKNOWN" : officerId) + ")");
        allTransactions.push_back(rejected);
        saveToDisk();
        throw std::runtime_error("Access Denied: Only an authorized Superior Officer can delete accounts.");
    }
    double bal = it->second->getBalance();
    if (bal > 0.01) {
        throw std::runtime_error("Cannot delete account with positive balance. Withdraw or liquidate funds first.");
    }
    if (bal < -0.01) {
        throw std::runtime_error("Cannot delete Current Account with unsettled overdraft dues.");
    }
    std::string holder = it->second->getHolderName();
    std::string type = it->second->getAccountType();
    accounts.erase(it);

    Transaction tx(generateTransactionId(), accNum, "ACCOUNT_DELETED", 0.0,
                   currentTimestamp(), "SUCCESS",
                   type + " (" + holder + ") permanently closed by Superior Officer " + officerId);
        allTransactions.push_back(tx);
    saveToDisk();
    return tx;
}

bool BankManager::authenticateOperator(const std::string& username, const std::string& password, OperatorUser& outUser) const {
    std::string lookup = (username == "Superior Officer" || username == "SUP-01") ? "officer" : ((username == "Bank Teller") ? "teller" : username); auto it = operators.find(lookup);
    if (it != operators.end() && it->second.password == password) {
        outUser = it->second;
        return true;
    }
    return false;
}

Transaction BankManager::registerOperator(const std::string& newUsername, const std::string& newPassword,
                                          const std::string& fullName, const std::string& role, const std::string& officerPin) {
    if (officerPin != "ADMIN2026") {
        throw std::runtime_error("Access Denied: Superior Officer security PIN required to register users.");
    }
    if (newUsername.empty() || newPassword.length() < 4 || fullName.empty()) {
        throw std::invalid_argument("Username, full name, and password (min 4 chars) are required.");
    }
    if (operators.find(newUsername) != operators.end()) {
        throw std::runtime_error("Username already exists: " + newUsername);
    }
    std::string assignedRole = (role == "SUPERIOR_OFFICER") ? "SUPERIOR_OFFICER" : ((role == "CUSTOMER") ? "CUSTOMER" : "BANK_TELLER");
    operators[newUsername] = {newUsername, newPassword, fullName, assignedRole};

    Transaction tx(generateTransactionId(), newUsername, "USER_REGISTERED", 0.0,
                   currentTimestamp(), "SUCCESS",
                   "Registered " + fullName + " (" + assignedRole + ") by Superior Officer");
    allTransactions.push_back(tx);
    saveToDisk();
    return tx;
}

std::string BankManager::getAllOperatorsJson() const {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    for (const auto& pair : operators) {
        if (!first) oss << ",";
        oss << "{"
            << "\"username\":\"" << pair.second.username << "\","
            << "\"fullName\":\"" << pair.second.fullName << "\","
            << "\"role\":\"" << pair.second.role << "\""
            << "}";
        first = false;
    }
    oss << "]";
    return oss.str();
}

BankAccount* BankManager::signupCustomer(const std::string& fullName, const std::string& username,
                                         const std::string& password, const std::string& accType, double initialDeposit) {
    if (fullName.empty() || username.empty() || password.length() < 4) {
        throw std::invalid_argument("Full name, username, and password (min 4 characters) are required.");
    }
    if (operators.find(username) != operators.end()) {
        throw std::runtime_error("Username '" + username + "' is already taken. Please choose another.");
    }

    BankAccount* created = createAccount(accType, fullName, initialDeposit, 0.0, 12);
    operators[username] = {username, password, fullName, "CUSTOMER"};

    Transaction regTx(generateTransactionId(), username, "CUSTOMER_SIGNUP", 0.0,
                      currentTimestamp(), "SUCCESS",
                      "Self-service customer registered: " + fullName + " (" + created->getAccountNumber() + ")");
    allTransactions.push_back(regTx);
    saveToDisk();
    return created;
}

Transaction BankManager::processDeposit(const std::string& accNum, double amount) {
    BankAccount* acc = findAccount(accNum);
    std::string txId = generateTransactionId();
    try {
        acc->deposit(amount, txId);
        const auto& history = acc->getTransactionHistory();
        Transaction latest = history.back();
        allTransactions.push_back(latest);
        saveToDisk();
        return latest;
    } catch (const std::exception& ex) {
        Transaction rejected(txId, accNum, "DEPOSIT", amount, currentTimestamp(), "REJECTED", ex.what());
        acc->addExistingTransaction(rejected);
        allTransactions.push_back(rejected);
        saveToDisk();
        return rejected;
    }
}

Transaction BankManager::processWithdrawal(const std::string& accNum, double amount) {
    BankAccount* acc = findAccount(accNum);
    std::string txId = generateTransactionId();
    size_t prevCount = acc->getTransactionHistory().size();
    try {
        acc->withdraw(amount, txId);
        const auto& history = acc->getTransactionHistory();
        for (size_t i = prevCount; i < history.size(); ++i) {
            allTransactions.push_back(history[i]);
        }
        saveToDisk();
        return history[prevCount];
    } catch (const std::exception& ex) {
        Transaction rejected(txId, accNum, "WITHDRAWAL", amount, currentTimestamp(), "REJECTED", ex.what());
        acc->addExistingTransaction(rejected);
        allTransactions.push_back(rejected);
        saveToDisk();
        return rejected;
    }
}

Transaction BankManager::processInterest(const std::string& accNum) {
    BankAccount* acc = findAccount(accNum);
    std::string txId = generateTransactionId();
    double credited = acc->applyInterest(txId);
    if (credited > 0.0) {
        Transaction latest = acc->getTransactionHistory().back();
        allTransactions.push_back(latest);
        saveToDisk();
        return latest;
    }
    return Transaction(txId, accNum, "INTEREST", 0.0, currentTimestamp(), "SKIPPED", "No interest applicable for this account");
}

Transaction BankManager::processMonthlyFee(const std::string& accNum) {
    BankAccount* acc = findAccount(accNum);
    std::string txId = generateTransactionId();
    double fee = acc->applyMonthlyFees(txId);
    if (fee > 0.0) {
        Transaction latest = acc->getTransactionHistory().back();
        allTransactions.push_back(latest);
        saveToDisk();
        return latest;
    }
    saveToDisk();
    return Transaction(txId, accNum, "FEE", 0.0, currentTimestamp(), "SKIPPED", "No monthly fee applicable");
}

std::string BankManager::getAllAccountsJson() const {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    for (const auto& pair : accounts) {
        if (!first) oss << ",";
        oss << pair.second->toJson();
        first = false;
    }
    oss << "]";
    return oss.str();
}

std::string BankManager::getAccountDetailsJson(const std::string& accNum) const {
    BankAccount* acc = findAccount(accNum);
    return acc->toJson();
}

std::string BankManager::getAllTransactionsJson() const {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < allTransactions.size(); ++i) {
        oss << allTransactions[allTransactions.size() - 1 - i].toJson();
        if (i + 1 < allTransactions.size()) oss << ",";
    }
    oss << "]";
    return oss.str();
}

std::string BankManager::getDashboardStatsJson() const {
    int totalAccounts = 0, savingsCount = 0, currentCount = 0, fdCount = 0;
    double totalBalance = 0.0, totalDeposits = 0.0, totalWithdrawals = 0.0;

    for (const auto& pair : accounts) {
        totalAccounts++;
        totalBalance += pair.second->getBalance();
        std::string type = pair.second->getAccountType();
        if (type == "Savings Account") savingsCount++;
        else if (type == "Current Account") currentCount++;
        else if (type == "Fixed Deposit") fdCount++;
    }

    for (const auto& tx : allTransactions) {
        if (tx.getStatus() == "SUCCESS") {
            if (tx.getType() == "DEPOSIT" || tx.getType() == "OPENING_DEPOSIT") {
                totalDeposits += tx.getAmount();
            } else if (tx.getType() == "WITHDRAWAL") {
                totalWithdrawals += tx.getAmount();
            }
        }
    }

    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2);
    oss << "{"
        << "\"totalAccounts\":" << totalAccounts << ","
        << "\"totalBalance\":" << totalBalance << ","
        << "\"totalDeposits\":" << totalDeposits << ","
        << "\"totalWithdrawals\":" << totalWithdrawals << ","
        << "\"savingsCount\":" << savingsCount << ","
        << "\"currentCount\":" << currentCount << ","
        << "\"fdCount\":" << fdCount
        << "}";
    return oss.str();
}

void BankManager::saveToDisk() const {
    std::ofstream out(storagePath);
    if (!out.is_open()) return;
        out << "META|" << accountSequence << "|" << transactionSequence << "\n";
    for (const auto& pair : operators) {
        out << "USR|" << pair.second.username << "|" << pair.second.password << "|"
            << pair.second.fullName << "|" << pair.second.role << "\n";
    }
    for (const auto& pair : accounts) {
        out << pair.second->serialize() << "\n";
    }
    for (const auto& tx : allTransactions) {
        out << tx.serialize() << "\n";
    }
}

void BankManager::loadFromDisk() {
    std::ifstream in(storagePath);
    if (!in.is_open()) return;

    std::string line;
    while (std::getline(in, line)) {
        if (line.empty()) continue;
        std::vector<std::string> parts;
        std::stringstream ss(line);
        std::string item;
        while (std::getline(ss, item, '|')) parts.push_back(item);

                if (parts[0] == "META" && parts.size() >= 3) {
            accountSequence = std::stoi(parts[1]);
            transactionSequence = std::stoi(parts[2]);
        } else if (parts[0] == "USR" && parts.size() >= 5) {
            operators[parts[1]] = {parts[1], parts[2], parts[3], parts[4]};
        } else if (parts[0] == "ACC" && parts.size() >= 7) {
            std::string subType = parts[1];
            std::string accNum = parts[2];
            std::string name = parts[3];
            double bal = std::stod(parts[4]);
            std::string st = parts[5];

            if (subType == "SAVINGS" && parts.size() >= 9) {
                auto acc = std::make_unique<SavingsAccount>(accNum, name, std::max(bal, std::stod(parts[7])),
                                                            std::stod(parts[6]), std::stod(parts[7]));
                acc->setWithdrawalsThisMonth(std::stoi(parts[8]));
                acc->setStatus(st);
                accounts[accNum] = std::move(acc);
            } else if (subType == "CURRENT" && parts.size() >= 8) {
                auto acc = std::make_unique<CurrentAccount>(accNum, name, bal,
                                                            std::stod(parts[6]), std::stod(parts[7]));
                acc->setStatus(st);
                accounts[accNum] = std::move(acc);
            } else if (subType == "FD" && parts.size() >= 11) {
                double principal = std::stod(parts[6]);
                auto acc = std::make_unique<FixedDepositAccount>(accNum, name, std::max(principal, 5000.0),
                                                                 std::stoi(parts[7]), std::stod(parts[8]));
                acc->setStoredMetadata(parts[9], std::stoi(parts[10]) == 1);
                acc->setStatus(st);
                accounts[accNum] = std::move(acc);
            }
        } else if (parts[0] == "TX") {
            Transaction tx = Transaction::deserialize(line);
            allTransactions.push_back(tx);
            auto it = accounts.find(tx.getAccountNumber());
            if (it != accounts.end()) {
                it->second->addExistingTransaction(tx);
            }
        }
    }
}




