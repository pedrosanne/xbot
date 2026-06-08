-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'system',
    "whatsappToken" TEXT NOT NULL DEFAULT '',
    "whatsappPhoneId" TEXT NOT NULL DEFAULT '',
    "whatsappVerifyToken" TEXT NOT NULL DEFAULT 'antigravity_token_123',
    "geminiApiKey" TEXT NOT NULL DEFAULT '',
    "elevenLabsApiKey" TEXT NOT NULL DEFAULT '',
    "elevenLabsVoiceId" TEXT NOT NULL DEFAULT '21m00Tcm4TlvDq8ikWAM',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "systemPrompt" TEXT NOT NULL DEFAULT 'Você é um atendente virtual simpático da nossa empresa. Responda de maneira clara, prestativa e natural, simulando um contato humano.',
    "model" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Cliente WhatsApp',
    "profileName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'AUTO',
    "lastInteraction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
