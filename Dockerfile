FROM gcc:13-bookworm AS builder
WORKDIR /app
COPY . .
RUN g++ -std=c++17 -O2 -pthread backend/src/Transaction.cpp backend/src/BankAccount.cpp backend/src/SavingsAccount.cpp backend/src/CurrentAccount.cpp backend/src/FixedDepositAccount.cpp backend/src/BankManager.cpp backend/src/main.cpp -o bankora_server

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/bankora_server ./bankora_server
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/database ./database
EXPOSE 8080
CMD ["./bankora_server"]
