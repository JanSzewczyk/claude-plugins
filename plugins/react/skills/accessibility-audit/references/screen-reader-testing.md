# Screen Reader Testing Guide

A practical guide for testing web applications with screen readers. Screen reader testing catches accessibility issues that automated tools miss, such as confusing reading order, missing context, and poor announcements for dynamic content.

## Overview of Screen Readers

| Screen Reader | Platform   | Cost               | Engine              | Market Share |
| ------------- | ---------- | ------------------ | ------------------- | ------------ |
| **VoiceOver** | macOS, iOS | Free (built-in)    | WebKit/Safari       | ~30% mobile  |
| **NVDA**      | Windows    | Free (open source) | Firefox, Chrome     | ~30% desktop |
| **JAWS**      | Windows    | Paid (~$1000/yr)   | IE, Chrome, Firefox | ~40% desktop |
| **TalkBack**  | Android    | Free (built-in)    | Chrome              | ~10% mobile  |
| **Narrator**  | Windows    | Free (built-in)    | Edge                | ~5% desktop  |

### Which to Test With

For most web projects, test with at least two combinations:

1. **VoiceOver + Safari** (macOS) - Primary for Mac developers
2. **NVDA + Firefox** (Windows) - Most popular free desktop combo
3. **VoiceOver + Safari** (iOS) - Primary mobile screen reader

## VoiceOver Quickstart (macOS)

### Toggle VoiceOver

- **Turn on/off:** `Cmd + F5` (or triple-press Touch ID on newer Macs)
- **VO modifier keys:** `Control + Option` (referred to as "VO" below)

### Essential Navigation Keys

| Action                 | Keys                                                      |
| ---------------------- | --------------------------------------------------------- |
| Read next item         | `VO + Right Arrow`                                        |
| Read previous item     | `VO + Left Arrow`                                         |
| Activate (click)       | `VO + Space`                                              |
| Read from cursor       | `VO + A`                                                  |
| Open rotor             | `VO + U`                                                  |
| Navigate headings      | `VO + Cmd + H` (next) / `VO + Cmd + Shift + H` (previous) |
| Navigate landmarks     | Open rotor (`VO + U`), select Landmarks                   |
| Navigate links         | `VO + Cmd + L` (next link)                                |
| Navigate form controls | `VO + Cmd + J` (next form control)                        |
| Read current item      | `VO + F3`                                                 |
| Enter web content      | `VO + Shift + Down Arrow`                                 |
| Exit web content       | `VO + Shift + Up Arrow`                                   |

### The VoiceOver Rotor

The rotor (`VO + U`) is a powerful navigation tool. It displays lists of:

- **Headings** - All headings on the page with their levels
- **Landmarks** - ARIA landmarks (nav, main, footer, etc.)
- **Links** - All links on the page
- **Form Controls** - All form elements
- **Tables** - All tables

Use Left/Right arrows to switch between lists, Up/Down to select items, Enter to jump to one.

## What to Test with a Screen Reader

### 1. Page Structure and Landmarks

Verify the page has proper landmark regions:

```html
<!-- Expected landmarks -->
<header>
  <!-- banner -->
  <nav>
    <!-- navigation -->
    <main>
      <!-- main -->
      <aside>
        <!-- complementary -->
        <footer><!-- contentinfo --></footer>
      </aside>
    </main>
  </nav>
</header>
```

Test: Open the VoiceOver rotor (`VO + U`) and check the Landmarks list. Every page should have at least `banner`, `navigation`, `main`, and `contentinfo`.

### 2. Heading Hierarchy

Headings provide the primary navigation structure for screen reader users. Approximately 70% of screen reader users navigate pages by headings.

```html
<!-- Correct heading hierarchy -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h3>Subsection</h3>
<h2>Section</h2>
<h3>Subsection</h3>
```

Test: Open the rotor and check Headings. Verify:

- There is exactly one `h1`
- Heading levels do not skip (no `h1` to `h3` without `h2`)
- Headings accurately describe the content that follows

### 3. Form Labels

Every form input must have a programmatically associated label:

```typescript
// Verify screen reader announces the label when focusing the input
<label htmlFor="email">Email address</label>
<input id="email" type="email" />

// For groups of related inputs
<fieldset>
  <legend>Shipping Address</legend>
  <label htmlFor="street">Street</label>
  <input id="street" type="text" />
</fieldset>
```

Test: Tab through every form field. VoiceOver should announce the label, field type, and any required/error state.

### 4. Dynamic Content

When content updates without a page reload, screen readers need to be informed:

```typescript
// Toast notification
<div role="status" aria-live="polite">
  Settings saved successfully
</div>

// Form error that appears on submit
<div role="alert">
  Please fix the errors below
</div>

// Loading state
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? "Loading results..." : `${count} results found`}
</div>
```

Test: Trigger dynamic content changes (form submit, async load, notifications) and verify VoiceOver announces them without requiring manual navigation.

### 5. Error Announcements

Form validation errors must be announced and associated with their fields:

```typescript
<label htmlFor="password">Password</label>
<input
  id="password"
  type="password"
  aria-invalid={hasError}
  aria-describedby="password-error"
/>
{hasError && (
  <p id="password-error" role="alert">
    Password must be at least 8 characters
  </p>
)}
```

Test: Submit a form with invalid data. Verify the screen reader announces which fields have errors and what the errors are.

### 6. Interactive Components

Custom widgets (tabs, accordions, menus, dialogs) need proper ARIA patterns:

```typescript
// Tab interface
<div role="tablist" aria-label="Account settings">
  <button role="tab" aria-selected="true" aria-controls="panel-1">
    Profile
  </button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">
    Security
  </button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  {/* Panel content */}
</div>
```

Test: Navigate to the component. Verify VoiceOver announces the role, name, and state. Verify keyboard interaction matches WAI-ARIA Authoring Practices.

## Common Screen Reader Issues and Fixes

### Missing Heading Hierarchy

**Symptom:** Screen reader users cannot navigate the page structure efficiently.

```typescript
// Problem: Using styled divs instead of headings
<div className="text-2xl font-bold">Section Title</div>

// Fix: Use semantic heading elements
<h2 className="text-2xl font-bold">Section Title</h2>

// Problem: Skipping heading levels
<h1>Page</h1>
<h3>Subsection</h3>  // Skipped h2

// Fix: Maintain hierarchy
<h1>Page</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### Unlabeled Form Fields

**Symptom:** VoiceOver announces "edit text" with no context when focusing an input.

```typescript
// Problem: Placeholder is not a label
<input placeholder="Enter your email" />

// Fix: Add a proper label
<label htmlFor="email" className="sr-only">Email</label>
<input id="email" placeholder="Enter your email" />

// Problem: Label not programmatically associated
<label>Email</label>
<input type="email" />

// Fix: Use htmlFor/id association
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Dynamic Content Not Announced

**Symptom:** Screen reader users miss important updates like toast notifications, loading states, or error messages.

```typescript
// Problem: Content appears but screen reader is silent
{showSuccess && <div className="toast">Saved!</div>}

// Fix: Use aria-live region
<div aria-live="polite">
  {showSuccess && <div className="toast">Saved!</div>}
</div>

// Important: The aria-live container must be in the DOM before
// the dynamic content appears inside it. Do NOT conditionally
// render the container itself.

// Problem: aria-live on conditional wrapper
{showSuccess && (
  <div aria-live="polite">Saved!</div>  // Won't be announced
)}

// Fix: Static container, dynamic content
<div aria-live="polite">
  {showSuccess && "Saved!"}
</div>
```

### Reading Order Issues

**Symptom:** Screen reader reads content in an unexpected or confusing order.

```typescript
// Problem: Visual order differs from DOM order via CSS
<div className="flex flex-col-reverse">
  <div>Second visually, first in DOM</div>
  <div>First visually, second in DOM</div>
</div>

// Fix: Match DOM order to visual order
<div className="flex flex-col">
  <div>First visually and in DOM</div>
  <div>Second visually and in DOM</div>
</div>

// If you must reorder visually, ensure logical reading order in DOM
```

### Images Inside Links or Buttons Missing Alt Text

**Symptom:** VoiceOver announces the image filename or "image" with no context.

```typescript
// Problem: Link wrapping image with no accessible name
<a href="/profile">
  <img src="/avatar.jpg" />
</a>
// VoiceOver: "link, image, avatar.jpg"

// Fix: Provide alt text
<a href="/profile">
  <img src="/avatar.jpg" alt="Your profile" />
</a>
// VoiceOver: "link, Your profile, image"

// Fix alternative: aria-label on the link
<a href="/profile" aria-label="Your profile">
  <img src="/avatar.jpg" alt="" />
</a>
// VoiceOver: "link, Your profile"
```

## ARIA Live Regions in Practice

ARIA live regions announce dynamic content changes to screen readers. Understanding when and how to use them is critical.

### polite vs assertive

```typescript
// aria-live="polite" - Waits for screen reader to finish current speech
// Use for: toast notifications, search results count, status updates
<div aria-live="polite">
  {searchResults.length} results found
</div>

// aria-live="assertive" - Interrupts current speech immediately
// Use for: critical errors, session timeouts, urgent alerts
<div aria-live="assertive">
  Your session expires in 2 minutes
</div>

// role="alert" is equivalent to aria-live="assertive"
<div role="alert">
  Connection lost. Attempting to reconnect...
</div>

// role="status" is equivalent to aria-live="polite"
<div role="status">
  File uploaded successfully
</div>
```

### aria-atomic

Controls whether the entire region or only changed content is announced:

```typescript
// aria-atomic="true" - Read the entire region on any change
// Use for: countdown timers, score displays, composite status
<div aria-live="polite" aria-atomic="true">
  <span>Score:</span>
  <span>{homeScore}</span>
  <span>-</span>
  <span>{awayScore}</span>
</div>
// Announces: "Score: 3 - 2" (entire region)

// aria-atomic="false" (default) - Read only the changed content
<div aria-live="polite">
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>  {/* newly added */}
  </ul>
</div>
// Announces only: "Item 3"
```

### aria-relevant

Controls which types of changes are announced:

```typescript
// aria-relevant="additions" - Only announce new content (default for most)
// aria-relevant="removals" - Announce removed content
// aria-relevant="text" - Announce text changes
// aria-relevant="all" - Announce all changes
// aria-relevant="additions text" - Multiple values

// Chat messages - announce new messages only
<div aria-live="polite" aria-relevant="additions">
  {messages.map(msg => <p key={msg.id}>{msg.text}</p>)}
</div>

// Notification list - announce additions and removals
<div aria-live="polite" aria-relevant="additions removals">
  {notifications.map(n => <p key={n.id}>{n.text}</p>)}
</div>
```

### Common Live Region Patterns

```typescript
// Search results count
function SearchResults({ query, results }) {
  return (
    <>
      <div aria-live="polite" role="status" className="sr-only">
        {results.length} results for "{query}"
      </div>
      <ul>
        {results.map(r => <li key={r.id}>{r.title}</li>)}
      </ul>
    </>
  );
}

// Loading with completion announcement
function AsyncContent({ isLoading, data }) {
  return (
    <div aria-live="polite" aria-busy={isLoading}>
      {isLoading ? (
        <div role="status">
          <Spinner aria-hidden="true" />
          <span className="sr-only">Loading content...</span>
        </div>
      ) : (
        <div>{data}</div>
      )}
    </div>
  );
}

// Form validation summary
function ValidationSummary({ errors }) {
  if (errors.length === 0) return null;

  return (
    <div role="alert">
      <h2>There {errors.length === 1 ? "is 1 error" : `are ${errors.length} errors`} in the form:</h2>
      <ul>
        {errors.map(err => (
          <li key={err.field}>
            <a href={`#${err.field}`}>{err.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Screen Reader Testing Checklist

Run through these 10 checks for every component or page:

1. **Page title** - Does VoiceOver announce a descriptive page title when the page loads?
2. **Landmarks** - Can you find `main`, `navigation`, `banner`, and `contentinfo` in the rotor?
3. **Heading structure** - Do the headings in the rotor outline the page logically with no skipped levels?
4. **Images** - Are meaningful images described? Are decorative images hidden from the screen reader?
5. **Form fields** - Does every input announce its label, type, required state, and any error messages?
6. **Links and buttons** - Does every link and button have a descriptive accessible name (not "click here" or "read more")?
7. **Keyboard navigation** - Can you reach and operate every interactive element with Tab, Enter, Space, and Arrow keys?
8. **Focus management** - After opening a modal or navigating to new content, does focus move appropriately? Does it return when content is dismissed?
9. **Dynamic updates** - Are toast notifications, loading states, errors, and content changes announced?
10. **Reading order** - Does the screen reader read content in a logical, meaningful sequence?

## Practical Workflow: 5-Minute Screen Reader Check

Use this workflow for a quick accessibility check during development:

### Step 1: Start VoiceOver (30 seconds)

Press `Cmd + F5` to turn on VoiceOver. Open the page in Safari (VoiceOver works best with Safari on macOS).

### Step 2: Check Page Structure (1 minute)

Open the rotor (`VO + U`). Review:

- **Landmarks** - Is the page divided into meaningful regions?
- **Headings** - Do headings outline the page content? Any skipped levels?

### Step 3: Tab Through Interactive Elements (1.5 minutes)

Press `Tab` repeatedly to move through all interactive elements:

- Does every button and link have a clear name?
- Does every form input announce its label?
- Is there a visible focus indicator for each element?
- Can you activate every element with Enter or Space?

### Step 4: Test a Key User Flow (1.5 minutes)

Complete one primary user action (submit a form, open a dialog, add an item):

- Are loading states and success/error messages announced?
- Does focus move appropriately after actions?
- Can you complete the entire flow without a mouse?

### Step 5: Turn Off VoiceOver (30 seconds)

Press `Cmd + F5` again. Note any issues found and fix them before shipping.

## NVDA Quick Reference (Windows)

If testing on Windows, here are the essential NVDA commands:

| Action                     | Keys                            |
| -------------------------- | ------------------------------- |
| Start/Stop NVDA            | `Ctrl + Alt + N` / `Insert + Q` |
| Read next item             | `Down Arrow` (browse mode)      |
| Read previous item         | `Up Arrow` (browse mode)        |
| Activate                   | `Enter`                         |
| Next heading               | `H`                             |
| Next landmark              | `D`                             |
| Next form field            | `F`                             |
| Next link                  | `K`                             |
| Elements list (like rotor) | `Insert + F7`                   |
| Toggle browse/focus mode   | `Insert + Space`                |

## Tips for Developers

1. **Start with VoiceOver on macOS** - It is free, built-in, and pairs well with Safari for web testing.
2. **Do not try to memorize every command** - Learn the rotor and Tab navigation first. That covers 80% of testing.
3. **Close your eyes** - For at least 30 seconds, navigate with the screen reader only. This reveals issues you miss while watching the screen.
4. **Test in browse mode and focus mode** - Browse mode reads all content. Focus mode only reaches interactive elements. Both matter.
5. **Watch for "unlabeled" announcements** - Any time VoiceOver says "button" or "image" without a name, that is a bug.
6. **File bugs with screen reader output** - Include what VoiceOver actually said vs. what it should have said. This makes fixes clear.
