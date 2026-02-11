#!/usr/bin/env tsx
/**
 * User Management CLI
 *
 * Commands:
 * - add: Add a new user
 * - list: List all users
 * - remove: Remove a user
 * - update-password: Update a user's password
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import bcrypt from 'bcryptjs';

const USERS_FILE_PATH = path.join(process.cwd(), 'users.json');
const BCRYPT_SALT_ROUNDS = 12;

interface User {
  username: string;
  passwordHash: string;
  displayName?: string;
  createdAt?: string;
  lastLogin?: string;
}

interface UsersFile {
  users: User[];
}

/**
 * Load users from file
 */
function loadUsers(): UsersFile {
  try {
    if (!fs.existsSync(USERS_FILE_PATH)) {
      return { users: [] };
    }

    const content = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    if (!content.trim()) {
      return { users: [] };
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading users file:', error);
    return { users: [] };
  }
}

/**
 * Save users to file
 */
function saveUsers(usersFile: UsersFile): void {
  try {
    fs.writeFileSync(
      USERS_FILE_PATH,
      JSON.stringify(usersFile, null, 2) + '\n',
      'utf-8'
    );
  } catch (error) {
    console.error('Error saving users file:', error);
    throw error;
  }
}

/**
 * Create readline interface for user input
 */
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt for input
 */
function prompt(question: string): Promise<string> {
  const rl = createReadline();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Prompt for password (hidden input)
 */
function promptPassword(question: string): Promise<string> {
  const rl = createReadline();
  return new Promise((resolve) => {
    // Hide input for password
    const stdin = process.stdin;
    (stdin as any).setRawMode(true);

    let password = '';
    process.stdout.write(question);

    stdin.on('data', function onData(char: Buffer) {
      const byte = char[0];

      switch (byte) {
        case 3: // Ctrl+C
          process.exit();
          break;
        case 13: // Enter
          (stdin as any).setRawMode(false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(password);
          break;
        case 127: // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          if (byte >= 32 && byte <= 126) {
            password += char.toString();
            process.stdout.write('*');
          }
          break;
      }
    });
  });
}

/**
 * Add a new user
 */
async function addUser(): Promise<void> {
  console.log('\n📝 Add New User\n');

  const username = await prompt('Username (min 3 characters): ');

  if (!username || username.trim().length < 3) {
    console.error('❌ Username must be at least 3 characters');
    return;
  }

  const normalizedUsername = username.trim().toLowerCase();

  // Check if user already exists
  const usersFile = loadUsers();
  const existingUser = usersFile.users.find(
    u => u.username.toLowerCase() === normalizedUsername
  );

  if (existingUser) {
    console.error(`❌ User '${username}' already exists`);
    return;
  }

  const displayName = await prompt('Display name (optional): ');

  const password = await promptPassword('Password (min 8 characters): ');

  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    return;
  }

  const passwordConfirm = await promptPassword('Confirm password: ');

  if (password !== passwordConfirm) {
    console.error('❌ Passwords do not match');
    return;
  }

  console.log('\n⏳ Hashing password (this may take a few seconds)...');

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const newUser: User = {
    username: username.trim(),
    passwordHash,
    displayName: displayName.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  usersFile.users.push(newUser);
  saveUsers(usersFile);

  console.log(`✅ User '${newUser.username}' added successfully`);
  if (newUser.displayName) {
    console.log(`   Display name: ${newUser.displayName}`);
  }
  console.log(`   Created at: ${newUser.createdAt}`);
}

/**
 * List all users
 */
function listUsers(): void {
  console.log('\n👥 User List\n');

  const usersFile = loadUsers();

  if (usersFile.users.length === 0) {
    console.log('No users found. Run "npm run add-user" to add users.');
    return;
  }

  console.log(`Total users: ${usersFile.users.length}\n`);

  usersFile.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username}`);
    if (user.displayName) {
      console.log(`   Display name: ${user.displayName}`);
    }
    if (user.createdAt) {
      console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
    }
    if (user.lastLogin) {
      console.log(`   Last login: ${new Date(user.lastLogin).toLocaleString()}`);
    }
    console.log();
  });
}

/**
 * Remove a user
 */
async function removeUser(): Promise<void> {
  console.log('\n🗑️  Remove User\n');

  const usersFile = loadUsers();

  if (usersFile.users.length === 0) {
    console.log('No users to remove.');
    return;
  }

  // Show users
  console.log('Current users:');
  usersFile.users.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.username}${user.displayName ? ` (${user.displayName})` : ''}`);
  });
  console.log();

  const username = await prompt('Username to remove: ');

  if (!username || username.trim().length === 0) {
    console.error('❌ Username is required');
    return;
  }

  const normalizedUsername = username.trim().toLowerCase();
  const userIndex = usersFile.users.findIndex(
    u => u.username.toLowerCase() === normalizedUsername
  );

  if (userIndex === -1) {
    console.error(`❌ User '${username}' not found`);
    return;
  }

  const userToRemove = usersFile.users[userIndex];
  const confirm = await prompt(`Are you sure you want to remove '${userToRemove.username}'? (yes/no): `);

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled');
    return;
  }

  usersFile.users.splice(userIndex, 1);
  saveUsers(usersFile);

  console.log(`✅ User '${userToRemove.username}' removed successfully`);
}

/**
 * Update a user's password
 */
async function updatePassword(): Promise<void> {
  console.log('\n🔑 Update Password\n');

  const usersFile = loadUsers();

  if (usersFile.users.length === 0) {
    console.log('No users found.');
    return;
  }

  // Show users
  console.log('Users:');
  usersFile.users.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.username}${user.displayName ? ` (${user.displayName})` : ''}`);
  });
  console.log();

  const username = await prompt('Username to update: ');

  if (!username || username.trim().length === 0) {
    console.error('❌ Username is required');
    return;
  }

  const normalizedUsername = username.trim().toLowerCase();
  const user = usersFile.users.find(
    u => u.username.toLowerCase() === normalizedUsername
  );

  if (!user) {
    console.error(`❌ User '${username}' not found`);
    return;
  }

  const password = await promptPassword('New password (min 8 characters): ');

  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    return;
  }

  const passwordConfirm = await promptPassword('Confirm new password: ');

  if (password !== passwordConfirm) {
    console.error('❌ Passwords do not match');
    return;
  }

  console.log('\n⏳ Hashing password (this may take a few seconds)...');

  user.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  saveUsers(usersFile);

  console.log(`✅ Password updated for '${user.username}'`);
}

/**
 * Main CLI
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'add':
      await addUser();
      break;
    case 'list':
      listUsers();
      break;
    case 'remove':
      await removeUser();
      break;
    case 'update-password':
      await updatePassword();
      break;
    default:
      console.log(`
User Management CLI

Usage: npm run <command>

Commands:
  npm run add-user           Add a new user
  npm run list-users         List all users
  npm run remove-user        Remove a user
  npm run update-password    Update a user's password

Examples:
  npm run add-user
  npm run list-users
  npm run remove-user
  npm run update-password
      `);
      process.exit(1);
  }

  process.exit(0);
}

// Run CLI
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
