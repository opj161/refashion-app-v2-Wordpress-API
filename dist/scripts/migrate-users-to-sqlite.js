"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const dbService = __importStar(require("../src/services/database.service"));
// Load environment variables from .env file
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SALT_ROUNDS = 12;
async function migrateUsers() {
    console.log('🚀 Starting user migration from APP_USERS_CONFIG to SQLite...');
    const rawConfig = process.env.APP_USERS_CONFIG;
    if (!rawConfig) {
        console.log('✅ No APP_USERS_CONFIG found. Skipping user migration.');
        return;
    }
    try {
        const usersConfig = JSON.parse(rawConfig);
        const db = dbService.getDb();
        const insertStmt = db.prepare('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)');
        let migratedCount = 0;
        for (const [username, config] of Object.entries(usersConfig)) {
            // Check if user already exists
            const existingUser = dbService.findUserByUsername(username);
            if (existingUser) {
                console.log(`  - User '${username}' already exists in DB. Skipping.`);
                continue;
            }
            console.log(`  - Migrating user: ${username}`);
            const hashedPassword = await bcrypt_1.default.hash(config.password, SALT_ROUNDS);
            insertStmt.run(username, hashedPassword, config.role);
            migratedCount++;
        }
        if (migratedCount > 0) {
            console.log(`\n🎉 Successfully migrated ${migratedCount} users to the database.`);
            console.log('IMPORTANT: You can now remove the APP_USERS_CONFIG environment variable.');
        }
        else {
            console.log('\n✅ No new users to migrate.');
        }
    }
    catch (error) {
        console.error('💥 User migration failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    migrateUsers()
        .then(() => {
        console.log('🏁 User migration check complete!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Fatal error during user migration:', error);
        process.exit(1);
    });
}
