/**
 * Clear leaderboard cache to force refresh with updated user names
 */
import dotenv from 'dotenv'
import redis from 'redis'

dotenv.config()

async function clearCache() {
  try {
    // Check if Redis is disabled
    if (process.env.DISABLE_REDIS === 'true') {
      console.log('⚠️  Redis is disabled - no cache to clear')
      console.log('Leaderboard will fetch fresh data on next request')
      return
    }
    
    const client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    })
    
    client.on('error', (err) => {
      console.error('Redis error:', err)
      process.exit(1)
    })
    
    await client.connect()
    console.log('✅ Connected to Redis\n')
    
    // Clear all leaderboard cache keys
    const patterns = ['weekly:*', 'streaks:*', 'alltime:*']
    let cleared = 0
    
    for (const pattern of patterns) {
      const keys = await client.keys(pattern)
      if (keys.length > 0) {
        await client.del(keys)
        cleared += keys.length
        console.log(`✅ Cleared ${keys.length} ${pattern} cache entries`)
      }
    }
    
    console.log(`\n✅ Total cache entries cleared: ${cleared}`)
    console.log('Leaderboard will fetch fresh data on next request')
    
    await client.quit()
    
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

clearCache().catch(err => {
  console.error(err)
  process.exit(1)
})
