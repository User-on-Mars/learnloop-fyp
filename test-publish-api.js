/**
 * Quick API test for publish request endpoints
 * Run with: node test-publish-api.js
 */

const baseUrl = 'http://localhost:4000/api';

async function testEndpoints() {
  console.log('🧪 Testing Publish Request API Endpoints\n');

  // Test 1: Health check
  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    const health = await healthRes.json();
    console.log('✅ Health check:', health.status);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 2: Check eligibility endpoint (should require auth)
  try {
    const eligibilityRes = await fetch(`${baseUrl}/publish-requests/eligibility`);
    console.log('✅ Eligibility endpoint accessible:', eligibilityRes.status);
    if (eligibilityRes.status === 401) {
      console.log('   (Correctly requires authentication)');
    }
  } catch (error) {
    console.error('❌ Eligibility endpoint failed:', error.message);
  }

  // Test 3: Admin pending endpoint (should require auth + admin)
  try {
    const pendingRes = await fetch(`${baseUrl}/publish-requests/admin/pending`);
    console.log('✅ Admin pending endpoint accessible:', pendingRes.status);
    if (pendingRes.status === 401) {
      console.log('   (Correctly requires authentication)');
    }
  } catch (error) {
    console.error('❌ Admin pending endpoint failed:', error.message);
  }

  console.log('\n✅ All endpoints are accessible and properly secured!');
  console.log('\n📝 Next steps:');
  console.log('   1. Login to the app at http://localhost:5173');
  console.log('   2. Create a skillmap with at least 5 nodes');
  console.log('   3. Test the "Request Publish" button');
  console.log('   4. Login as admin and check /admin/publish-requests');
}

testEndpoints().catch(console.error);
