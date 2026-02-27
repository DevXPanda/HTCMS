import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: 'Confirm',
    message: '',
    confirmLabel: 'OK',
    cancelLabel: 'Cancel',
    variant: 'default', // default | danger
    resolveRef: null
  });

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options.title ?? 'Confirm',
        message: options.message ?? '',
        confirmLabel: options.confirmLabel ?? 'OK',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        variant: options.variant ?? 'default',
        resolveRef: resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state.resolveRef) state.resolveRef(true);
    setState((s) => ({ ...s, open: false, resolveRef: null }));
  }, [state.resolveRef]);

  const handleCancel = useCallback(() => {
    if (state.resolveRef) state.resolveRef(false);
    setState((s) => ({ ...s, open: false, resolveRef: null }));
  }, [state.resolveRef]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <ConfirmModalView
          title={state.title}
          message={state.message}
          confirmLabel={state.confirmLabel}
          cancelLabel={state.cancelLabel}
          variant={state.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmModalView({ title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-panel max-w-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="modal-header">
          <h2 id="confirm-title" className="modal-title">
            {title}
          </h2>
        </div>
        <div className="modal-body">
          <p id="confirm-message" className="text-gray-600 text-sm">
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
