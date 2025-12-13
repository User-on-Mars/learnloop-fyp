import { useAuth } from '../useAuth';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function AuthDebug() {
  const user = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
      <h3 className="font-bold text-sm mb-2">Auth Debug</h3>
      <div className="text-xs space-y-1">
        <p><strong>User:</strong> {user === undefined ? 'Loading...' : user === null ? 'Not logged in' : 'Logged in'}</p>
        {user && (
          <>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
            <button 
              onClick={handleSignOut}
              className="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}