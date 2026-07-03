
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, Edit, Check, X, Palette } from 'lucide-react';
import { useTodos } from '@/hooks/use-todos';
import { cn } from '@/lib/utils';
import type { TodoList as TodoListType, TodoItem } from '@/hooks/use-todos';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const colorPalette = [
    { name: 'Grau', value: 'bg-gray-200 border-gray-300' },
    { name: 'Rot', value: 'bg-red-200 border-red-300' },
    { name: 'Orange', value: 'bg-orange-200 border-orange-300' },
    { name: 'Gelb', value: 'bg-yellow-200 border-yellow-300' },
    { name: 'Grün', value: 'bg-green-200 border-green-300' },
    { name: 'Blau', value: 'bg-blue-200 border-blue-300' },
    { name: 'Lila', value: 'bg-purple-200 border-purple-300' },
];


const SingleTodoList = ({ list }: { list: TodoListType }) => {
  const { updateList, deleteList, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTask, setNewTask] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(list.title);

  const handleAddTask = () => {
    if (newTask.trim()) {
      addTodo(list.id, newTask.trim());
      setNewTask('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddTask();
  };
  
  const handleTitleSave = () => {
    if (editingTitle.trim()) {
        updateList(list.id, { title: editingTitle });
        setIsEditingTitle(false);
    }
  }

  return (
    <Card className={cn("h-full flex flex-col transition-colors", list.color)}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        {!isEditingTitle ? (
             <CardTitle 
                className="text-base font-semibold flex items-center gap-2 group cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
              >
                {list.title}
                <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
        ): (
            <div className="flex items-center gap-2">
                <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} className="h-8" autoFocus />
                <Button size="icon" className="h-8 w-8" onClick={handleTitleSave}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingTitle(false)}><X className="h-4 w-4" /></Button>
            </div>
        )}
        <div className="flex items-center gap-1">
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Palette className="h-4 w-4"/></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                    <div className="flex gap-1">
                        {colorPalette.map(c => (
                            <button 
                                key={c.value} 
                                title={c.name}
                                className={cn("h-6 w-6 rounded-full border", c.value, list.color === c.value && "ring-2 ring-ring ring-offset-2")}
                                onClick={() => updateList(list.id, { color: c.value })}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteList(list.id)}>
                <Trash2 className="h-4 w-4 text-destructive"/>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 pt-0">
        <div className="flex gap-2">
          <Input
            placeholder="Neue Aufgabe..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            className="h-9 bg-white/50"
          />
          <Button onClick={handleAddTask} size="sm" className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Add
          </Button>
        </div>
        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="space-y-3">
            {list.items.length > 0 ? (
              list.items.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 group">
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(list.id, todo.id, !todo.completed)}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={cn(
                      "flex-grow text-sm cursor-pointer",
                      todo.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {todo.task}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteTodo(list.id, todo.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground pt-4">Keine Aufgaben vorhanden.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


export default function TodoList() {
    const { todoLists, addList, isLoading } = useTodos();

    if (isLoading) {
        return <Card><CardHeader><CardTitle>To-Do Listen</CardTitle></CardHeader><CardContent><p>Lade...</p></CardContent></Card>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold">Meine To-Do Listen</h2>
                <Button onClick={() => addList("Neue Liste")}><PlusCircle className="h-4 w-4 mr-2" /> Neue Liste</Button>
            </div>
            <div className="grid grid-cols-1 gap-6">
                {todoLists.map(list => (
                    <SingleTodoList key={list.id} list={list} />
                ))}
            </div>
        </div>
    )
}
