<x-mail::message>
# Delivery Overdue Notice

Dear {{ $delivery->supplier->contact_person ?? 'Supplier Contact' }},

This is a formal notification that the delivery for the following Reference/PO Number is now overdue: **{{ $delivery->po_number ?? 'N/A' }}**.

Below are the delivery details:
- **Supplier:** {{ $delivery->supplier->supplier_name ?? 'N/A' }}
- **Original Expected Delivery Date:** {{ $delivery->due_date ? \Carbon\Carbon::parse($delivery->due_date)->format('F j, Y') : 'N/A' }}
@if($delivery->due_date)
- **Days Overdue:** {{ (int) \Carbon\Carbon::parse($delivery->due_date)->startOfDay()->diffInDays(now()->startOfDay()) }} day(s)
@endif

We kindly request that you provide us with an updated delivery date or status immediately to prevent any operational delays.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
