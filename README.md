# Browser MCP Client

Chrome Extension の Native Messaging 機能を使用して、MCP Server と通信するクライアントです。
Chrome Extension のように、ブラウザ上の制約を受ける環境で MCP Server と通信するために設計されています。

このアプリケーションは特定環境（OpenAIやAnthropicのAPIのProxyを独自に提供しているような企業とかの環境）で使われることを想定しているため、自分の環境にいい感じに合わせて改変することを前提としています。

## 提供する機能

- ブラウザでアクセスしているページで使用している、Authorization Header を Chrome Extension 側から取得し、AI API Proxy へのリクエストに付与する機能
- MCP Server との通信
- MCP Server からのレスポンスをブラウザに返す機能

## 想定利用者

- 社内などで提供されている AI API Proxy を利用して MCP Server を利用したワークフローを利用したい人
- GitHub Copilot だったり、Gemini CLI みたいのを使ってない人

## アーキテクチャ図

### システム構成

```mermaid
graph TD
    subgraph Browser["Browser (Chrome)"]
        TargetSite["Target Website<br>(e.g. AI Proxy)"]
        
        subgraph Extension["Browser Extension"]
            SidePanel["Side Panel (React UI)"]
            Background["Background Script"]
            Storage[("Extension Storage<br>(Local)")];
        end
    end

    subgraph Host["Native Host (Node.js / SEA)"]
        Entry["Entry Point (index.ts)"]
        Agent["AI Agent (agent.mts)"]
        MCPClient["MCP Client (@ai-sdk/mcp)"]
    end

    subgraph MCPServers["MCP Servers"]
        DevTools["Chrome DevTools MCP<br>(Subprocess)"]
        OtherMCP["Other MCP Servers..."]
    end

    subgraph Cloud["External Services"]
        LLM["LLM Provider<br>(OpenAI / Anthropic)"]
    end

    %% Token Sniffing Flow
    TargetSite -. "HTTP Request<br>(Authorization Header)" .-> Background
    Background -- "Intercept & Save JWT" --> Storage
    SidePanel -- "Read JWT" --> Storage

    %% Communication Flows
    SidePanel -- "Runtime Message<br>(JSON)" --> Background
    Background -- "Runtime Message<br>(JSON)" --> SidePanel
    
    Background <-- "Native Messaging<br>(Stdio / JSON)" --> Entry
    
    Entry --> Agent
    Agent <-- "HTTP / REST Streaming" --> LLM
    
    Agent --> MCPClient
    MCPClient <-- "MCP Protocol<br>(Stdio)" --> DevTools
    MCPClient <-- "MCP Protocol<br>(Stdio)" --> OtherMCP

    %% Styling
    style Browser fill:#e1f5fe,stroke:#01579b
    style Host fill:#fff3e0,stroke:#e65100
    style MCPServers fill:#f3e5f5,stroke:#4a148c
    style Cloud fill:#e8f5e9,stroke:#1b5e20
    style Storage fill:#fff9c4,stroke:#fbc02d
```

### チャットフロー

```mermaid
sequenceDiagram
    participant User
    participant Target as Target Website
    participant SP as Side Panel
    participant BG as Background Script
    participant Storage as Extension Storage
    participant NH as Native Host
    participant LLM as LLM Provider
    participant MCP as MCP Server

    Note over User, Storage: Token Sniffing Phase
    User->>Target: Browse / Make API Call
    Target->>BG: webRequest (Authorization Header)
    BG->>Storage: Save JWT Token

    Note over User, MCP: Chat Phase
    User->>SP: Open Side Panel
    SP->>Storage: Get JWT Token
    Storage-->>SP: JWT
    
    User->>SP: Type message & Send
    SP->>BG: sendMessage({ type: "CHAT", jwt, ... })
    
    Note over BG, NH: Native Messaging Channel
    BG->>NH: postMessage({ action: "chat", jwt, ... })
    
    NH->>NH: Initialize Agent & MCP Client
    NH->>MCP: Spawn Process & Connect (Stdio)
    
    loop Chat Stream
        NH->>LLM: Stream Chat Completion (with JWT)
        LLM-->>NH: Token / Tool Call
        
        alt Tool Call (MCP)
            NH->>MCP: Execute Tool
            MCP-->>NH: Tool Result
            NH->>LLM: Send Tool Result
        end
        
        NH-->>BG: Stream Event (Token/Tool)
        BG-->>SP: Forward Event
        SP-->>User: Update UI
    end
    
    NH-->>BG: Final Event
    BG-->>SP: Final Event
```
