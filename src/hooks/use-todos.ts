
'use client';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { useCollection, useMemoFirebase, WithId } from '@/firebase';
import {
  query,
  collection,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  onSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  createdAt: any;
}

export interface TodoList {
  id: string;
  title: string;
  color?: string;
  createdAt: any;
  items: TodoItem[];
}

export function useTodos() {
  const { firestore, user } = useFirebase();
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const listsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, 'todoLists'), orderBy('createdAt', 'asc'))
        : null,
    [firestore, user]
  );
  
  useEffect(() => {
    if (!listsQuery) {
        setIsLoading(false);
        setTodoLists([]);
        return;
    }

    const unsubscribe = onSnapshot(listsQuery, (listSnapshot) => {
        const listsData = listSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Omit<TodoList, 'items'>[];
        
        const unsubscribers = listsData.map(list => {
            const itemsQuery = query(collection(firestore!, 'todoLists', list.id, 'todos'), orderBy('createdAt', 'desc'));
            return onSnapshot(itemsQuery, (itemsSnapshot) => {
                const items = itemsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as TodoItem[];
                setTodoLists(prevLists => {
                    const existingList = prevLists.find(l => l.id === list.id);
                    if (existingList) {
                        return prevLists.map(l => l.id === list.id ? { ...l, items } : l);
                    }
                    return [...prevLists, { ...list, items }];
                });
            }, (err) => {
                console.error(`Error fetching todos for list ${list.id}:`, err);
                setError(err);
            });
        });

        setIsLoading(false);

        // This makes sure we update the lists if a list is deleted
        setTodoLists(currentTodoLists => {
            const listIdsFromSnapshot = new Set(listsData.map(l => l.id));
            return currentTodoLists.filter(l => listIdsFromSnapshot.has(l.id));
        });

        return () => unsubscribers.forEach(unsub => unsub());

    }, (err) => {
        console.error("Error fetching todo lists:", err);
        setError(err);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [listsQuery, firestore]);
  
  const addList = useCallback(async (title: string) => {
    if (!firestore || !user) return;
    const newList = {
        title,
        color: 'bg-gray-200 border-gray-300',
        createdAt: serverTimestamp(),
        owner: user.uid,
    };
    try {
        await addDoc(collection(firestore, 'todoLists'), newList);
    } catch(err) {
        console.error("Error adding list:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'todoLists', operation: 'create', requestResourceData: newList
        }));
    }
  }, [firestore, user]);

  const updateList = useCallback(async (listId: string, data: Partial<Omit<TodoList, 'id' | 'items'>>) => {
      if(!firestore) return;
      const listRef = doc(firestore, 'todoLists', listId);
      try {
        await updateDoc(listRef, data);
      } catch (err) {
        console.error("Error updating list:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: listRef.path, operation: 'update', requestResourceData: data
        }));
      }
  }, [firestore]);
  
  const deleteList = useCallback(async (listId: string) => {
    if (!firestore) return;
    const listRef = doc(firestore, 'todoLists', listId);
    try {
        const todosSnapshot = await getDocs(collection(listRef, 'todos'));
        const batch = writeBatch(firestore);
        todosSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(listRef);
        await batch.commit();
    } catch (err) {
        console.error("Error deleting list:", err);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: listRef.path, operation: 'delete'
        }));
    }
  }, [firestore]);


  const addTodo = useCallback(async (listId: string, task: string) => {
    if (!firestore) return;
    const newTodo = { task, completed: false, createdAt: serverTimestamp() };
    try {
      const listRef = doc(firestore, 'todoLists', listId);
      await addDoc(collection(listRef, 'todos'), newTodo);
    } catch (err) {
      console.error("Error adding todo:", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `todoLists/${listId}/todos`, operation: 'create', requestResourceData: newTodo
      }));
    }
  }, [firestore]);

  const toggleTodo = useCallback(async (listId: string, todoId: string, completed: boolean) => {
    if (!firestore) return;
    const todoRef = doc(firestore, 'todoLists', listId, 'todos', todoId);
    try {
      await updateDoc(todoRef, { completed });
    } catch (err) {
      console.error("Error updating todo:", err);
       errorEmitter.emit('permission-error', new FirestorePermissionError({
           path: todoRef.path, operation: 'update', requestResourceData: { completed }
       }));
    }
  }, [firestore]);

  const deleteTodo = useCallback(async (listId: string, todoId: string) => {
    if (!firestore) return;
    const todoRef = doc(firestore, 'todoLists', listId, 'todos', todoId);
    try {
      await deleteDoc(todoRef);
    } catch (err) {
      console.error("Error deleting todo:", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: todoRef.path, operation: 'delete'
      }));
    }
  }, [firestore]);

  return {
    todoLists,
    isLoading: isLoading,
    error,
    addList,
    updateList,
    deleteList,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}
