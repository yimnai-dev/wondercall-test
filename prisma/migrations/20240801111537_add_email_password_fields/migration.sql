-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL DEFAULT 'johndoe@gmail.com',
    "password" TEXT NOT NULL DEFAULT '$2a$10$CP9rKOpQXaWmq5RJYvO1pe0n0DI1.MEGD6aYv.7u8njvlLMNs0nUW'
);
INSERT INTO "new_User" ("id") SELECT "id" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
