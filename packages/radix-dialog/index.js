import {
  createElement,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const DialogContext = createContext({
  open: false,
  setOpen: () => {},
});

function useDialogContext(componentName) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${componentName} must be used within <Dialog.Root>`);
  }
  return context;
}

const composeHandlers = (originalHandler, nextHandler) => (event) => {
  if (typeof originalHandler === 'function') {
    originalHandler(event);
  }
  if (!event?.defaultPrevented) {
    nextHandler(event);
  }
};

export function Root({ children, open, defaultOpen = false, onOpenChange }) {
  const isControlled = typeof open === 'boolean';
  const [internalOpen, setInternalOpen] = useState(
    isControlled ? open : defaultOpen
  );

  useEffect(() => {
    if (isControlled) {
      setInternalOpen(open);
    }
  }, [isControlled, open]);

  const setOpen = useCallback(
    (value) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  const contextValue = useMemo(
    () => ({
      open: internalOpen,
      setOpen,
    }),
    [internalOpen, setOpen]
  );

  return createElement(
    DialogContext.Provider,
    { value: contextValue },
    children
  );
}

Root.displayName = 'DialogRoot';

export function Trigger({ asChild = false, children, ...props }) {
  const { setOpen } = useDialogContext('Dialog.Trigger');
  if (asChild && children) {
    return cloneElement(children, {
      ...props,
      onClick: composeHandlers(children.props?.onClick, () => setOpen(true)),
    });
  }
  return createElement(
    'button',
    {
      type: 'button',
      ...props,
      onClick: composeHandlers(props.onClick, () => setOpen(true)),
    },
    children ?? 'Open dialog'
  );
}

Trigger.displayName = 'DialogTrigger';

export function Portal({ children, container }) {
  const { open } = useDialogContext('Dialog.Portal');
  const mountNodeRef = useRef();

  useEffect(() => {
    if (mountNodeRef.current) return;
    if (typeof document === 'undefined') return;
    mountNodeRef.current = container ?? document.body;
  }, [container]);

  if (!open) return null;
  const mountNode =
    mountNodeRef.current ??
    (typeof document !== 'undefined' ? document.body : null);
  if (!mountNode) return null;
  return createPortal(children, mountNode);
}

Portal.displayName = 'DialogPortal';

export function Overlay({ asChild = false, children, ...props }) {
  const { open } = useDialogContext('Dialog.Overlay');
  if (!open) return null;
  if (asChild && children) {
    return cloneElement(children, props);
  }
  return createElement('div', {
    ...props,
    style: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      ...props.style,
    },
  });
}

Overlay.displayName = 'DialogOverlay';

export function Content({ asChild = false, children, ...props }) {
  const { open, setOpen } = useDialogContext('Dialog.Content');
  if (!open) return null;
  if (asChild && children) {
    return cloneElement(children, {
      role: 'dialog',
      'aria-modal': true,
      ...props,
    });
  }
  return createElement(
    'div',
    {
      role: 'dialog',
      'aria-modal': true,
      tabIndex: -1,
      ...props,
      style: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxHeight: '90vh',
        overflow: 'auto',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 40px rgba(15, 23, 42, 0.25)',
        padding: '1.5rem',
        width: 'min(480px, 90vw)',
        ...props.style,
      },
    },
    children,
    createElement(
      'button',
      {
        type: 'button',
        'aria-label': 'Close dialog',
        onClick: () => setOpen(false),
        style: {
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.25rem',
          lineHeight: 1,
        },
      },
      '×'
    )
  );
}

Content.displayName = 'DialogContent';

export function Title({ asChild = false, children, ...props }) {
  if (asChild && children) {
    return cloneElement(children, props);
  }
  return createElement('h2', { ...props }, children);
}
Title.displayName = 'DialogTitle';

export function Description({ asChild = false, children, ...props }) {
  if (asChild && children) {
    return cloneElement(children, props);
  }
  return createElement('p', { ...props }, children);
}
Description.displayName = 'DialogDescription';

export function Close({ asChild = false, children, ...props }) {
  const { setOpen } = useDialogContext('Dialog.Close');
  const handleClick = composeHandlers(props.onClick, () => setOpen(false));
  if (asChild && children) {
    return cloneElement(children, {
      ...props,
      onClick: handleClick,
    });
  }
  return createElement(
    'button',
    {
      type: 'button',
      ...props,
      onClick: handleClick,
    },
    children ?? 'Close'
  );
}

Close.displayName = 'DialogClose';

export default {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Title,
  Description,
  Close,
};
