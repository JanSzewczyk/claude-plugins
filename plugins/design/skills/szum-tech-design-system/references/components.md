# Component API Reference — @szum-tech/design-system

## Table of Contents

1. [Button](#button)
2. [Badge & BadgeOverflow](#badge--badgeoverflow)
3. [Status](#status)
4. [Alert](#alert)
5. [AlertDialog](#alertdialog)
6. [Avatar](#avatar)
7. [Card](#card)
8. [Dialog](#dialog)
9. [Sheet](#sheet)
10. [Tooltip](#tooltip)
11. [Tabs](#tabs)
12. [Accordion](#accordion)
13. [Stepper](#stepper)
14. [Field & Form Controls](#field--form-controls)
15. [Select](#select)
16. [Input, Textarea, Checkbox, RadioGroup](#input-textarea-checkbox-radiogroup)
17. [Item](#item)
18. [Timeline](#timeline)
19. [Carousel](#carousel)
20. [Progress](#progress)
21. [Spinner](#spinner)
22. [Separator](#separator)
23. [Label](#label)
24. [ScrollArea](#scrollarea)
25. [Empty](#empty)
26. [Header](#header)
27. [ColorSwatch](#colorswatch)
28. [Marquee](#marquee)
29. [Masonry](#masonry)
30. [Animated Text (TypingText, WordRotate, CountingNumber)](#animated-text)

---

## Button

```typescript
import { Button } from "@szum-tech/design-system";
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "error" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style |
| `size` | `"default" \| "sm" \| "lg" \| "icon" \| "icon-sm" \| "icon-lg"` | `"default"` | Size |
| `fullWidth` | `boolean` | `false` | Full width |
| `loading` | `boolean` | `false` | Shows spinner, disables interaction |
| `loadingPosition` | `"start" \| "end" \| "center"` | `"start"` | Spinner placement |
| `startIcon` | `ReactElement` | — | Icon before text |
| `endIcon` | `ReactElement` | — | Icon after text |
| `disabled` | `boolean` | `false` | Disabled state |
| `asChild` | `boolean` | `false` | Renders as child element (Radix Slot) |

**Variant appearance:**

- `default` — blue primary background
- `error` — red destructive background
- `outline` — bordered, transparent background, accent hover
- `secondary` — gray secondary background
- `ghost` — no background, accent hover
- `link` — text link with underline on hover

**Size heights:**

- `sm` → h-8, `default` → h-9, `lg` → h-10
- `icon-sm` → 8×8, `icon` → 9×9, `icon-lg` → 10×10

```tsx
<Button variant="default">Save</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="ghost" size="icon"><PlusIcon /></Button>
<Button loading loadingPosition="end">Submitting</Button>
<Button asChild><a href="/about">About</a></Button>
<Button variant="error" fullWidth>Delete Account</Button>
```

---

## Badge & BadgeOverflow

```typescript
import {
  Badge,
  BadgeButton,
  BadgeDot,
  BadgeOverflow,
} from "@szum-tech/design-system";
```

**Badge variants:** `"primary" | "secondary" | "outline" | "success" | "warning" | "error"`

```tsx
<Badge variant="primary">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="outline">Draft</Badge>

// BadgeDot — badge with a colored dot indicator
<BadgeDot variant="success" />

// BadgeButton — clickable badge
<BadgeButton variant="primary" onClick={...}>Filter</BadgeButton>

// BadgeOverflow — shows +N when too many badges
<BadgeOverflow max={3}>
  <Badge>Tag 1</Badge>
  <Badge>Tag 2</Badge>
  <Badge>Tag 3</Badge>
  <Badge>Tag 4</Badge>
</BadgeOverflow>
```

---

## Status

```typescript
import { Status } from "@szum-tech/design-system";
```

Pill-shaped status indicator with animated dot.

**Variants:** `"default" | "success" | "error" | "warning" | "primary"`

```tsx
<Status variant="success">Active</Status>
<Status variant="error">Failed</Status>
<Status variant="warning">Pending</Status>
<Status variant="primary">In Progress</Status>
<Status variant="default">Unknown</Status>
```

Each variant applies matching soft background, border, text, and dot colors from the semantic palette.

---

## Alert

```typescript
import { Alert, AlertTitle, AlertDescription } from "@szum-tech/design-system";
```

**Variants:** `"default" | "destructive"`

```tsx
<Alert>
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>Your profile has been updated.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong. Please try again.</AlertDescription>
</Alert>

// With icon (auto-sizes to 16px, aligns with text)
<Alert>
  <InfoIcon />
  <AlertTitle>Note</AlertTitle>
  <AlertDescription>Icons are placed before the title in JSX.</AlertDescription>
</Alert>
```

---

## AlertDialog

```typescript
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@szum-tech/design-system";
```

Confirmation dialog that blocks the UI. Use for destructive actions.

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="error">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Avatar

```typescript
import { Avatar, AvatarImage, AvatarFallback } from "@szum-tech/design-system";
```

```tsx
<Avatar>
  <AvatarImage src="https://..." alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

`AvatarFallback` shows when image fails to load (shows initials or icon).

---

## Card

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@szum-tech/design-system";
```

Base styles: `bg-card text-card-foreground border-border rounded border shadow-sm py-6`

```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Supporting description text.</CardDescription>
    <CardAction>
      <Button size="icon" variant="ghost">
        <MoreIcon />
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>Main content goes here.</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## Dialog

```typescript
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@szum-tech/design-system";
```

Modal dialog built on Radix UI Dialog.

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>Update your account details.</DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**DialogContent size variants** (from `dialog-content.types.ts`): check `DialogContentSizeType` for available sizes.

---

## Sheet

```typescript
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@szum-tech/design-system";
```

Slide-in panel from edge of screen.

**SheetContent side:** `"top" | "right" | "bottom" | "left"` (default: `"right"`)

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Filters</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
      <SheetDescription>Adjust your search criteria.</SheetDescription>
    </SheetHeader>
    {/* Content */}
    <SheetFooter>
      <SheetClose asChild>
        <Button variant="outline">Close</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

## Tooltip

```typescript
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@szum-tech/design-system";
```

Wrap app in `<TooltipProvider>` once (or per section).

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="ghost">
        <InfoIcon />
      </Button>
    </TooltipTrigger>
    <TooltipContent>More information about this feature</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Tabs

```typescript
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@szum-tech/design-system";
```

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
  <TabsContent value="analytics">Analytics content</TabsContent>
  <TabsContent value="settings">Settings content</TabsContent>
</Tabs>
```

---

## Accordion

```typescript
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@szum-tech/design-system";
```

```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>
      Yes. It adheres to the WAI-ARIA design pattern.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Is it styled?</AccordionTrigger>
    <AccordionContent>Yes, with Tailwind and OKLCH colors.</AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## Stepper

Complex multi-step wizard component with context-based state.

```typescript
import {
  Stepper,
  StepperNav,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperDescription,
  StepperPanel,
  StepperContent,
  StepperNextTrigger,
  StepperPrevTrigger,
  useStepperContext,
  useStepperItemContext,
} from "@szum-tech/design-system";
```

```tsx
<Stepper defaultValue={1}>
  <StepperNav>
    <StepperItem value={1}>
      <StepperTrigger>
        <StepperIndicator>1</StepperIndicator>
        <StepperTitle>Account</StepperTitle>
        <StepperDescription>Setup your account</StepperDescription>
      </StepperTrigger>
    </StepperItem>
    <StepperItem value={2}>
      <StepperTrigger>
        <StepperIndicator>2</StepperIndicator>
        <StepperTitle>Profile</StepperTitle>
      </StepperTrigger>
    </StepperItem>
  </StepperNav>

  <StepperPanel value={1}>
    <StepperContent>Step 1 content</StepperContent>
  </StepperPanel>
  <StepperPanel value={2}>
    <StepperContent>Step 2 content</StepperContent>
  </StepperPanel>

  <div>
    <StepperPrevTrigger asChild>
      <Button variant="outline">Back</Button>
    </StepperPrevTrigger>
    <StepperNextTrigger asChild>
      <Button>Next</Button>
    </StepperNextTrigger>
  </div>
</Stepper>
```

---

## Field & Form Controls

```typescript
import {
  Field,
  FieldGroup,
  FieldSet,
  FieldLabel,
  FieldLegend,
  FieldTitle,
  FieldDescription,
  FieldError,
  FieldContent,
  FieldSeparator,
} from "@szum-tech/design-system";
```

**Field orientation:** `"vertical" | "horizontal" | "responsive"`

- `vertical` — label above input (default)
- `horizontal` — label left, input right (inline)
- `responsive` — vertical on mobile, horizontal on `@md`

```tsx
// Standard vertical field
<Field>
  <FieldLabel>Email</FieldLabel>
  <Input type="email" />
  <FieldDescription>We'll never share your email.</FieldDescription>
  <FieldError>Invalid email address</FieldError>
</Field>

// Horizontal layout
<Field orientation="horizontal">
  <FieldLabel>Notifications</FieldLabel>
  <Checkbox />
</Field>

// FieldGroup — groups multiple fields with container query context
<FieldGroup>
  <Field orientation="responsive">
    <FieldLabel>First Name</FieldLabel>
    <Input />
  </Field>
  <Field orientation="responsive">
    <FieldLabel>Last Name</FieldLabel>
    <Input />
  </Field>
</FieldGroup>

// FieldSet — for grouped checkboxes/radios
<FieldSet>
  <FieldLegend>Preferences</FieldLegend>
  <FieldTitle>Select all that apply</FieldTitle>
  <Field orientation="horizontal">
    <FieldLabel>Marketing emails</FieldLabel>
    <Checkbox />
  </Field>
</FieldSet>
```

---

## Select

```typescript
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@szum-tech/design-system";
```

```tsx
<Select>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Fruits</SelectLabel>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Vegetables</SelectLabel>
      <SelectItem value="carrot">Carrot</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

---

## Input, Textarea, Checkbox, RadioGroup

```typescript
import { Input } from "@szum-tech/design-system";
import { Textarea } from "@szum-tech/design-system";
import { Checkbox } from "@szum-tech/design-system";
import { RadioGroup } from "@szum-tech/design-system";
```

These are styled wrappers — pass all standard HTML attributes:

```tsx
<Input type="text" placeholder="Enter value..." />
<Input type="email" aria-invalid={!!error} />
<Textarea rows={4} placeholder="Your message..." />
<Checkbox checked={checked} onCheckedChange={setChecked} />
<RadioGroup value={value} onValueChange={setValue}>
  {/* RadioGroupItem children */}
</RadioGroup>
```

All form inputs use:

- `border-input` border color
- `bg-background` background
- `ring-ring/50` focus ring
- `aria-invalid` → `ring-error` error styling

---

## Item

Flexible list item component with rich composition.

```typescript
import {
  Item,
  ItemMedia,
  ItemGroup,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemTitle,
  ItemSeparator,
} from "@szum-tech/design-system";
```

**Item variants:** `"default" | "outline" | "muted"`
**Item sizes:** `"default" | "sm"`

```tsx
<Item variant="outline">
  <ItemMedia>
    <Avatar>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  </ItemMedia>
  <ItemContent>
    <ItemHeader>
      <ItemTitle>John Doe</ItemTitle>
      <Badge variant="success">Active</Badge>
    </ItemHeader>
    <ItemDescription>Software Engineer · Remote</ItemDescription>
  </ItemContent>
  <ItemActions>
    <Button size="icon-sm" variant="ghost"><EditIcon /></Button>
  </ItemActions>
</Item>

// ItemGroup — wraps multiple items
<ItemGroup>
  <Item>...</Item>
  <ItemSeparator />
  <Item>...</Item>
</ItemGroup>
```

---

## Timeline

```typescript
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineDot,
  TimelineConnector,
  TimelineHeader,
  TimelineTitle,
  TimelineDescription,
  TimelineTime,
} from "@szum-tech/design-system";
```

**Timeline orientation:** `"vertical" | "horizontal"`
**Timeline variant:** `"default" | "alternate"`

**TimelineDot status:** `"pending" | "active" | "completed"`

- `completed` / `active` → `border-primary`
- `pending` → `border-border`

```tsx
<Timeline orientation="vertical" variant="default">
  <TimelineItem>
    <TimelineDot status="completed" />
    <TimelineConnector isCompleted />
    <TimelineContent>
      <TimelineHeader>
        <TimelineTitle>Order Placed</TimelineTitle>
        <TimelineTime>Jan 1</TimelineTime>
      </TimelineHeader>
      <TimelineDescription>Your order has been received.</TimelineDescription>
    </TimelineContent>
  </TimelineItem>
  <TimelineItem>
    <TimelineDot status="active" />
    <TimelineConnector />
    <TimelineContent>
      <TimelineHeader>
        <TimelineTitle>Processing</TimelineTitle>
        <TimelineTime>Jan 2</TimelineTime>
      </TimelineHeader>
    </TimelineContent>
  </TimelineItem>
</Timeline>
```

---

## Carousel

```typescript
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@szum-tech/design-system";
```

```tsx
<Carousel>
  <CarouselContent>
    <CarouselItem>Slide 1</CarouselItem>
    <CarouselItem>Slide 2</CarouselItem>
    <CarouselItem>Slide 3</CarouselItem>
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>
```

---

## Progress

```typescript
import { Progress } from "@szum-tech/design-system";
```

```tsx
<Progress value={65} />
<Progress value={100} className="h-2" />
```

---

## Spinner

```typescript
import { Spinner } from "@szum-tech/design-system";
```

```tsx
<Spinner />
<Spinner aria-label="Loading data" />
```

Used internally by `Button` for loading states.

---

## Separator

```typescript
import { Separator } from "@szum-tech/design-system";
```

```tsx
<Separator />
<Separator orientation="vertical" />
```

---

## Label

```typescript
import { Label } from "@szum-tech/design-system";
```

```tsx
<Label htmlFor="email">Email address</Label>
<Input id="email" type="email" />
```

---

## ScrollArea

```typescript
import { ScrollArea } from "@szum-tech/design-system";
```

```tsx
<ScrollArea className="h-64">{/* Long content */}</ScrollArea>
```

---

## Empty

Empty state display for lists, searches, or no-data scenarios.

```typescript
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@szum-tech/design-system";
```

```tsx
<Empty>
  <EmptyMedia>
    <InboxIcon className="size-12 text-muted-foreground" />
  </EmptyMedia>
  <EmptyHeader>
    <EmptyTitle>No results found</EmptyTitle>
    <EmptyDescription>Try adjusting your filters.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button variant="outline">Clear filters</Button>
  </EmptyContent>
</Empty>
```

---

## Header

```typescript
import { Header } from "@szum-tech/design-system";
```

Page-level header wrapper component.

```tsx
<Header>
  <h1 className="text-heading-h1">Dashboard</h1>
  <Button>New Item</Button>
</Header>
```

---

## ColorSwatch

```typescript
import { ColorSwatch } from "@szum-tech/design-system";
```

Visual color preview component (used in design token documentation).

```tsx
<ColorSwatch color="oklch(0.5 0.15 250)" label="Primary" />
```

---

## Marquee

Infinite scrolling content ticker.

```typescript
import { Marquee } from "@szum-tech/design-system";
```

```tsx
<Marquee>
  <span>Item 1</span>
  <span>Item 2</span>
  <span>Item 3</span>
</Marquee>

<Marquee vertical>
  <span>Vertical 1</span>
  <span>Vertical 2</span>
</Marquee>
```

Uses CSS custom properties `--duration` and `--gap` for animation control.

---

## Masonry

CSS masonry layout grid.

```typescript
import { Masonry } from "@szum-tech/design-system";
```

```tsx
<Masonry columns={3} gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Masonry>
```

---

## Animated Text

### TypingText

```typescript
import { TypingText } from "@szum-tech/design-system";
```

Typewriter animation effect.

```tsx
<TypingText text="Hello, World!" speed={50} />
```

### WordRotate

```typescript
import { WordRotate } from "@szum-tech/design-system";
```

Cycles through an array of words with animation.

```tsx
<WordRotate words={["Fast", "Reliable", "Secure"]} />
```

### CountingNumber

```typescript
import { CountingNumber } from "@szum-tech/design-system";
```

Animates counting up/down to a target number.

```tsx
<CountingNumber value={1234} duration={1000} />
```

---

## Toaster

Toast notifications (usually placed at the root layout).

```typescript
import { Toaster } from "@szum-tech/design-system";
```

```tsx
// In your root layout:
<Toaster />
```

---

## Icons

```typescript
import {
  GoogleLogoIcon,
  Auth0LogoIcon,
  XLogoIcon,
} from "@szum-tech/design-system/icons";
```

All icons are SVG React components. Standard sizing via Tailwind:

```tsx
<GoogleLogoIcon className="size-4" />
<Auth0LogoIcon className="size-6" />
<XLogoIcon className="size-5" />
```

---

## Common Patterns

### Form with react-hook-form

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FieldGroup>
      <Field>
        <FieldLabel>Username</FieldLabel>
        <Input
          {...form.register("username")}
          aria-invalid={!!form.formState.errors.username}
        />
        <FieldError>{form.formState.errors.username?.message}</FieldError>
      </Field>
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input type="email" {...form.register("email")} />
      </Field>
    </FieldGroup>
    <Button type="submit" loading={form.formState.isSubmitting}>
      Submit
    </Button>
  </form>
</Form>
```

### List with items

```tsx
<ItemGroup>
  {users.map((user) => (
    <Item key={user.id} variant="outline" size="sm">
      <ItemMedia>
        <Avatar>
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemHeader>
          <ItemTitle>{user.name}</ItemTitle>
          <Status variant={user.active ? "success" : "default"}>
            {user.active ? "Active" : "Inactive"}
          </Status>
        </ItemHeader>
        <ItemDescription>{user.email}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="icon-sm" variant="ghost">
          <MoreIcon />
        </Button>
      </ItemActions>
    </Item>
  ))}
</ItemGroup>
```

### Dashboard card grid

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card>
    <CardHeader>
      <CardTitle className="text-heading-h4">Total Revenue</CardTitle>
      <CardDescription className="text-mute">vs last month</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-display-sm">$45,231</p>
      <Badge variant="success">+20.1%</Badge>
    </CardContent>
  </Card>
</div>
```
