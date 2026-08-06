<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $pdfTitle }}</title>
    <style>
        @page {
            margin: 75px 60px 70px 60px;
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            color: #000;
        }
        .stock-card {
            page-break-after: always;
        }
        .stock-card:last-child {
            page-break-after: auto;
        }

        .header-title {
            text-align: center;
            font-weight: bold;
            font-size: 26.7px;
            margin-bottom: 10px;
        }

        table.info-table {
            width: 100%;
            margin-bottom: 10px;
            border: none;
        }
        table.info-table td {
            padding: 3.5px 0px;
            vertical-align: top;
            border: none;
            font-size: 14.5px;
        }
        table.info-table td.label {
            font-weight: bold;
            white-space: nowrap;
        }

        table.trans-table { 
            width: 100%; 
            border-collapse: collapse; 
        }
        table.trans-table th, table.trans-table td { 
            border: 1px solid #000; 
            padding: 8px; 
            text-align: center; 
        }
        table.trans-table th { 
            background-color: #D9D9D9; 
            font-weight: bold; 
        }
    </style>
</head>
<body>
    <main>
        @foreach($stockItems as $item)
        <div class="stock-card">
            <div class="header-title">STOCK CARD</div>

            <table class="info-table">
                <tr>
                    <td class="label" style="width: 15%;">ENTITY NAME:</td>
                    <td colspan="3">University of Southeastern Philippines - Supply Management Unit</td>
                </tr>
                <tr>
                    <td class="label" style="width: 15%;">ITEM:</td>
                    <td style="width: 35%;">{{ $item->item_name }}</td>
                    <td class="label" style="width: 20%;">FUND CLUSTER:</td>
                    <td style="width: 30%;">{{ $item->display_fund_cluster }}</td>
                </tr>
                <tr>
                    <td class="label">DESCRIPTION:</td>
                    <td>{{ $item->description ?? '' }}</td>
                    <td class="label">STOCK NO:</td>
                    <td>{{ $item->stock_no }}</td>
                </tr>
                <tr>
                    <td class="label">RE-ORDER POINT:</td>
                    <td>{{ $item->reorder_point ?? '' }}</td>
                    <td class="label">UNIT:</td>
                    <td>{{ $item->unit_name ?? $item->unit_short_name }}</td>
                </tr>
            </table>

            <table class="trans-table">
                <thead>
                    <tr>
                        <th rowspan="2">DATE</th>
                        <th rowspan="2">REFERENCE</th>
                        <th rowspan="2">RECEIPT<br>QTY</th>
                        <th colspan="2">ISSUE</th>
                        <th rowspan="2">BALANCE</th>
                        <th rowspan="2">NO. OF DAYS<br>TO CONSUME</th>
                    </tr>
                    <tr>
                        <th>QTY</th>
                        <th>OFFICE</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($item->ledger as $trans)
                    <tr>
                        <td>{{ \Carbon\Carbon::parse($trans->date)->format('m/d/Y') }}</td>
                        <td>{{ $trans->reference }}</td>
                        <td>{{ $trans->receipt_qty }}</td>
                        <td>{{ $trans->issue_qty }}</td>
                        <td>{{ $trans->office }}</td>
                        <td>{{ $trans->balance }}</td>
                        <td>{{ $trans->days_to_consume }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="7" style="font-weight: bold;">NO TRANSACTIONS FOUND</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @endforeach
    </main>
</body>
</html>