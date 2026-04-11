'use client';

import { useCallback, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { signOut } from '@/lib/actions/auth-actions';

export function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClose = useCallback(() => {
    if (!isPending) setShowConfirm(false);
  }, [isPending]);

  function handleLogout() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="rounded-full p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        aria-label="Log out"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="16 17 21 12 16 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="21"
            y1="12"
            x2="9"
            y2="12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Modal
        open={showConfirm}
        onClose={handleClose}
        title="Log out"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleLogout}
              loading={isPending}
              disabled={isPending}
              className="flex-1"
            >
              Log Out
            </Button>
          </div>
        }
      >
        <p className="text-sm">Are you sure you want to log out? You will need to sign in again to access your account.</p>
      </Modal>
    </>
  );
}
