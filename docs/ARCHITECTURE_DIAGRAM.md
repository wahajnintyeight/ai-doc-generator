# Architecture Diagram - OpenRouter Models Integration

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.jsx                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ State Management                                           │ │
│  │  - openRouterModels: []                                    │ │
│  │  - provider: 'openai' | 'openrouter' | 'gemini'          │ │
│  │  - model: string                                           │ │
│  │  - apiKey: string                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Functions                                                   │ │
│  │  - loadOpenRouterModelsIfNeeded()                          │ │
│  │  - updateProvider()                                         │ │
│  │  - updateModel()                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────┬───────────────────────────────────────────┘
                        │
                        ├─────────────────┐
                        │                 │
                        ▼                 ▼
        ┌───────────────────────┐   ┌──────────────┐
        │   SettingsModal.jsx   │   │ AgentPane    │
        │                       │   │              │
        │  ┌─────────────────┐ │   │  (Future)    │
        │  │ Local State     │ │   └──────────────┘
        │  │ - isLoading     │ │
        │  │ - error         │ │
        │  └─────────────────┘ │
        │                       │
        │  ┌─────────────────┐ │
        │  │ Provider Select │ │
        │  └─────────────────┘ │
        │           │           │
        │           ▼           │
        │  ┌─────────────────┐ │
        │  │ Model Selection │ │
        │  │                 │ │
        │  │ if OpenRouter:  │ │
        │  │   ┌───────────┐ │ │
        │  │   │ Searchable│ │ │
        │  │   │ Dropdown  │ │ │
        │  │   └───────────┘ │ │
        │  │ else:           │ │
        │  │   ┌───────────┐ │ │
        │  │   │  Standard │ │ │
        │  │   │  Select   │ │ │
        │  │   └───────────┘ │ │
        │  └─────────────────┘ │
        │           │           │
        │           ▼           │
        │  ┌─────────────────┐ │
        │  │ API Key Input   │ │
        │  └─────────────────┘ │
        └───────────┬───────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │ SearchableModelDropdown.jsx   │
    │                               │
    │  ┌─────────────────────────┐ │
    │  │ Props                   │ │
    │  │  - value                │ │
    │  │  - onChange             │ │
    │  │  - models               │ │
    │  │  - isLoading            │ │
    │  │  - error                │ │
    │  │  - allowCustom          │ │
    │  └─────────────────────────┘ │
    │                               │
    │  ┌─────────────────────────┐ │
    │  │ UI Components           │ │
    │  │  ┌──────────────────┐  │ │
    │  │  │ Input Field      │  │ │
    │  │  │ (type/select)    │  │ │
    │  │  └──────────────────┘  │ │
    │  │         │               │ │
    │  │         ▼               │ │
    │  │  ┌──────────────────┐  │ │
    │  │  │ Dropdown Menu    │  │ │
    │  │  │  ┌────────────┐  │  │ │
    │  │  │  │ Search Box │  │  │ │
    │  │  │  └────────────┘  │  │ │
    │  │  │  ┌────────────┐  │  │ │
    │  │  │  │ Model List │  │  │ │
    │  │  │  │  - Item 1  │  │  │ │
    │  │  │  │  - Item 2  │  │  │ │
    │  │  │  │  - ...     │  │  │ │
    │  │  │  └────────────┘  │  │ │
    │  │  │  ┌────────────┐  │  │ │
    │  │  │  │ Footer     │  │  │ │
    │  │  │  └────────────┘  │  │ │
    │  │  └──────────────────┘  │ │
    │  └─────────────────────────┘ │
    └───────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Opens Settings
     ▼
┌─────────────────┐
│ SettingsModal   │
└────┬────────────┘
     │ 2. Selects OpenRouter
     ▼
┌─────────────────┐
│ App.jsx         │
│ updateProvider()│
└────┬────────────┘
     │ 3. Triggers useEffect
     ▼
┌─────────────────────────┐
│ loadOpenRouterModels()  │
└────┬────────────────────┘
     │ 4. Calls API
     ▼
┌─────────────────────────┐
│ openRouterClient.js     │
│ fetchOpenRouterModels() │
└────┬────────────────────┘
     │ 5. HTTP Request
     ▼
┌─────────────────────────┐
│ OpenRouter API          │
│ /api/v1/models          │
└────┬────────────────────┘
     │ 6. Returns JSON
     ▼
┌─────────────────────────┐
│ sortModelsByPopularity()│
└────┬────────────────────┘
     │ 7. Sorted models
     ▼
┌─────────────────────────┐
│ setOpenRouterModels()   │
└────┬────────────────────┘
     │ 8. State update
     ▼
┌─────────────────────────┐
│ SearchableModelDropdown │
│ (receives models prop)  │
└────┬────────────────────┘
     │ 9. User searches/selects
     ▼
┌─────────────────────────┐
│ onChange callback       │
└────┬────────────────────┘
     │ 10. Updates model
     ▼
┌─────────────────────────┐
│ configManager.set()     │
│ (persists to disk)      │
└─────────────────────────┘
```

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Application State                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐         ┌────────────────┐             │
│  │ Global State   │         │ Modal State    │             │
│  │ (App.jsx)      │         │ (Settings)     │             │
│  │                │         │                │             │
│  │ • provider     │◄────────┤ • isLoading    │             │
│  │ • apiKey       │         │ • error        │             │
│  │ • model        │         │ • isOpen       │             │
│  │ • openRouter   │         └────────────────┘             │
│  │   Models[]     │                                         │
│  └────────────────┘                                         │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────┐         ┌────────────────┐             │
│  │ Component      │         │ Dropdown State │             │
│  │ State          │         │                │             │
│  │                │         │ • isOpen       │             │
│  │ • messages     │────────►│ • searchQuery  │             │
│  │ • isGenerating │         │ • inputValue   │             │
│  │ • activeFile   │         │ • filtered     │             │
│  └────────────────┘         │   Models[]     │             │
│                              └────────────────┘             │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Persistent State (Config)                 │ │
│  │                                                          │ │
│  │  • theme                                                │ │
│  │  • provider                                             │ │
│  │  • apiKey (encrypted)                                   │ │
│  │  • model                                                │ │
│  │  • lastUsed                                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## API Integration Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    API Integration Layer                      │
└──────────────────────────────────────────────────────────────┘

Frontend                    Network                  OpenRouter
─────────                   ───────                  ──────────

┌─────────────┐
│ User Action │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ fetchOpenRouter     │
│ Models(apiKey)      │
└──────┬──────────────┘
       │
       │ fetch()
       ├──────────────────────────────────────────┐
       │                                           │
       ▼                                           ▼
┌─────────────────────┐                  ┌─────────────────┐
│ Request Headers     │                  │ OpenRouter API  │
│ Authorization:      │─────────────────►│ /api/v1/models  │
│ Bearer {apiKey}     │                  └────────┬────────┘
└─────────────────────┘                           │
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ Response JSON   │
                                          │ { data: [...] } │
                                          └────────┬────────┘
                                                   │
       ┌───────────────────────────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Transform Data      │
│ Extract: id, name,  │
│ description, etc.   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ sortByPopularity()  │
│ Prioritize popular  │
│ providers           │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Return models[]     │
└─────────────────────┘
```

## Component Interaction Sequence

```
User Opens Settings
        │
        ▼
┌───────────────────┐
│ SettingsModal     │
│ isOpen = true     │
└────────┬──────────┘
         │
         ▼
    useEffect()
         │
         ├─── provider === 'openrouter'? ───┐
         │                                   │
         NO                                 YES
         │                                   │
         ▼                                   ▼
    Show standard                    Check apiKey?
    dropdown                              │
         │                                 │
         │                            ┌────┴────┐
         │                           YES       NO
         │                            │         │
         │                            ▼         ▼
         │                    Fetch models   Show error
         │                            │
         │                            ▼
         │                    ┌──────────────┐
         │                    │ Loading...   │
         │                    └──────┬───────┘
         │                           │
         │                      ┌────┴────┐
         │                   Success   Error
         │                      │         │
         │                      ▼         ▼
         │                  Display   Show error
         │                  models    message
         │                      │
         └──────────────────────┴─────────────┐
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │ User interacts   │
                                    │ with dropdown    │
                                    └────────┬─────────┘
                                             │
                                    ┌────────┴────────┐
                                    │                 │
                                Search            Select
                                    │                 │
                                    ▼                 ▼
                            Filter models      onChange()
                                    │                 │
                                    │                 ▼
                                    │         Update model
                                    │         state
                                    │                 │
                                    │                 ▼
                                    │         Save to config
                                    │                 │
                                    └─────────────────┘
```

## Error Handling Flow

```
┌─────────────────────┐
│ API Call Initiated  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Try Block    │
    └──────┬───────┘
           │
           ├─────────────────────────────────┐
           │                                 │
        Success                           Error
           │                                 │
           ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│ Process Response │              │ Catch Block      │
└──────┬───────────┘              └────────┬─────────┘
       │                                   │
       ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│ Update State     │              │ Set Error State  │
│ - models[]       │              │ - error message  │
│ - isLoading=false│              │ - isLoading=false│
└──────┬───────────┘              └────────┬─────────┘
       │                                   │
       ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│ Render Success   │              │ Show Error UI    │
│ - Model list     │              │ - Error message  │
│ - Searchable     │              │ - Retry button   │
└──────────────────┘              └──────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ Fallback to      │
                                  │ Static Models    │
                                  └──────────────────┘
```

## Legend

```
┌─────┐
│ Box │  = Component/Module
└─────┘

   │
   ▼     = Data/Control Flow

  ┌─┐
──┤ ├──  = Decision Point
  └─┘

[Text]   = State/Data

(Text)   = Action/Function
```
