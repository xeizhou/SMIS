# SMIS System Process Flowcharts

These flowcharts document the **actual system process logic**, categorized by system modules exactly as they flow in the database, breaking down sub-decisions, status transitions, auto-email routing, and dashboard analytics transfers. 

---

## Diagram 1: PROCUREMENT & DELIVERIES

```mermaid
flowchart TD
    START([START])
    
    subgraph MD_PROC [Master Data]
        direction LR
        SUP[Supplier List]
        FC[Fund Clusters]
    end

    START --> MD_PROC

    subgraph PO_MOD [Purchase Order]
        PO_CREATE[Create Purchase Order]
        PO_STEP{po_step?}
        PO_S1[Forwarded to Supplier]
        PO_S2[Forwarded to VPAD / End User]
        PO_S3[Forwarded to COA]
        PO_S4[For Release]
        PO_S5[Payment Processing]
        PO_S6[Forwarded to Finance]
        PO_END([PO Complete])

        PO_CREATE --> PO_STEP
        PO_STEP --> PO_S1 & PO_S2 & PO_S3 & PO_S4 & PO_S5 & PO_S6
        PO_S1 & PO_S2 & PO_S3 & PO_S4 & PO_S5 & PO_S6 --> PO_END
    end

    MD_PROC --> PO_CREATE

    subgraph LET_MOD [PO Letter Monitoring]
        LET_CREATE[Log Received PO Letter]
        LET_STEP{Routing Status?}
        LET_S1[Forwarded to OVPAD]
        LET_S2[Forwarded to End User]
        LET_END([Letter Processed])

        LET_CREATE --> LET_STEP
        LET_STEP --> LET_S1 --> LET_S2 --> LET_END
    end

    PO_CREATE -.->|Generates Letter| LET_CREATE

    subgraph DEL_MOD [Delivery]
        DEL_CREATE[Create Delivery Record]
        DEL_STAT{Delivery Status?}
        DEL_PARTIAL[PARTIAL]
        DEL_PENDING[PENDING]
        DEL_COMP[COMPLETE]
        DEL_CANC[CANCELLED]
        DEL_END([Delivery Done])

        DEL_CREATE --> DEL_STAT
        DEL_STAT --> DEL_PARTIAL & DEL_PENDING & DEL_COMP & DEL_CANC
        DEL_PARTIAL & DEL_PENDING & DEL_COMP & DEL_CANC --> DEL_END
    end

    PO_STEP -.->|Triggers Delivery| DEL_CREATE

    subgraph EMAIL_MOD [Others: Emails]
        EM_DUE{Past 1 day due date?}
        EM_AUTO[Auto Email]
        EM_FORCE[Force Send Email]
        EM_END([Notification Sent])
        EM_SKIP([No Action])

        DEL_PENDING -.-> EM_DUE
        EM_DUE -->|Yes| EM_AUTO --> EM_END
        EM_DUE -->|No| EM_SKIP
        
        DEL_PENDING -.-> EM_FORCE --> EM_END
    end

    subgraph DASH_MOD [Others: Dashboards]
        DASH_DUE[Due Deliveries]
        DASH_NOT[Notice of Deliveries]
        DASH_PEND[Pending Deliveries]
        DASH_INSP[Inspection]
        DASH_LET[PO Letter Status Graph]
    end

    DEL_CREATE -.->|Filter: Due Date <= Today| DASH_DUE
    DEL_CREATE -.->|Filter: Has Upcoming Target Dates| DASH_NOT
    DEL_PENDING -.->|Filter: Status is PENDING| DASH_PEND
    PO_END -.->|Filter: Step is Forwarded to Finance| DASH_INSP
    LET_END -.->|Groups by Routing Status| DASH_LET
```

---

## Diagram 2: STOCK CARDS

```mermaid
flowchart TD
    START([START])

    subgraph MD_STK [Master Data]
        direction LR
        OFF[Offices]
        UNIT[Units]
    end

    START --> MD_STK

    subgraph STK_MOD [Stock Items]
        STK_LIST[Stock Items List]
        STK_DETAIL[Stock Items]
        
        STK_LIST --> STK_DETAIL
    end

    MD_STK --> STK_MOD

    subgraph TXN_MOD [Transactions]
        TXN_CREATE[Create Transaction]
        TXN_TYPE{Transaction Type?}
        TXN_REC[RECEIVE]
        TXN_ISS[ISSUE]
        TXN_BAL[Update Stock Balance]
        TXN_END([Ledger Updated])

        TXN_CREATE --> TXN_TYPE
        TXN_TYPE --> TXN_REC
        TXN_TYPE --> TXN_ISS
        TXN_REC --> TXN_BAL
        TXN_ISS --> TXN_BAL
        TXN_BAL --> TXN_END
    end

    STK_DETAIL -.->|Initiate TXN| TXN_CREATE

    subgraph REP_MOD [Data & Reports]
        REP_GEN[Generate Stock Reports]
        REP_END([Reports Downloaded])
        REP_GEN --> REP_END
    end

    TXN_BAL -.-> REP_GEN

    subgraph DASH_STK [Others: Dashboards]
        DASH_BAL[Stock Cards Dashboard]
        DASH_ISSUE[Issuance Analytics]
    end

    TXN_BAL -.->|Filter: Current Quantity on Hand| DASH_BAL
    TXN_ISS -.->|Filter: Sum of Quantity Issued| DASH_ISSUE
```

---

## Diagram 3: ASSETS & PERSONNEL FILES

```mermaid
flowchart TD
    START([START - HR / Asset Action])

    subgraph PERS_MOD [Personnel Files]
        EMP[Employee File Locator]
        OFF[Offices]
        
        CLR_CREATE[File Clearance - Retired - Resignation - Transfer - JO COS - Faculty - External]
        CLR_IS_CLEARED{Is Cleared?}
        CLR_IS_CLAIMED{Is Claimed?}
        CLR_PEND[Pending Processing]
        CLR_UNCLAIMED[Cleared but Unclaimed]
        CLR_COMP[Completed]
        CLR_END([Clearance Finalized])
        
        OFF -.->|Selects Office| CLR_CREATE
        
        CLR_CREATE --> CLR_IS_CLEARED
        CLR_IS_CLEARED -->|No| CLR_PEND
        CLR_PEND -.->|Process Updates| CLR_IS_CLEARED
        
        CLR_IS_CLEARED -->|Yes| CLR_IS_CLAIMED
        CLR_IS_CLAIMED -->|No| CLR_UNCLAIMED
        CLR_UNCLAIMED -.->|Requester Claims| CLR_IS_CLAIMED
        
        CLR_IS_CLAIMED -->|Yes| CLR_COMP
        CLR_COMP --> CLR_END
    end

    START --> PERS_MOD

    subgraph ITR_MOD [ITR PTR]
        ITR_CREATE[Create ITR PTR]
        ITR_COND{Condition?}
        ITR_GOOD[Good]
        ITR_BAD[Unserviceable]
        ITR_END([Transfer OK])

        ITR_CREATE --> ITR_COND
        ITR_COND --> ITR_GOOD --> ITR_END
        ITR_COND --> ITR_BAD
    end
    
    START --> ITR_CREATE

    subgraph BONA_MOD [Bona Vida]
        BONA_CREATE[Create Bona Vida Entry]
        BONA_END([Entry Recorded])
        BONA_CREATE --> BONA_END
    end
    
    START --> BONA_CREATE

    subgraph RRPPE_MOD [RRPPE Monitoring]
        RRPPE_CREATE[Create RRPPE]
        RRPPE_ADD[Add RRPPE Items]
        RRPPE_STAT{Item Status?}
        RRPPE_ACT[Active / Returned]
        RRPPE_DISP[Unserviceable]
        RRPPE_END([RRPPE Closed])

        RRPPE_CREATE --> RRPPE_ADD --> RRPPE_STAT
        RRPPE_STAT --> RRPPE_ACT --> RRPPE_END
        RRPPE_STAT --> RRPPE_DISP
    end

    START --> RRPPE_CREATE

    subgraph RRSP_MOD [RRSP Monitoring]
        RRSP_CREATE[Create RRSP]
        RRSP_ADD[Add RRSP Items]
        RRSP_STAT{Item Status?}
        RRSP_ACT[Active / Returned]
        RRSP_DISP[Unserviceable]
        RRSP_END([RRSP Closed])

        RRSP_CREATE --> RRSP_ADD --> RRSP_STAT
        RRSP_STAT --> RRSP_ACT --> RRSP_END
        RRSP_STAT --> RRSP_DISP
    end

    START --> RRSP_CREATE
    PO_EXT[[Procurement: Purchase Order]] -.->|Optional Reference| RRSP_CREATE

    subgraph DISP_MOD [For Disposal]
        DISP_IN[Auto-received Unserviceable Item]
        DISP_APP[Disposal Approved]
        DISP_END([Property Disposed])

        DISP_IN --> DISP_APP
        DISP_APP --> DISP_END
    end

    ITR_BAD -.->|Auto-Transport| DISP_IN
    RRPPE_DISP -.->|Auto-Transport| DISP_IN
    RRSP_DISP -.->|Auto-Transport| DISP_IN

    subgraph REGSPI_MOD [RegSPI Monitoring]
        REG_CREATE[Create RegSPI Record]
        REG_RRSP[Select RRSP Reference]
        REG_ITEM[Add Item/s]
        REG_QTY[Input Quantities: Issued, Returned, Reissued, Disposed]
        REG_BAL[Auto-Calculate Balance Qty]
        REG_END([RegSPI Record Saved])

        REG_CREATE --> REG_RRSP --> REG_ITEM
        REG_ITEM --> REG_QTY --> REG_BAL --> REG_END
    end

    RRSP_END -.->|Foreign Key: RRSP No.| REG_RRSP
```
