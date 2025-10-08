import * as React from 'react';

export interface DialogRootProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DialogPortalProps {
  children?: React.ReactNode;
  container?: HTMLElement | null;
}

export interface DialogCommonProps {
  asChild?: boolean;
  children?: React.ReactNode;
}

export type DialogTriggerProps = DialogCommonProps &
  React.ComponentPropsWithoutRef<'button'>;

export type DialogOverlayProps = DialogCommonProps &
  React.ComponentPropsWithoutRef<'div'>;

export type DialogContentProps = DialogCommonProps &
  React.ComponentPropsWithoutRef<'div'>;

export type DialogTitleProps = DialogCommonProps &
  React.ComponentPropsWithoutRef<'h2'>;

export type DialogDescriptionProps = DialogCommonProps &
  React.ComponentPropsWithoutRef<'p'>;

export type DialogCloseProps = DialogCommonProps &
  React.ComponentPropsWithoutRef<'button'>;

export const Root: React.FC<DialogRootProps>;
export const Trigger: React.FC<DialogTriggerProps>;
export const Portal: React.FC<DialogPortalProps>;
export const Overlay: React.FC<DialogOverlayProps>;
export const Content: React.FC<DialogContentProps>;
export const Title: React.FC<DialogTitleProps>;
export const Description: React.FC<DialogDescriptionProps>;
export const Close: React.FC<DialogCloseProps>;

declare const Dialog: {
  Root: typeof Root;
  Trigger: typeof Trigger;
  Portal: typeof Portal;
  Overlay: typeof Overlay;
  Content: typeof Content;
  Title: typeof Title;
  Description: typeof Description;
  Close: typeof Close;
};

export default Dialog;
