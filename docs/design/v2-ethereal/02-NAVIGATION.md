# Ethereal v2 — Navigation map

```mermaid
flowchart TB
  subgraph Public
    L[Landing + Sigil]
    CH[Product chapters]
    AUTH[Login / Register / Recover / Verify]
    LEGAL[Legal / Privacy]
    L --> CH --> AUTH
    L --> LEGAL
  end

  AUTH --> HOME

  subgraph App["Authenticated shell"]
    HOME[Home dashboard]
    LIVE[Live]
    AURA[Aura AI]
    MSG[Messages]
    FR[Friends / Social]
    MKT[Marketplace]
    EDU[Learning]
    BIZ[Business]
    MUS[Music]
    CS[Creator Studio]
    WAL[Wallet]
    GIFT[Gift Shop]
    SET[Settings]
    ADM[Admin / Owner]
  end

  HOME --> FEED[Feed / Following]
  HOME --> LIVE
  FR --> PROF[Profiles]
  FR --> COM[Communities]
  MSG --> CALLS[Calls / Conference]
  LIVE --> STUDIO[Go Live / Studio path]
  CS --> EARN[Earnings]
  WAL --> PAY[Payments / methods]
  GIFT -. purchase .-> WAL
  LIVE -. send gifts .-> GIFT
  AURA -. contextual only .-> LIVE
  AURA -. contextual .-> BIZ
  AURA -. contextual .-> EDU
  AURA -. contextual .-> CS
  SET --> PRIV[Privacy / Security / AI memory]
  ADM --> KEYS[Owner service keys]
```

## Desktop sidebar order
1. Головна  
2. Ефір  
3. Aura  
4. Повідомлення  
5. Друзі  
6. Маркет  
7. Навчання  
8. Бізнес  
9. Музика  
10. Студія творця  
11. Гаманець  
12. Налаштування  

Admin appears only for roles with permission (below Settings or in More).

## Mobile bottom bar
Головна · Ефір · **+** · Повідомлення · Ще  

**Ще** contains: Друзі, Aura, Маркет, Навчання, Бізнес, Музика, Студія, Гаманець, Подарунки, Налаштування, Профіль.

## Anti-duplication
- Wallet appears once in nav.
- Gift Shop appears once (More / sidebar secondary); sending gifts only inside Live.
- Earnings primarily under Creator Studio; Wallet may deep-link once (“Виплати творця”).
