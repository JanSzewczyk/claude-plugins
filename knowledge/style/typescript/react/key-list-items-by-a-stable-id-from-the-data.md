---
title: Key list items by a stable id from the data, never by the array index
summary: key={item.id} or another unique field; an index or a key generated during render breaks state on reorder.
impact: high
applies: [typescript, react]
sources: [https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key]
---

## Rule

Give each element rendered in `map` a `key` taken from the data: an `id`, a slug or another unique field. When the data has none, attach a generated id when the data is created or loaded, not while rendering.

## Why

With index keys, reordering, filtering or inserting rows makes React reuse the wrong component, so a row keeps another row's input text or open state; a key generated during render (`crypto.randomUUID()` inside `map`) is worse, because it remounts every row on every render.

## Incorrect

```tsx
function TodoList({ todos }: TodoListProps) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />
      ))}
    </ul>
  );
}
```

## Correct

```tsx
function TodoList({ todos }: TodoListProps) {
  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
```
