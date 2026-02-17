# Builder Field Mappings

Mapping field types to appropriate mimicry-js generators and Faker methods.

> **Note:** Check `.claude/project-context.md` for locale-specific values (currency, country, etc.)
>
> **Tip:** Prefer mimicry-js built-in generators (`int`, `float`, `bool`, `oneOf`) over Faker for simple random values.
>
> **Important:** mimicry-js generators (`oneOf`, `sequence`, `int`, `float`, `bool`, `unique`, `withPrev`) only work at the **top level** of `fields` or inside **static nested objects**. Inside arrow functions `() => ...`, use Faker equivalents instead. See SKILL.md "Best Practices" for details.

## Identifiers

```typescript
id: sequence();
id: sequence((n) => `user-${n}`);
uuid: () => faker.string.uuid();
slug: () => faker.helpers.slugify(faker.lorem.words(3));
```

## Personal Data

```typescript
firstName: () => faker.person.firstName();
lastName: () => faker.person.lastName();
email: () => faker.internet.email();
email: sequence((n) => `user${n}@test.com`); // Unique sequential
phone: () => faker.phone.number();
avatar: () => faker.image.avatar();
```

## Addresses

```typescript
street: () => faker.location.streetAddress();
city: () => faker.location.city();
zipCode: () => faker.location.zipCode();
country: () => faker.location.country();
// Or use static value for your locale:
// country: "USA"  // Check project-context.md for your locale
```

## Commerce

```typescript
productName: () => faker.commerce.productName();
price: () => parseFloat(faker.commerce.price({ min: 10, max: 1000 }));
currency: "USD"; // Check project-context.md for your locale currency
category: () => faker.commerce.department();
```

## Text Content

```typescript
title: () => faker.lorem.sentence();
description: () => faker.lorem.paragraph();
text: () => faker.lorem.text();
```

## Numbers

```typescript
// Using mimicry-js built-in generators (preferred for simple ranges)
amount: float(0, 1000);
count: int(0, 100);
percentage: int(0, 100);

// Using Faker (for specific formatting)
amount: () => faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });
count: () => faker.number.int({ min: 0, max: 100 });
```

## Dates

```typescript
createdAt: () => faker.date.past();
updatedAt: () => faker.date.recent();
scheduledAt: () => faker.date.future();
birthDate: () => faker.date.birthdate({ min: 18, max: 65, mode: "age" });
```

## Booleans

```typescript
// Using mimicry-js built-in (preferred)
isActive: bool();

// Static value
isPredefined: true;
```

## Enums/Unions

```typescript
// At top level of fields: use mimicry-js oneOf (preferred — integrates with seed())
status: oneOf("active", "inactive", "pending");
role: oneOf("admin", "user", "guest");

// Inside arrow functions / nested objects returned by functions: use Faker
profile: () => ({
  theme: faker.helpers.arrayElement(["light", "dark", "system"]),
});

// For weighted selection (only available via Faker)
role: () =>
  faker.helpers.weightedArrayElement([
    { value: "user", weight: 8 },
    { value: "admin", weight: 2 },
  ]);
```

## Arrays

```typescript
tags: () =>
  faker.helpers.arrayElements(["tag1", "tag2", "tag3"], { min: 1, max: 3 });
items: () => itemBuilder.many(3);
images: () => Array.from({ length: 3 }, () => faker.image.url());
```

## Unique Values

```typescript
// Each value used exactly once (throws when exhausted)
color: unique(["red", "green", "blue"]);
```

## Dependent Values (withPrev)

```typescript
// Each build depends on previous value
timestamp: withPrev((prev?: number) => {
  return (prev ?? Date.now()) + 1000;
});
```

## Common Patterns

```typescript
// Percentage/Allocation
allocation: int(0, 100);

// Currency Amounts
amount: float(0, 10000);

// Icons (common icon names)
icon: oneOf("home", "user", "settings", "search");

// Colors (Tailwind palette)
color: oneOf("red", "blue", "green", "yellow");

// Function values (use fixed to prevent calling)
onClick: fixed(() => console.log("clicked"));
```
