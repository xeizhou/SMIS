<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>STOCK CARD</title>
    <style>
        @page {
            margin: 40px 40px 70px 40px;
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
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
            font-size: 14px;
            margin-bottom: 20px;
        }
        .entity-name {
            font-weight: bold;
            margin-bottom: 15px;
        }

        table.info-table {
            width: 100%;
            margin-bottom: 15px;
            border: none;
        }
        table.info-table td {
            padding: 2px 5px;
            vertical-align: top;
            border: none;
            white-space: nowrap;
        }
        /* Let the value columns wrap/shrink as needed, but keep labels on one line */
        table.info-table td:nth-child(2),
        table.info-table td:nth-child(4) {
            white-space: normal;
        }

        table.trans-table {
            width: 100%;
            border-collapse: collapse;
        }
        table.trans-table th, table.trans-table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
        }
        table.trans-table th {
            background-color: #fff;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <main>
        @foreach($stockItems as $item)
        <div class="stock-card">
            <div class="header-title">STOCK CARD</div>
            <div class="entity-name">ENTITY NAME: University of Southeastern Philippines - Supply Management Unit</div>

            <table class="info-table">
                <tr>
                    <td style="width: 15%;">ITEM:</td>
                    <td style="width: 35%;"><strong>{{ $item->item_name }}</strong></td>
                    <td style="width: 20%;">FUND CLUSTER:</td>
                    <td style="width: 30%;">{{ $item->display_fund_cluster }}</td>
                </tr>
                <tr>
                    <td>DESCRIPTION:</td>
                    <td>{{ $item->description ?? '' }}</td>
                    <td>STOCK NO:</td>
                    <td>{{ $item->stock_no }}</td>
                </tr>
                <tr>
                    <td>RE-ORDER POINT:</td>
                    <td>{{ $item->reorder_point ?? '' }}</td>
                    <td>UNIT:</td>
                    <td>{{ $item->unit_name ?? $item->unit_short_name }}</td>
                </tr>
            </table>

            <table class="trans-table">
                <thead>
                    <tr>
                        <th>DATE</th>
                        <th>REFERENCE</th>
                        <th>RECEIPT<br>QTY</th>
                        <th>ISSUE<br>QTY</th>
                        <th>OFFICE</th>
                        <th>BALANCE</th>
                        <th>NO. OF DAYS<br>TO CONSUME</th>
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