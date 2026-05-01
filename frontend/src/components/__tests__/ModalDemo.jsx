import { useState } from 'react';
import Modal, { ModalButton } from '../Modal';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

/**
 * Demo component to showcase Modal usage patterns
 * This can be used for manual testing and verification
 */
export default function ModalDemo() {
  const [simpleModalOpen, setSimpleModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [largeContentModalOpen, setLargeContentModalOpen] = useState(false);

  return (
    <div className="p-8 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Modal Component Demo</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Simple Modal */}
        <button
          onClick={() => setSimpleModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Open Simple Modal
        </button>

        {/* Form Modal */}
        <button
          onClick={() => setFormModalOpen(true)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
        >
          Open Form Modal
        </button>

        {/* Confirmation Modal */}
        <button
          onClick={() => setConfirmModalOpen(true)}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
        >
          Open Confirmation Modal
        </button>

        {/* Large Content Modal */}
        <button
          onClick={() => setLargeContentModalOpen(true)}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
        >
          Open Large Content Modal
        </button>
      </div>

      {/* Simple Modal Example */}
      <Modal
        isOpen={simpleModalOpen}
        onClose={() => setSimpleModalOpen(false)}
        title="Simple Modal"
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setSimpleModalOpen(false)}
            >
              Close
            </ModalButton>
            <ModalButton
              variant="primary"
              onClick={() => {
                alert('Action confirmed!');
                setSimpleModalOpen(false);
              }}
            >
              Confirm
            </ModalButton>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#565c52] leading-relaxed">
              This is a simple modal with a title, content, and footer buttons.
              The modal is responsive and will adapt to different screen sizes.
            </p>
          </div>
        </div>
      </Modal>

      {/* Form Modal Example */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Create New Item"
        maxWidth="max-w-lg"
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setFormModalOpen(false)}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="primary"
              type="submit"
              onClick={() => {
                alert('Form submitted!');
                setFormModalOpen(false);
              }}
            >
              Create Item
            </ModalButton>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label htmlFor="item-name" className="block text-sm font-medium text-[#1c1f1a] mb-2">
              Item Name
            </label>
            <input
              type="text"
              id="item-name"
              placeholder="Enter item name"
              className="w-full px-4 py-2.5 min-h-[44px] border border-[#e2e6dc] rounded-xl outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/15 bg-[#f8faf6] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label htmlFor="item-description" className="block text-sm font-medium text-[#1c1f1a] mb-2">
              Description
            </label>
            <textarea
              id="item-description"
              rows="4"
              placeholder="Enter description"
              className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/15 bg-[#f8faf6] focus:bg-white transition-all resize-none"
            ></textarea>
          </div>

          <div>
            <label htmlFor="item-category" className="block text-sm font-medium text-[#1c1f1a] mb-2">
              Category
            </label>
            <select
              id="item-category"
              className="w-full px-4 py-2.5 min-h-[44px] border border-[#e2e6dc] rounded-xl outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/15 bg-[#f8faf6] focus:bg-white transition-all"
            >
              <option>Select a category</option>
              <option>Category 1</option>
              <option>Category 2</option>
              <option>Category 3</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal Example */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Deletion"
        maxWidth="max-w-sm"
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="danger"
              onClick={() => {
                alert('Item deleted!');
                setConfirmModalOpen(false);
              }}
            >
              Delete
            </ModalButton>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#565c52] leading-relaxed mb-3">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800 font-medium">
                Warning: All associated data will be permanently removed.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Large Content Modal Example */}
      <Modal
        isOpen={largeContentModalOpen}
        onClose={() => setLargeContentModalOpen(false)}
        title="Terms and Conditions"
        maxWidth="max-w-2xl"
        footer={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setLargeContentModalOpen(false)}
            >
              Decline
            </ModalButton>
            <ModalButton
              variant="primary"
              onClick={() => {
                alert('Terms accepted!');
                setLargeContentModalOpen(false);
              }}
            >
              Accept
            </ModalButton>
          </>
        }
      >
        <div className="space-y-4 text-sm text-[#565c52]">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              This modal demonstrates scrollable content. The content area will scroll while the header and footer remain fixed.
            </p>
          </div>

          <h3 className="font-bold text-[#1c1f1a] text-base mt-6">1. Introduction</h3>
          <p className="leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>

          <h3 className="font-bold text-[#1c1f1a] text-base mt-6">2. User Responsibilities</h3>
          <p className="leading-relaxed">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>

          <h3 className="font-bold text-[#1c1f1a] text-base mt-6">3. Privacy Policy</h3>
          <p className="leading-relaxed">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>

          <h3 className="font-bold text-[#1c1f1a] text-base mt-6">4. Data Collection</h3>
          <p className="leading-relaxed">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.
          </p>

          <h3 className="font-bold text-[#1c1f1a] text-base mt-6">5. Termination</h3>
          <p className="leading-relaxed">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
          </p>

          <h3 className="font-bold text-[#1c1f1a] text-base mt-6">6. Modifications</h3>
          <p className="leading-relaxed">
            Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit.
          </p>
        </div>
      </Modal>
    </div>
  );
}
