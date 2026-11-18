#include <cstdlib>
// SHARMILA S / 192525011 | DSA0111 OOPS C++ CAPSTONE | TEAM 16
#define _WIN32_WINNT 0x0A00
#include "../include/httplib.h"
#include "../include/BankManager.h"
#include <iostream>
#include <string>
#include <regex>

static std::string extractJsonString(const std::string& body, const std::string& key) {
    std::regex re("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"");
    std::smatch match;
    if (std::regex_search(body, match, re)) {
        return match[1].str();
    }
    return "";
}

static double extractJsonNumber(const std::string& body, const std::string& key, double fallback = 0.0) {
    std::regex re("\"" + key + "\"\\s*:\\s*(-?[0-9]+(?:\\.[0-9]+)?)");
    std::smatch match;
    if (std::regex_search(body, match, re)) {
        return std::stod(match[1].str());
    }
    return fallback;
}

int main() {
    BankManager bank("database/bank_data.db");
    httplib::Server svr;

        svr.set_mount_point("/", "./frontend");

    svr.Post("/api/login", [&](const httplib::Request& req, httplib::Response& res) {
        std::string user = extractJsonString(req.body, "username");
        std::string pass = extractJsonString(req.body, "password");

        OperatorUser op;
        if (bank.authenticateOperator(user, pass, op)) {
            res.set_content("{\"authenticated\":true,\"username\":\"" + op.username +
                            "\",\"role\":\"" + op.role + "\",\"displayName\":\"" + op.fullName + "\"}", "application/json");
        } else {
            res.status = 401;
            res.set_content("{\"authenticated\":false,\"error\":\"Invalid username or password.\"}", "application/json");
        }
    });

    svr.Post("/api/signup", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string fullName = extractJsonString(req.body, "fullName");
            std::string username = extractJsonString(req.body, "username");
            std::string password = extractJsonString(req.body, "password");
            std::string accType = extractJsonString(req.body, "accountType");
            double initialDeposit = extractJsonNumber(req.body, "initialDeposit", 1000.0);

            BankAccount* acc = bank.signupCustomer(fullName, username, password, accType, initialDeposit);
            res.status = 201;
            res.set_content("{\"authenticated\":true,\"username\":\"" + username +
                            "\",\"role\":\"CUSTOMER\",\"displayName\":\"" + fullName +
                            "\",\"accountNumber\":\"" + acc->getAccountNumber() + "\"}", "application/json");
        } catch (const std::exception& ex) {
            res.status = 400;
            res.set_content("{\"authenticated\":false,\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Get("/api/operators", [&](const httplib::Request&, httplib::Response& res) {
        res.set_content(bank.getAllOperatorsJson(), "application/json");
    });

    svr.Post("/api/operators", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string newUser = extractJsonString(req.body, "username");
            std::string newPass = extractJsonString(req.body, "password");
            std::string fullName = extractJsonString(req.body, "fullName");
            std::string role = extractJsonString(req.body, "role");
            std::string officerPin = extractJsonString(req.body, "officerPin");

            Transaction tx = bank.registerOperator(newUser, newPass, fullName, role, officerPin);
            res.status = 201;
            res.set_content(tx.toJson(), "application/json");
        } catch (const std::exception& ex) {
            res.status = 403;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Get("/api/stats", [&](const httplib::Request&, httplib::Response& res) {
        res.set_content(bank.getDashboardStatsJson(), "application/json");
    });

    svr.Get("/api/accounts", [&](const httplib::Request&, httplib::Response& res) {
        res.set_content(bank.getAllAccountsJson(), "application/json");
    });

    svr.Get(R"(/api/accounts/([A-Za-z0-9\-]+))", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string accNum = req.matches[1];
            res.set_content(bank.getAccountDetailsJson(accNum), "application/json");
        } catch (const std::exception& ex) {
            res.status = 404;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Post("/api/accounts", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string type = extractJsonString(req.body, "accountType");
            std::string name = extractJsonString(req.body, "holderName");
            double initialDeposit = extractJsonNumber(req.body, "initialDeposit", 0.0);
            double param1 = extractJsonNumber(req.body, "param1", 0.0);
            int param2 = static_cast<int>(extractJsonNumber(req.body, "param2", 12));

            BankAccount* created = bank.createAccount(type, name, initialDeposit, param1, param2);
            res.status = 201;
            res.set_content(created->toJson(), "application/json");
        } catch (const std::exception& ex) {
            res.status = 400;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Post("/api/transactions/deposit", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string accNum = extractJsonString(req.body, "accountNumber");
            double amount = extractJsonNumber(req.body, "amount", 0.0);
            Transaction tx = bank.processDeposit(accNum, amount);
            res.set_content(tx.toJson(), "application/json");
        } catch (const std::exception& ex) {
            res.status = 400;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Post("/api/transactions/withdraw", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string accNum = extractJsonString(req.body, "accountNumber");
            double amount = extractJsonNumber(req.body, "amount", 0.0);
            Transaction tx = bank.processWithdrawal(accNum, amount);
            res.set_content(tx.toJson(), "application/json");
        } catch (const std::exception& ex) {
            res.status = 400;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Post("/api/transactions/interest", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string accNum = extractJsonString(req.body, "accountNumber");
            Transaction tx = bank.processInterest(accNum);
            res.set_content(tx.toJson(), "application/json");
        } catch (const std::exception& ex) {
            res.status = 400;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Post("/api/transactions/fee", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string accNum = extractJsonString(req.body, "accountNumber");
            Transaction tx = bank.processMonthlyFee(accNum);
            res.set_content(tx.toJson(), "application/json");
        } catch (const std::exception& ex) {
            res.status = 400;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

        svr.Delete(R"(/api/accounts/([A-Za-z0-9\-]+))", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string accNum = req.matches[1];
            std::string officerId = extractJsonString(req.body, "officerId");
            std::string authPin = extractJsonString(req.body, "authPin");
            Transaction tx = bank.deleteAccount(accNum, officerId, authPin);
            res.set_content(tx.toJson(), "application/json");
        } catch (const std::exception& ex) {
            res.status = 403;
            res.set_content("{\"error\":\"" + std::string(ex.what()) + "\"}", "application/json");
        }
    });

    svr.Get("/api/transactions", [&](const httplib::Request&, httplib::Response& res) {
        res.set_content(bank.getAllTransactionsJson(), "application/json");
    });

    std::cout << "=========================================================\n";
    std::cout << " SHARMILA S / 192525011 | TEAM 16 | DSA0111 OOPS CAPSTONE\n";
    std::cout << " Bank Account Inheritance and Polymorphism System\n";
    std::cout << " C++17 Backend Server running at: http://localhost:8080\n";
    std::cout << "=========================================================\n";

        const char* envPort = std::getenv("PORT");
    int port = envPort ? std::stoi(envPort) : 8080;
    const char* envPort = std::getenv("PORT");
    int serverPort = (envPort && *envPort) ? std::stoi(envPort) : 8080;
    std::cout << "Binding BANKORA C++17 Server on 0.0.0.0:" << serverPort << std::endl;
    if (!svr.listen("0.0.0.0", serverPort)) {
        std::cerr << "Failed to bind port " << serverPort << std::endl;
        return 1;
    }
    return 0;
}




