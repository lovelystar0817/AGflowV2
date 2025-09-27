#!/usr/bin/env node

// Simple script to run the worker separately from the web process
import './worker';

console.log('Starting notification worker...');
console.log('Worker is running. Press Ctrl+C to stop.');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down worker...');
  process.exit(0);
});