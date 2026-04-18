import { useState } from 'react';
import ConfirmationDialog from '../ConfirmationDialog';

/**
 * Demo component to test ConfirmationDialog functionality
 * This can be used for manual testing and verification
 */
export default function ConfirmationDialogDemo() {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: null
  });

  const showDialog = (type) => {
    setDialogState({ isOpen: true, type });
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, type: null });
  };

  const handleConfirm = async () => {
    console.log(`Confirmed action: ${dialogState.type}`);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    closeDialog();
  };

  const getDialogProps = () => {
    switch (dialogState.type) {
      case 'delete':
        return {
          title: "Delete Room",
          message: "This will permanently delete the room and remove all members. This action cannot be undone.",
          confirmText: "Delete Room",
          confirmStyle: "danger"
        };
      case 'kick':
        return {
          title: "Kick Member",
          message: "Are you sure you want to remove Alice from the room? They will need to be re-invited to join again.",
          confirmText: "Remove Member",
          confirmStyle: "danger"
        };
      case 'leave':
        return {
          title: "Leave Room",
          message: "Are you sure you want to leave this room? You will need to be re-invited to join again.",
          confirmText: "Leave Room",
          confirmStyle: "danger"
        };
      case 'removeSkillMap':
        return {
          title: "Remove Skill Map",
          message: "Are you sure you want to remove \"JavaScript Fundamentals\" from the room? This will remove the skill map but retain member progress data.",
          confirmText: "Remove Skill Map",
          confirmStyle: "danger"
        };
      default:
        return {
          title: "Confirm Action",
          message: "Are you sure you want to proceed?",
          confirmText: "Confirm",
          confirmStyle: "primary"
        };
    }
  };

  return (
    <div className="p-8 bg-site-bg min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-site-ink mb-6">ConfirmationDialog Demo</h1>
        
        <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-6">
          <h2 className="text-lg font-semibold text-site-ink mb-4">Test Different Confirmation Types</h2>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => showDialog('delete')}
              className="p-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Delete Room
            </button>
            
            <button
              onClick={() => showDialog('kick')}
              className="p-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Kick Member
            </button>
            
            <button
              onClick={() => showDialog('leave')}
              className="p-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              Leave Room
            </button>
            
            <button
              onClick={() => showDialog('removeSkillMap')}
              className="p-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Remove Skill Map
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-site-bg rounded-lg">
            <h3 className="font-medium text-site-ink mb-2">Features Demonstrated:</h3>
            <ul className="text-sm text-site-muted space-y-1">
              <li>• Custom titles and messages for different actions</li>
              <li>• Danger styling for destructive actions</li>
              <li>• Async operation handling with loading state</li>
              <li>• Proper button disabling during processing</li>
              <li>• Consistent styling with existing design system</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
        {...getDialogProps()}
      />
    </div>
  );
}