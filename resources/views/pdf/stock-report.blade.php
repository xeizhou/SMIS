<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
        .meta { font-size: 12px; font-weight: bold; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background-color: #f5f5f5; color: #000000; padding: 6px 8px; text-align: left; font-size: 10px; }
        th.center, td.center { text-align: center; }
        td { padding: 5px 8px; border-bottom: 1px solid #ccc; font-size: 10px; }
        tr:nth-child(even) td { background-color: #f7f2f2; }
        .blank { display: inline-block; width: 60px; border-bottom: 1px solid #000; }
    </style>
</head>
<body>
    <h1>REPORT OF PHYSICAL COUNT INVENTORIES</h1>

    <p class="meta">FUND CLUSTER: {{ $fundClusterLabel }}</p>
    <p class="meta">AS OF: {{ $asOfLabel ?: '____________________' }}</p>

    <table>
        <thead>
            <tr>
                <th>Item Description</th>
                <th>Unit</th>
                <th class="center">Quantity per<br>Stock Card</th>
                <th class="center">Quantity per<br>Physical Count</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($items as $item)
                <tr>
                    <td>
                        {{ $item->item_name }}{{ $item->item_description ? ' - ' . $item->item_description : '' }}
                    </td>
                    <td>{{ $item->unit_short_name }}</td>
                    <td class="center">{{ $item->balance_per_stock_card }}</td>
                    <td class="center"><span class="blank">&nbsp;</span></td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>