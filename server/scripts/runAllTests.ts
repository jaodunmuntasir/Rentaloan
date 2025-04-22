#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Configuration
const testDirectories = [
  '../models/__tests__',        // Model tests
  '../routes/__tests__',        // Route tests
];

// Define text colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Function to check if a directory exists
function dirExists(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch (err) {
    return false;
  }
}

/**
 * Runs Jest for the specified test directory
 */
async function runJestForDirectory(directory: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`${colors.bright}${colors.blue}Running tests in: ${directory}${colors.reset}`);
    
    // Ensure the directory exists before attempting to run tests
    const fullPath = path.resolve(__dirname, directory);
    if (!dirExists(fullPath)) {
      console.log(`${colors.yellow}Directory ${directory} does not exist. Skipping.${colors.reset}`);
      resolve(true);
      return;
    }
    
    // Check if directory has any test files
    const hasTestFiles = fs.readdirSync(fullPath).some(file => 
      file.endsWith('.test.ts') || file.endsWith('.test.js') || 
      file.endsWith('.spec.ts') || file.endsWith('.spec.js')
    );
    
    if (!hasTestFiles) {
      console.log(`${colors.yellow}No test files found in ${directory}. Skipping.${colors.reset}`);
      resolve(true);
      return;
    }
    
    // Run Jest for the directory
    const jest = spawn('npx', ['jest', directory, '--colors'], {
      stdio: 'inherit',
      shell: true
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}✓ Tests in ${directory} passed successfully${colors.reset}`);
        resolve(true);
      } else {
        console.log(`${colors.red}✗ Tests in ${directory} failed with code ${code}${colors.reset}`);
        resolve(false);
      }
      console.log('\n'); // Add some spacing between test suites
    });
  });
}

/**
 * Main function to run all tests
 */
async function runAllTests() {
  console.log(`${colors.bright}${colors.cyan}=== Starting test runner ====${colors.reset}\n`);
  
  let allPassed = true;
  let existingDirs = 0;
  
  // Run tests for each directory
  for (const dir of testDirectories) {
    if (dirExists(path.resolve(__dirname, dir))) {
      existingDirs++;
      const passed = await runJestForDirectory(dir);
      if (!passed) {
        allPassed = false;
      }
    }
  }
  
  // Summary
  console.log(`${colors.bright}${colors.cyan}=== Test execution summary ====${colors.reset}`);
  
  if (existingDirs === 0) {
    console.log(`${colors.yellow}No test directories found.${colors.reset}`);
  } else if (allPassed) {
    console.log(`${colors.bright}${colors.green}All tests passed successfully! 🎉${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.red}Some tests failed. Please review the output above.${colors.reset}`);
    process.exit(1);
  }
}

// Execute the main function
runAllTests().catch(err => {
  console.error(`${colors.red}Error running tests: ${err}${colors.reset}`);
  process.exit(1);
}); 