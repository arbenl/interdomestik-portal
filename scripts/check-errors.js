#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const ports = [9099, 8080, 5001, 5000, 4400, 4500];
const seedsDir = path.resolve(__dirname, '../functions/seeds');
const debugLog = path.resolve(__dirname, '../functions/firebase-debug.log');

let hasErrors = false;

function checkPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -i :${port}`, (error, stdout) => {
      if (stdout) {
        console.error(`Error: Port ${port} is already in use.`);
        hasErrors = true;
      }
      resolve();
    });
  });
}

async function main() {
  console.log('Checking for common errors...');

  await Promise.all(ports.map(checkPort));

  if (fs.existsSync(debugLog)) {
    console.error(
      `Error: The firebase-debug.log file exists. This may indicate a problem with the emulators.`
    );
    hasErrors = true;
  }

  if (!fs.existsSync(seedsDir)) {
    console.error(
      `Error: The functions/seeds directory does not exist. Please create it and export your seed data.`
    );
    hasErrors = true;
  }

  if (hasErrors) {
    console.log('\nPlease address the errors above and try again.');
    process.exit(1);
  } else {
    console.log('No common errors found.');
  }
}

main();
