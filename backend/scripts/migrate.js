#!/usr/bin/env node

/**
 * Migration Script for Node System Database Migrations
 * 
 * This script provides a command-line interface for running database
 * migrations for the node system rebuild.
 * 
 * Usage:
 *   npm run migrate up          - Run all pending migrations
 *   npm run migrate down        - Rollback all migrations
 *   npm run migrate status      - Show migration status
 *   npm run migrate validate    - Validate database state
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import MigrationRunner from '../src/migrations/migrationRunner.js';

// Load environment variables
dotenv.config();

async function main() {
  const command = process.argv[2] || 'up';
  const runner = new MigrationRunner();

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    switch (command) {
      case 'up':
        console.log('🚀 Running migrations...');
        const upResult = await runner.runMigrations();
        console.log('\n📊 Migration Summary:');
        console.log(`  Total migrations: ${upResult.total}`);
        console.log(`  Executed: ${upResult.executed}`);
        console.log(`  Skipped: ${upResult.skipped}`);
        console.log(`  Errors: ${upResult.errors}`);
        
        if (upResult.errors > 0) {
          console.log('\n⚠️  Some migrations failed. Check logs above for details.');
          process.exit(1);
        } else {
          console.log('\n🎉 All migrations completed successfully!');
        }
        break;

      case 'down':
        console.log('🔄 Rolling back migrations...');
        const downResult = await runner.rollbackAll();
        console.log('\n📊 Rollback Summary:');
        console.log(`  Rolled back: ${downResult.rolledBack}`);
        console.log(`  Errors: ${downResult.errors}`);
        
        if (downResult.errors > 0) {
          console.log('\n⚠️  Some rollbacks failed. Check logs above for details.');
          process.exit(1);
        } else {
          console.log('\n✅ All migrations rolled back successfully!');
        }
        break;

      case 'status':
        console.log('📊 Checking migration status...');
        const status = await runner.getMigrationStatus();
        console.log('\n📋 Migration Status:');
        console.log(`  Total: ${status.total}`);
        console.log(`  Completed: ${status.completed}`);
        console.log(`  Failed: ${status.failed}`);
        console.log(`  Pending: ${status.pending}`);
        
        if (status.migrations.length > 0) {
          console.log('\n📝 Migration Details:');
          status.migrations.forEach(migration => {
            const statusIcon = {
              'completed': '✅',
              'failed': '❌',
              'pending': '⏳',
              'running': '🔄'
            }[migration.status] || '❓';
            
            console.log(`  ${statusIcon} ${migration.name} (${migration.version})`);
            if (migration.executedAt) {
              console.log(`     Executed: ${migration.executedAt.toISOString()}`);
            }
            if (migration.executionTime) {
              console.log(`     Duration: ${migration.executionTime}ms`);
            }
            if (migration.error) {
              console.log(`     Error: ${migration.error}`);
            }
          });
        }
        break;

      case 'validate':
        console.log('🔍 Validating database state...');
        const validation = await runner.validateDatabaseState();
        
        console.log('\n📊 Validation Results:');
        console.log(`  Overall Status: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (validation.details) {
          console.log('\n📝 Component Details:');
          Object.entries(validation.details).forEach(([component, result]) => {
            const icon = result.valid ? '✅' : '❌';
            console.log(`  ${icon} ${component}`);
            
            if (result.issues && result.issues.length > 0) {
              result.issues.forEach(issue => {
                console.log(`     ⚠️  ${issue}`);
              });
            }
          });
        }
        
        if (validation.error) {
          console.log(`\n❌ Validation Error: ${validation.error}`);
        }
        
        if (!validation.valid) {
          console.log('\n💡 Recommendations:');
          console.log('  - Run migrations: npm run migrate up');
          console.log('  - Check database connectivity');
          console.log('  - Verify data integrity');
          process.exit(1);
        } else {
          console.log('\n🎉 Database state is valid!');
        }
        break;

      case 'reset':
        console.log('⚠️  Resetting migration state...');
        console.log('This will clear all migration logs. Continue? (y/N)');
        
        // Simple confirmation (in production, use a proper prompt library)
        const confirmation = process.env.FORCE_RESET || 'n';
        if (confirmation.toLowerCase() !== 'y') {
          console.log('❌ Reset cancelled');
          process.exit(0);
        }
        
        await runner.resetMigrationState();
        console.log('✅ Migration state reset');
        break;

      default:
        console.log(`
🔧 Node System Migration Tool

Usage: npm run migrate <command>

Commands:
  up        Run all pending migrations
  down      Rollback all migrations  
  status    Show migration status
  validate  Validate database state after migrations
  reset     Reset migration state (development only)

Examples:
  npm run migrate up
  npm run migrate status
  npm run migrate validate

Environment Variables:
  MONGODB_URI     Database connection string (required)
  FORCE_RESET     Skip confirmation for reset command

For more information, see: backend/src/migrations/README.md
        `);
        process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Migration script failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (process.env.NODE_ENV !== 'test') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow logs to flush
      process.exit(0);
    }
  }
}

// Run the script
main();