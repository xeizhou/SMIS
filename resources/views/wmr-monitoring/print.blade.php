<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>WMR {{ $wmr->wmr_no }}</title>
    <style>
        @page { size: A4 portrait; margin: 13mm 12mm; }
        body { margin: 0; color: #111; font-family: DejaVu Sans, Arial, sans-serif; font-size: 9pt; }
        .print-instructions { max-width: 700px; margin: 16px auto; padding: 12px 16px; border: 1px solid #d9b400; background: #fff8e1; color: #6b5400; font-size: 13px; }
        .report { width: 100%; }
        .header { margin-bottom: 15mm; text-align: center; }
        .logo { display: block; width: 25mm; height: 25mm; margin: 0 auto 2mm; }
        .university { margin: 0; font-family: DejaVu Serif, Georgia, serif; font-size: 16pt; font-weight: bold; }
        .unit { margin: 1mm 0 0; font-size: 9pt; font-style: italic; }
        .report-title { margin: 1mm 0 0; font-size: 9pt; }
        .details { width: 100%; margin-bottom: 5mm; border-collapse: collapse; }
        .details > tbody > tr > td { width: 50%; padding: 0 4mm 0 0; vertical-align: top; }
        .details > tbody > tr > td + td { padding: 0 0 0 4mm; }
        .detail { min-height: 5mm; padding: 0 0 .4mm; line-height: 1.25; }
        .label { text-transform: uppercase; }
        .wmr-number, .control-number { color: #9c3434; }
        .inline-date { padding-left: 3mm; }
        .items { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5pt; }
        .items th, .items td { border: .25mm solid #333; padding: 1.2mm 1mm; }
        .items th { font-weight: normal; text-align: center; text-transform: uppercase; }
        .items th:nth-child(1) { width: 8%; }
        .items th:nth-child(2) { width: 15%; }
        .items th:nth-child(3) { width: 10%; }
        .items th:nth-child(4) { width: 42%; }
        .items th:nth-child(5) { width: 25%; }
        .center { text-align: center; }
        .signatures { width: 36%; margin: 16mm 0 0 0; border-collapse: collapse; }
        .prepared { width: 100%; height: 35mm; }
        .noted { width: 100%; height: 34mm; }
        .signature-label { margin: 0 0 10mm; text-align: left; text-transform: uppercase; }
        .signature-name { margin: 0; text-align: center; font-weight: normal; text-transform: uppercase; }
        .signature-role { margin: 1mm 0 0; text-align: center; font-size: 8pt; }
        @media screen {
            body { max-width: 210mm; margin: 20px auto; padding: 15mm; background: #fff; box-shadow: 0 0 4px rgba(0,0,0,.15); }
        }
        @media print {
            .print-instructions { display: none; }
            body { font-size: 9pt; }
        }
    </style>
</head>
<body>
    @unless($forPdf)
        <div class="print-instructions">
            The print dialog will open automatically. Turn off browser headers and footers in the print settings for a clean copy.
        </div>
    @endunless

    @php
        $items = $wmr->items;
        if ($items->isEmpty()) {
            $legacyDescriptions = collect(preg_split('/\r\n|\r|\n/', $wmr->defects_complaints ?: $wmr->materials ?: ''))
                ->map(fn ($description) => trim($description))
                ->filter();
            $items = $legacyDescriptions->values()->map(fn ($description, $index) => (object) [
                'item_number' => $index + 1,
                'quantity' => '1',
                'unit' => 'PC',
                'description' => $description,
                'item_control_no' => sprintf('%s-%02d', $wmr->wmr_no, $index + 1),
            ]);
        }
        $displayDate = fn ($date) => $date ? \Illuminate\Support\Carbon::parse($date)->format('M j, Y') : '—';
    @endphp

    <main class="report">
        <header class="header">
            <img class="logo" src="{{ $forPdf ? public_path('usep-logo.png') : asset('usep-logo.png') }}" alt="University of Southeastern Philippines logo">
            <h1 class="university">UNIVERSITY OF SOUTHEASTERN PHILIPPINES</h1>
            <p class="unit">Supply Management Unit</p>
            <p class="report-title">WASTE MATERIAL REPORT</p>
        </header>

        <table class="details">
            <tbody>
                <tr>
                    <td><div class="detail"><span class="label">Supplier:</span> {{ $wmr->supplier?->supplier_name ?? '—' }}</div></td>
                    <td><div class="detail"><span class="label">Date:</span> {{ $displayDate($wmr->wmr_date) }}</div></td>
                </tr>
                <tr>
                    <td><div class="detail"><span class="label">WMR No.</span> <span class="wmr-number">{{ $wmr->wmr_no }}</span></div></td>
                    <td><div class="detail"><span class="label">Date:</span> {{ $displayDate($wmr->job_order_date) }}</div></td>
                </tr>
                <tr>
                    <td><div class="detail"><span class="label">Job Order No.</span> <span class="wmr-number">{{ $wmr->job_order_no ?? '—' }}</span></div></td>
                    <td><div class="detail"><span class="label">Vehicle Type:</span> {{ $wmr->vehicle_type ?? '—' }} <span class="inline-date"><span class="label">Property No.:</span> {{ $wmr->property_no ?? '—' }}</span></div></td>
                </tr>
                <tr>
                    <td><div class="detail"><span class="label">Brand Name:</span> {{ $wmr->brand_name ?? '—' }}</div></td>
                    <td><div class="detail"><span class="label">Acquisition Date:</span> {{ $wmr->acquisition_date ?? '—' }}</div></td>
                </tr>
                <tr>
                    <td><div class="detail"><span class="label">Model:</span> {{ $wmr->model ?? $wmr->item_vehicle ?? '—' }}</div></td>
                    <td><div class="detail"><span class="label">Plate No.:</span> {{ $wmr->plate_no ?? '—' }}</div></td>
                </tr>
                <tr>
                    <td><div class="detail"><span class="label">Serial/Engine No.:</span> {{ $wmr->serial_engine_no ?? '—' }}</div></td>
                    <td><div class="detail"><span class="label">Inspection Date:</span> {{ $displayDate($wmr->inspection_date) }}</div></td>
                </tr>
                <tr>
                    <td><div class="detail"><span class="label">Inspector Name:</span> {{ $wmr->inspector_name ?? '—' }}</div></td>
                    <td><div class="detail"><span class="label">Amount:</span> {{ $wmr->labor_cost !== null ? '₱'.number_format((float) $wmr->labor_cost, 2) : '—' }}</div></td>
                </tr>
                <tr>
                    <td>
                        <div class="detail"><span class="label">Invoice No.:</span> {{ $wmr->invoice_no ?? '—' }} <span class="inline-date"><span class="label">Date:</span> {{ $wmr->invoice_date ?? '—' }}</span></div>
                    </td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <table class="items">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Description</th>
                    <th>Item Control No.</th>
                </tr>
            </thead>
            <tbody>
                @forelse($items as $item)
                    <tr>
                        <td class="center">{{ $item->item_number }}</td>
                        <td class="center">{{ $item->quantity }}</td>
                        <td class="center">{{ $item->unit }}</td>
                        <td>{{ $item->description }}</td>
                        <td class="center control-number">{{ $item->item_control_no }}</td>
                    </tr>
                @empty
                    <tr><td colspan="5" class="center">No defects or complaints recorded.</td></tr>
                @endforelse
            </tbody>
        </table>

        <table class="signatures">
            <tbody>
                <tr>
                    <td class="prepared">
                        <p class="signature-label">Prepared By</p>
                        <p class="signature-name">{{ $printedBy }}</p>
                        <p class="signature-role">Staff, Supply Management Unit</p>
                    </td>
                </tr>
                <tr>
                    <td class="noted">
                        <p class="signature-label">Noted By</p>
                        <p class="signature-name">ATTY. ROMMIL P. NUÑEZ</p>
                        <p class="signature-role">Head, Supply Management Unit</p>
                    </td>
                </tr>
            </tbody>
        </table>
    </main>

    @unless($forPdf)
        <script>
            window.addEventListener('load', function () {
                if (window.self === window.top) {
                    setTimeout(function () { window.print(); }, 300);
                }
            });
        </script>
    @endunless
</body>
</html>