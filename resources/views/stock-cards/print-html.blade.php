<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $pdfTitle }}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
        .stock-card { page-break-after: always; padding: 20px 0; }
        .stock-card:last-child { page-break-after: auto; }
        .header-title { text-align: center; font-weight: bold; font-size: 22px; margin-bottom: 10px; }
        table.info-table { width: 100%; margin-bottom: 10px; border: none; }
        table.info-table td { padding: 3.5px 0; vertical-align: top; border: none; font-size: 13px; }
        table.info-table td.label { font-weight: bold; white-space: nowrap; }
        table.trans-table { width: 100%; border-collapse: collapse; }
        table.trans-table th, table.trans-table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 11px; }
        table.trans-table th { background-color: #D9D9D9; font-weight: bold; }

        /* Non-printing banner reminding the user to disable Chrome's
           own header/footer (URL, title, date, page count) — this
           cannot be done from CSS/JS, only from the print dialog. */
        .print-instructions {
            max-width: 700px;
            margin: 16px auto;
            padding: 12px 16px;
            border: 1px solid #d9b400;
            background: #fff8e1;
            border-radius: 6px;
            font-size: 13px;
            color: #6b5400;
        }

        @media print {
            .print-instructions { display: none; }

            @page {
                margin: 18mm 12mm 20mm 12mm;

                /* Page X of Y via CSS counters. Supported in current
                   Chrome/Edge print rendering; Firefox and Safari either
                   ignore this or render it inconsistently, in which case
                   the footer simply won't appear there — no error, just
                   silently unsupported. */
                @bottom-left {
                    content: "Page " counter(page) " of " counter(pages);
                    font-family: Arial, sans-serif;
                    font-size: 9px;
                    color: #000;
                }

                @bottom-right {
                    content: "Generated: {{ now()->format('F d, Y \a\t h:i A') }}";
                    font-family: Arial, sans-serif;
                    font-size: 9px;
                    color: #000;
                }
            }

            body { font-size: 11px; }
        }
        @media screen {
            body { max-width: 900px; margin: 20px auto; background: #f4f4f4; }
            .stock-card { background: #fff; box-shadow: 0 0 4px rgba(0,0,0,.15); padding: 24px; margin-bottom: 16px; }
        }
    </style>
</head>
<body>
    <div class="print-instructions">
        Before printing (Ctrl/Cmd+P): in the print dialog, expand
        <strong>"More settings"</strong> and turn <strong>OFF "Headers and footers"</strong>.
        This removes the browser's own URL/title/date footer so only the
        stock card content (and the "Generated" footer) prints.
    </div>

    @foreach($stockItems as $item)
    <div class="stock-card">
        <div class="header-title">STOCK CARD</div>
        <table class="info-table">
            <tr>
                <td class="label" style="width:15%;">ENTITY NAME:</td>
                <td colspan="3">University of Southeastern Philippines - Supply Management Unit</td>
            </tr>
            <tr>
                <td class="label" style="width:15%;">ITEM:</td>
                <td style="width:35%;">{{ $item->item_name }}</td>
                <td class="label" style="width:20%;">FUND CLUSTER:</td>
                <td style="width:30%;">{{ $item->display_fund_cluster }}</td>
            </tr>
            <tr>
                <td class="label">DESCRIPTION:</td>
                <td>{{ $item->description ?? '' }}</td>
                <td class="label">STOCK NO:</td>
                <td>{{ $item->stock_no }}</td>
            </tr>
            <tr>
                <td class="label">RE-ORDER POINT:</td>
                <td></td>
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
                <tr><td colspan="7">NO TRANSACTIONS FOUND</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    @endforeach

    <script>
        // Give the browser a beat to lay out the tables before invoking print,
        // especially important on large item sets.
        window.addEventListener('load', function () {
            setTimeout(function () { window.print(); }, 300);
        });
    </script>
</body>
</html>