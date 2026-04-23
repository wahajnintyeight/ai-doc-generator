# Error UI Comparison - Before vs After

## Visual Comparison

### BEFORE: Error at Bottom
```
┌─────────────────────────────────────┐
│ AGENT PANE                    ⚙️    │
├─────────────────────────────────────┤
│                                     │
│              ┌──────────────┐       │
│              │ YOU          │       │
│              │ hi           │       │
│              └──────────────┘       │
│                                     │
│              ┌──────────────┐       │
│              │ YOU          │       │
│              │ hi           │       │
│              └──────────────┘       │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Ask follow-up...                │ │
│ │                           [Send]│ │
│ └─────────────────────────────────┘ │
│ ⚠️ This request requires more       │
│    credits, or fewer max_tokens...  │
└─────────────────────────────────────┘
```

### AFTER: Error as Message
```
┌─────────────────────────────────────┐
│ AGENT PANE                    ⚙️    │
├─────────────────────────────────────┤
│                                     │
│              ┌──────────────┐       │
│              │ YOU          │       │
│              │ hi           │       │
│              └──────────────┘       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 ERROR                        │ │
│ │ This request requires more      │ │
│ │ credits, or fewer max_tokens... │ │
│ └─────────────────────────────────┘ │
│                                     │
│              ┌──────────────┐       │
│              │ YOU          │       │
│              │ Let me try...│       │
│              └──────────────┘       │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Ask follow-up...                │ │
│ │                           [Send]│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Detailed Comparison

### Message Bubble Styles

#### User Message (Unchanged)
```
┌────────────────────────┐
│ YOU                    │
│ Generate docs for API  │
└────────────────────────┘
```
- Alignment: Right
- Border: `border-cyan-500/30`
- Background: `bg-cyan-500/10`
- Text: `text-cyan-100`

#### Agent Message (Unchanged)
```
┌────────────────────────┐
│ AGENT                  │
│ Here's your document...│
└────────────────────────┘
```
- Alignment: Left
- Border: `border-white/10`
- Background: `bg-white/[0.03]`
- Text: `text-slate-200`

#### Error Message (NEW)
```
┌────────────────────────┐
│ 🔴 ERROR               │
│ Failed to generate...  │
└────────────────────────┘
```
- Alignment: Left
- Border: `border-red-500/30`
- Background: `bg-red-500/10`
- Text: `text-red-200`
- Icon: AlertCircle

## Color Palette

### Before (Bottom Error)
```css
/* Error text at bottom */
color: rgb(253, 164, 175); /* text-rose-300 */
font-size: 0.75rem; /* text-xs */
margin-top: 0.5rem;
```

### After (Error Message)
```css
/* Error message bubble */
border: 1px solid rgba(239, 68, 68, 0.3); /* border-red-500/30 */
background: rgba(239, 68, 68, 0.1); /* bg-red-500/10 */

/* Error label */
color: rgb(248, 113, 113); /* text-red-400 */
font-size: 0.625rem; /* text-[10px] */
text-transform: uppercase;
letter-spacing: 0.2em;

/* Error content */
color: rgb(254, 202, 202); /* text-red-200 */
font-size: 0.875rem; /* text-sm */
line-height: 1.5rem;
```

## Layout Comparison

### Before: Fixed Error Position
```
┌─────────────────────────┐
│ Scrollable Messages     │
│ Area                    │
│                         │
│ (User can scroll)       │
│                         │
├─────────────────────────┤
│ Input Area              │
│ [Text Input]      [Send]│
│ ⚠️ Error Here (Fixed)   │ ← Always at bottom
└─────────────────────────┘
```

### After: Error in Message Flow
```
┌─────────────────────────┐
│ Scrollable Messages     │
│ Area                    │
│                         │
│ [User Message]          │
│ [Error Message] ← Flows │
│ [User Message]          │
│ (User can scroll)       │
│                         │
├─────────────────────────┤
│ Input Area              │
│ [Text Input]      [Send]│
│ (No error here)         │
└─────────────────────────┘
```

## Interaction Flow

### Before
```
User submits prompt
    ↓
Error occurs
    ↓
Error text appears at bottom
    ↓
User must scroll up to see context
    ↓
Error disappears on next submission
```

### After
```
User submits prompt
    ↓
User message appears in chat
    ↓
Error occurs
    ↓
Error message appears in chat flow
    ↓
User sees error in context
    ↓
Error remains in history
    ↓
User can continue conversation
```

## Advantages of New Approach

### 1. Contextual
```
[YOU] Generate a 50-page document
[ERROR] Token limit exceeded
[YOU] Ok, make it shorter
[AGENT] Here's a concise version...
```
Error is part of the conversation context.

### 2. Persistent
```
[YOU] First request
[ERROR] API key invalid
[YOU] Second request
[AGENT] Success!
```
Error history is preserved, user can scroll back.

### 3. Consistent
All messages use the same bubble UI pattern:
- User: Cyan bubble (right)
- Agent: Gray bubble (left)
- Error: Red bubble (left)

### 4. Scalable
```
[YOU] Request 1
[ERROR] Error 1
[YOU] Request 2
[ERROR] Error 2
[YOU] Request 3
[AGENT] Success!
```
Multiple errors don't overlap or conflict.

## Code Comparison

### Before: Separate Error Display
```jsx
<div className="border-t border-white/10 p-4">
  <PromptComposer ... />
  {error ? (
    <p className="mt-2 text-xs text-rose-300">
      {error}
    </p>
  ) : null}
</div>
```

### After: Error as Message
```jsx
function MessageBubble({ message }) {
  if (message.role === 'error') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[88%] rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">
            <AlertCircle className="h-3 w-3" />
            Error
          </p>
          <p className="whitespace-pre-wrap text-red-200">
            {message.content}
          </p>
        </div>
      </div>
    );
  }
  // ... other message types
}
```

## Responsive Behavior

### Mobile View
```
┌─────────────┐
│ AGENT PANE  │
├─────────────┤
│             │
│  ┌────────┐ │
│  │ YOU    │ │
│  │ hi     │ │
│  └────────┘ │
│             │
│ ┌─────────┐ │
│ │🔴 ERROR │ │
│ │ Token   │ │
│ │ limit   │ │
│ └─────────┘ │
│             │
├─────────────┤
│ [Input]     │
└─────────────┘
```
Error messages wrap naturally within the chat flow.

## Accessibility

### Before
- Error text at bottom might be missed by screen readers
- No semantic indication it's an error
- Disappears on next action

### After
- Error is part of message flow (read in order)
- AlertCircle icon provides visual indicator
- "ERROR" label provides semantic meaning
- Persists in conversation history
- Can be navigated with keyboard

## Animation

### Error Message Entry
```javascript
// Framer Motion animation (inherited from message list)
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2 }}
```

Error messages slide in smoothly like other messages.

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Location | Bottom of pane | In message flow |
| Persistence | Temporary | Permanent |
| Context | Separate | Integrated |
| Styling | Plain text | Message bubble |
| Icon | None | AlertCircle |
| History | Lost | Preserved |
| Scrolling | Fixed position | Scrollable |
| Multiple errors | Overwrites | Stacks naturally |
| Accessibility | Limited | Full support |
| Consistency | Different UI | Same as messages |
