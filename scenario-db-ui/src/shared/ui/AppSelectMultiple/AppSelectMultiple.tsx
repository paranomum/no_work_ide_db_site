import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { useEffect, useRef, useState } from 'react';

import styles from './AppSelectMultiple.module.css';

interface AppSelectMultipleProps
  extends Omit<
    SelectProps<string[], { value: string; label: string }>,
    'mode' | 'open' | 'onOpenChange' | 'onKeyDown'
  > {
  autoOpen?: boolean;
  onCancelEditing?: () => void;
  onSaveEditing?: () => void;
}

export function AppSelectMultiple({
  autoOpen = false,
  onCancelEditing,
  onSaveEditing,
  onDropdownVisibleChange,
  ...props
}: AppSelectMultipleProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const selectContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoOpen) {
      return;
    }

    requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }, [autoOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onDropdownVisibleChange?.(open);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();

      if (isOpen) {
        setIsOpen(false);
        return;
      }

      onCancelEditing?.();
      return;
    }

    if (event.key === 'Enter' && !isOpen) {
      event.preventDefault();
      onSaveEditing?.();
      return;
    }

    if (
      !isOpen &&
      (event.key === 'ArrowDown' || event.key === 'ArrowUp')
    ) {
      event.preventDefault();
    }
  };

  return (
    <div
      ref={selectContainerRef}
      className={styles.container}
      onKeyDown={handleKeyDown}
    >
      <Select
        {...props}
        mode="multiple"
        open={isOpen}
        className={`${styles.select} ${props.className ?? ''}`}
        onDropdownVisibleChange={handleOpenChange}
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
        onSearch={() => {
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
      />
    </div>
  );
}
