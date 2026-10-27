<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 60px 60px 70px 60px;
        }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
        .header-title { text-align: center; font-weight: bold; font-size: 21px; white-space: nowrap; }

        table.header-table { width: 100%; border-collapse: collapse; margin-top: 0; margin-bottom: 20px; table-layout: fixed; }
        table.header-table td { border: none; padding: 0; vertical-align: middle; }
        table.header-table td.side { width: 72px; }
        table.header-table td.title { text-align: center; }
        table.header-table .logo { width: 72px; height: 72px; }
        .meta { font-size: 12px; font-weight: bold; margin: 4px 0; }
        
        /* Added table-layout: fixed to force strict column sizing */
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 16px; 
            table-layout: fixed; 
        }
        
        th { background-color: #f5f5f5; color: #000000; padding: 6px 8px; text-align: center; font-size: 13px; border-top: 1px solid #000000; border-bottom: 1px solid #000000;}
        th.center, td.center { text-align: center; }
        
        /* Added word-wrap to ensure text breaks cleanly */
        td { padding: 5px 8px; border-bottom: 1px solid #000000; font-size: 13px; word-wrap: break-word; }
        tr:nth-child(even) td { background-color: #ffffff; }
        .blank { display: inline-block; width: 60px; border-bottom: 1px solid #000; }

        /* --- NEW: Explicit Column Widths --- */
        th:nth-child(1) { width: 45%; } /* Item Description */
        th:nth-child(2) { width: 15%; } /* Unit */
        th:nth-child(3) { width: 20%; } /* Quantity Per Stock Card */
        th:nth-child(4) { width: 20%; } /* Quantity Per Physical Count */
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td class="side"><img class="logo" src="{{ public_path('usep-logo.png') }}" alt="USeP Logo"></td>
            <td class="title"><div class="header-title">REPORT OF PHYSICAL COUNT INVENTORIES</div></td>
            <td class="side"></td>
        </tr>
    </table>

    <p class="meta">FUND CLUSTER: {{ $fundClusterLabel }}</p>
    <p class="meta">AS OF: {{ $asOfLabel ?: '____________________' }}</p>

    <table>
        <thead>
            <tr>
                <th>ITEM DESCRIPTION</th>
                <th>UNIT</th>
                <th class="center">QUANTITY PER<br>STOCK CARD</th>
                <th class="center">QUANTITY PER<br>PHYSICAL COUNT</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($items as $item)
                <tr>
                    <td>
                        {{ $item->item_name }}{{ $item->item_description ? ' - ' . $item->item_description : '' }}
                    </td>
                    <td class="center">{{ $item->unit_short_name }}</td>
                    <td class="center">{{ $item->balance_per_stock_card }}</td>
                    <td class="center"><span class="blank">&nbsp;</span></td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>