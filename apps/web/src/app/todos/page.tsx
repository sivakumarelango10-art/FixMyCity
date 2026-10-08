import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from('todos').select();

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Todos</h1>
      {(!todos || todos.length === 0) ? (
        <p className="text-muted-foreground text-sm">No todos found or &apos;todos&apos; table not yet created in Supabase.</p>
      ) : (
        <ul className="space-y-2 list-disc list-inside">
          {todos.map((todo: any) => (
            <li key={todo.id}>{todo.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
