// Otimizações de performance e utilitários
import { useEffect, useRef, useCallback } from 'react';

// Debounce personalizado
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle personalizado
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay]
  );
}

// Lazy load de imagens
export function useLazyLoad(ref: React.RefObject<HTMLElement>): boolean {
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [ref]);

  return isVisible;
}

// Memoização avançada com hash
export function useMemoWithHash<T>(
  factory: () => T,
  deps: unknown[]
): T {
  const hash = JSON.stringify(deps);
  return React.useMemo(factory, [hash]);
}

// Import dinâmico de módulos
export async function loadModule<T>(path: string): Promise<T> {
  const module = await import(/* @vite-ignore */ path);
  return module.default || module;
}

import React from 'react';
