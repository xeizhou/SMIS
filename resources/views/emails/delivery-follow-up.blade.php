<x-mail::message>
# Delivery Follow-Up

Dear {{ $delivery->supplier->contact_person ?? 'Supplier Contact' }},

This is a formal follow-up regarding the delivery for the following Reference/PO Number: **{{ $delivery->po_number ?? 'N/A' }}**.

Below are the delivery details:
- **Supplier:** {{ $delivery->supplier->supplier_name ?? 'N/A' }}
- **Expected Delivery Date:** {{ $delivery->due_date ? \Carbon\Carbon::parse($delivery->due_date)->format('F j, Y') : 'N/A' }}
- **Status:** {{ $delivery->status ?? 'Pending' }}

@if($customMessage)
**Message from {{ config('app.name') }}:**
{{ $customMessage }}

@endif
Please provide us with an updated status regarding this delivery at your earliest convenience.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
