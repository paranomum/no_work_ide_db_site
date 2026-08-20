import { Input } from 'antd';
import type { InputProps, InputRef } from 'antd';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import styles from './AppInput.module.css';

export interface AppInputPasswordRef {
  focus: () => void;
  blur: () => void;
  select: () => void;
}

interface AppInputPasswordProps
  extends Omit<InputProps, 'onKeyDown' | 'onCopy' | 'onPaste' | 'onCut'> {
  onKeyDown?: InputProps['onKeyDown'];
}

export const AppInputPassword = forwardRef<
  AppInputPasswordRef,
  AppInputPasswordProps
>(({ className, onKeyDown, onChange, ...props }, ref) => {
  const inputRef = useRef<InputRef>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    },
    select: () => {
      inputRef.current?.select();
    },
  }));

  const getNativeInput = (): HTMLInputElement | null => {
    const element = inputRef.current?.nativeElement;

    if (element instanceof HTMLInputElement) {
      return element;
    }

    return element?.querySelector('input') ?? null;
  };

  const emitValueChange = (value: string) => {
    onChange?.({
      target: { value },
      currentTarget: { value },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleKeyDown: InputProps['onKeyDown'] = (event) => {
    const input = getNativeInput();
    const isCommandOrControl = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (isCommandOrControl && key === 'a') {
      event.preventDefault();
      input?.select();
      return;
    }

    if (isCommandOrControl && key === 'c') {
      event.preventDefault();

      if (!input) {
        return;
      }

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const selectedText = input.value.slice(start, end);

      void navigator.clipboard.writeText(selectedText);
      return;
    }

    if (isCommandOrControl && key === 'v') {
      event.preventDefault();

      if (!input) {
        return;
      }

      void navigator.clipboard.readText().then((clipboardText) => {
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;

        const updatedValue =
          input.value.slice(0, start) +
          clipboardText +
          input.value.slice(end);

        emitValueChange(updatedValue);

        requestAnimationFrame(() => {
          input.focus();

          const cursorPosition = start + clipboardText.length;
          input.setSelectionRange(cursorPosition, cursorPosition);
        });
      });

      return;
    }

    if (isCommandOrControl && key === 'x') {
      event.preventDefault();

      if (!input) {
        return;
      }

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const selectedText = input.value.slice(start, end);

      void navigator.clipboard.writeText(selectedText);

      const updatedValue =
        input.value.slice(0, start) + input.value.slice(end);

      emitValueChange(updatedValue);

      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start, start);
      });

      return;
    }

    onKeyDown?.(event);
  };

  return (
    <Input.Password
      {...props}
      ref={inputRef}
      className={`${styles.input} ${className ?? ''}`}
      onChange={onChange}
      onKeyDown={handleKeyDown}
    />
  );
});

AppInputPassword.displayName = 'AppInputPassword';
