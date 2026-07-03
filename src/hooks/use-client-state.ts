
'use client';

import { useState, useEffect, useCallback } from 'react';

type StateReader<T> = (storedValue: string) => T;

/**
 * A hook that provides a state value that is safely read from localStorage
 * only on the client side after the component has mounted. It also handles
 * saving the state back to localStorage.
 *
 * @param key The key to use in localStorage.
 * @param initialValue The initial value to use before the client-side value is available.
 * @param reader A function to parse the value from localStorage. If not provided, JSON.parse is used.
 * @returns A tuple with the state value and its setter function.
 */
export function useClientState<T>(
  key: string,
  initialValue: T,
  reader?: StateReader<T>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Read from localStorage once mounted
  useEffect(() => {
    if (isMounted) {
      try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          const parsedValue = reader ? reader(storedValue) : JSON.parse(storedValue);
          setState(parsedValue);
        }
      } catch (error) {
        console.error(`Failed to read from localStorage with key "${key}"`, error);
      }
    }
  }, [key, reader, isMounted]);

  // A memoized setter function that updates both state and localStorage
  const setAndStoreState: React.Dispatch<React.SetStateAction<T>> = useCallback((newValue) => {
    // We need to use the functional form of setState to ensure we have the latest state
    // when calculating the value to store.
    setState(prevState => {
      const valueToStore = newValue instanceof Function ? newValue(prevState) : newValue;
      
      // Only write to localStorage on the client
      if (isMounted) {
          try {
            if (valueToStore === null || valueToStore === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(valueToStore));
            }
          } catch (error) {
            console.error(`Failed to save to localStorage with key "${key}"`, error);
          }
      }
      return valueToStore;
    });
  }, [key, isMounted]);

  return [state, setAndStoreState];
}
