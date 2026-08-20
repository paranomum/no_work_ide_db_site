import { Input } from 'antd';
import type { TextAreaProps } from 'antd/es/input';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import styles from './AppInput.module.css';

export interface AppTextAreaRef {
  focus: () => void;
  blur: () => void;
  select: () => void;
}

interface AppTextAreaProps
  extends Omit<
    TextAreaProps,
    'onKeyDown' | 'onCopy' | 'onPaste' | 'onCut'
  > {
  onKeyDown?: TextAreaProps['onKeyDown'];
}

export const AppTextArea = forwardRef<
  AppTextAreaRef,
  AppTextAreaProps
>(({ className, onKeyDown, onChange, ...props }, ref) => {
  const textAreaRef = useRef<TextAreaRef>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textAreaRef.current?.focus();
    },
    blur: () => {
      textAreaRef.current?.blur();
    },
    select: () => {
      textAreaRef.current?.resizableTextArea?.textArea?.select();
    },
  }));

  const getNativeTextArea = (): HTMLTextAreaElement | null => {
    return textAreaRef.current?.resizableTextArea?.textArea ?? null;
  };

  const emitValueChange = (value: string) => {
    onChange?.({
      target: { value },
      currentTarget: { value },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  const handleKeyDown: TextAreaProps['onKeyDown'] = (event) => {
    const textArea = getNativeTextArea();
    const isCommandOrControl = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (isCommandOrControl && key === 'a') {
      event.preventDefault();
      textArea?.select();
      return;
    }

    if (isCommandOrControl && key === 'c') {
      event.preventDefault();

      if (!textArea) {
        return;
      }

      const selectionStart = textArea.selectionStart ?? 0;
      const selectionEnd = textArea.selectionEnd ?? 0;

      const selectedText = textArea.value.slice(
        selectionStart,
        selectionEnd,
      );

      void navigator.clipboard.writeText(selectedText);
      return;
    }

    if (isCommandOrControl && key === 'v') {
      event.preventDefault();

      if (!textArea) {
        return;
      }

      void navigator.clipboard.readText().then((clipboardText) => {
        const selectionStart = textArea.selectionStart ?? 0;
        const selectionEnd = textArea.selectionEnd ?? 0;

        const updatedValue =
          textArea.value.slice(0, selectionStart) +
          clipboardText +
          textArea.value.slice(selectionEnd);

        emitValueChange(updatedValue);

        requestAnimationFrame(() => {
          textArea.focus();

          const cursorPosition =
            selectionStart + clipboardText.length;

          textArea.setSelectionRange(
            cursorPosition,
            cursorPosition,
          );
        });
      });

      return;
    }

    if (isCommandOrControl && key === 'x') {
      event.preventDefault();

      if (!textArea) {
        return;
      }

      const selectionStart = textArea.selectionStart ?? 0;
      const selectionEnd = textArea.selectionEnd ?? 0;

      const selectedText = textArea.value.slice(
        selectionStart,
        selectionEnd,
      );

      void navigator.clipboard.writeText(selectedText);

      const updatedValue =
        textArea.value.slice(0, selectionStart) +
        textArea.value.slice(selectionEnd);

      emitValueChange(updatedValue);

      requestAnimationFrame(() => {
        textArea.focus();
        textArea.setSelectionRange(selectionStart, selectionStart);
      });

      return;
    }

    onKeyDown?.(event);
  };

  return (
    <Input.TextArea
      {...props}
      ref={textAreaRef}
      className={`${styles.input} ${className ?? ''}`}
      onChange={onChange}
      onKeyDown={handleKeyDown}
    />
  );
});

AppTextArea.displayName = 'AppTextArea';
