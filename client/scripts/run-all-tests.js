#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define test patterns to run
const testPatterns = [
  // Service tests
  'src/services/__tests__/blockchain.service.test.ts',
  'src/services/__tests__/simple.test.ts',
  'src/services/__tests__/api.service.test.ts',
  'src/services/__tests__/loan-agreement.service.test.ts',
  'src/services/__tests__/status-tracking.service.test.ts',
  
  // Context tests
  'src/contexts/__tests__/AuthContext.test.tsx',
  'src/contexts/__tests__/WalletContext.test.tsx',
  'src/contexts/__tests__/ContractContext.test.tsx',
  
  // Page component tests
  'src/pages/__tests__/Login.test.tsx',
  'src/pages/__tests__/Dashboard.test.tsx',
  'src/pages/rental/__tests__/Create.test.tsx',
  'src/pages/loan/__tests__/RequestCreate.test.tsx',
  
  // UI component tests
  'src/components/dashboard/__tests__/WalletInfo.test.tsx'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Function to check if a test file exists
function fileExists(filePath) {
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    return fs.existsSync(absolutePath);
  } catch (err) {
    return false;
  }
}

// Function to run a command and return the result
function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { success: false, output: error.message };
  }
}

// Function to determine which test command to use
function getTestCommand(testFile) {
  // Use npx jest for service and context tests
  if (testFile.startsWith('src/services/') || testFile.startsWith('src/contexts/')) {
    return `npx jest ${testFile}`;
  }
  
  // Use react-scripts test for page and UI component tests
  return `npx react-scripts test --watchAll=false --testMatch="**/${testFile}"`;
}

// Main function to run all tests
async function runAllTests() {
  console.log(`${colors.cyan}===== Running All Tests =====\n${colors.reset}`);
  
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  
  // First check which files exist
  const existingFiles = testPatterns.filter(fileExists);
  skippedTests = testPatterns.length - existingFiles.length;
  
  // If any files were skipped, log them
  if (skippedTests > 0) {
    console.log(`${colors.yellow}Skipping ${skippedTests} non-existent test files:${colors.reset}`);
    testPatterns.filter(file => !fileExists(file)).forEach(file => {
      console.log(`  ${colors.yellow}• ${file}${colors.reset}`);
    });
    console.log();
  }
  
  // Run each test file individually
  for (const testFile of existingFiles) {
    console.log(`${colors.blue}Running: ${testFile}${colors.reset}`);
    
    const command = getTestCommand(testFile);
    console.log(`${colors.blue}Command: ${command}${colors.reset}`);
    
    const result = runCommand(command);
    
    if (result.success) {
      console.log(`${colors.green}✓ Passed: ${testFile}${colors.reset}\n`);
      passedTests++;
    } else {
      console.log(`${colors.red}✗ Failed: ${testFile}${colors.reset}\n`);
      console.log(`${colors.red}${result.output}${colors.reset}\n`);
      failedTests++;
    }
  }
  
  // Print summary
  console.log(`${colors.cyan}===== Test Results =====${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skippedTests}${colors.reset}`);
  
  // Return appropriate exit code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run the main function
runAllTests().catch(error => {
  console.error(`${colors.red}Error running tests:${colors.reset}`, error);
  process.exit(1);
}); 